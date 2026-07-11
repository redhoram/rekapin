"use server";

import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { bankAccounts, categories, transactions } from "@/lib/db/schema";
import { requireRole } from "@/lib/session";
import {
  computeDedupHash,
  normalizeDescriptionForHash,
} from "@/lib/parsing/dedup";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Cap on a single bulk-categorize call (spec §server actions). */
const BULK_CAP = 500;

/** True for a non-archived category in this business — archived categories are
 * hidden from new assignments (schema contract), never a valid target here. */
async function categoryInBusiness(
  businessId: string,
  categoryId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.id, categoryId),
        eq(categories.businessId, businessId),
        isNull(categories.archivedAt),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

async function accountInBusiness(
  businessId: string,
  bankAccountId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: bankAccounts.id })
    .from(bankAccounts)
    .where(
      and(eq(bankAccounts.id, bankAccountId), eq(bankAccounts.businessId, businessId)),
    )
    .limit(1);
  return rows.length > 0;
}

/**
 * Set a single transaction's category (inline edit / import-row category-only
 * edit). ANY transaction in the business — no ownership check (matches PRD §5.9).
 * Flips review_status → "reviewed" and marks the row human-edited, which makes
 * its parent import batch non-undoable (exercises step-②'s undo guard).
 * admin + staff.
 */
export async function updateTransactionCategory(
  id: string,
  categoryId: string,
): Promise<ActionResult> {
  const { businessId, userId } = await requireRole(["admin", "staff"]);

  if (!categoryId) return { ok: false, error: "Pilih kategori." };
  if (!(await categoryInBusiness(businessId, categoryId))) {
    return { ok: false, error: "Kategori tidak ditemukan." };
  }

  const updated = await db
    .update(transactions)
    .set({
      categoryId,
      reviewStatus: "reviewed",
      editedManually: true,
      updatedBy: userId,
      updatedAt: new Date(),
    })
    .where(and(eq(transactions.id, id), eq(transactions.businessId, businessId)))
    .returning({ id: transactions.id });

  if (updated.length === 0) {
    return { ok: false, error: "Transaksi tidak ditemukan." };
  }
  return { ok: true };
}

/**
 * Bulk-set the category of many transactions. ids are re-scoped server-side to
 * the business (a forged id from another tenant simply won't match). Same field
 * writes as the single edit, applied to every touched row. No rule-proposal
 * dialog (bulk spans too many distinct descriptions). admin + staff.
 */
export async function bulkUpdateTransactionCategory(
  ids: string[],
  categoryId: string,
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const { businessId, userId } = await requireRole(["admin", "staff"]);

  if (!Array.isArray(ids) || ids.length === 0) {
    return { ok: false, error: "Tidak ada transaksi yang dipilih." };
  }
  if (ids.length > BULK_CAP) {
    return { ok: false, error: `Maksimal ${BULK_CAP} transaksi per aksi.` };
  }
  if (!categoryId) return { ok: false, error: "Pilih kategori." };
  if (!(await categoryInBusiness(businessId, categoryId))) {
    return { ok: false, error: "Kategori tidak ditemukan." };
  }

  const updated = await db
    .update(transactions)
    .set({
      categoryId,
      reviewStatus: "reviewed",
      editedManually: true,
      updatedBy: userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(transactions.businessId, businessId),
        inArray(transactions.id, ids),
      ),
    )
    .returning({ id: transactions.id });

  return { ok: true, count: updated.length };
}

/** True for a real calendar date, e.g. rejects "2026-02-31" (regex alone can't). */
function isRealCalendarDate(iso: string): boolean {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

const manualSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pilih tanggal.")
    .refine(isRealCalendarDate, "Tanggal tidak valid."),
  description: z
    .string()
    .trim()
    .min(1, "Deskripsi tidak boleh kosong.")
    .max(500, "Deskripsi terlalu panjang."),
  amount: z
    .number({ invalid_type_error: "Jumlah harus lebih dari 0." })
    .int("Jumlah harus lebih dari 0.")
    .positive("Jumlah harus lebih dari 0."),
  direction: z.enum(["in", "out"], {
    errorMap: () => ({ message: "Pilih arah." }),
  }),
  bankAccountId: z.string().min(1, "Pilih rekening."),
  categoryId: z.string().nullable().optional(),
});

const DEDUP_CONFLICT_MESSAGE =
  "Transaksi ini persis sama dengan yang sudah tercatat. Cek lagi tanggal, jumlah, dan rekeningnya.";

/**
 * Add a manual transaction (source = "manual"). Computes dedupHash with the SAME
 * algorithm as imports — an exact duplicate of any existing row (imported or
 * manual) is rejected by the unique constraint, not silently double-counted.
 * review_status = "reviewed" if a category was chosen, else "needs_review".
 * admin + staff.
 */
export async function createManualTransaction(input: {
  date: string;
  description: string;
  amount: number;
  direction: string;
  bankAccountId: string;
  categoryId?: string | null;
}): Promise<ActionResult> {
  const { businessId, userId } = await requireRole(["admin", "staff"]);

  const parsed = manualSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }
  const data = parsed.data;
  const categoryId = data.categoryId ?? null;
  const [accountOk, categoryOk] = await Promise.all([
    accountInBusiness(businessId, data.bankAccountId),
    categoryId ? categoryInBusiness(businessId, categoryId) : true,
  ]);
  if (!accountOk) {
    return { ok: false, error: "Rekening tidak ditemukan." };
  }
  if (categoryId && !categoryOk) {
    return { ok: false, error: "Kategori tidak ditemukan." };
  }

  const dedupHash = computeDedupHash({
    businessId,
    bankAccountId: data.bankAccountId,
    date: data.date,
    amount: data.amount,
    direction: data.direction,
    normalizedDescription: normalizeDescriptionForHash(data.description),
  });

  const inserted = await db
    .insert(transactions)
    .values({
      businessId,
      bankAccountId: data.bankAccountId,
      uploadId: null,
      date: new Date(`${data.date}T00:00:00.000Z`),
      description: data.description,
      amount: data.amount,
      direction: data.direction,
      categoryId,
      dedupHash,
      source: "manual",
      reviewStatus: categoryId ? "reviewed" : "needs_review",
      editedManually: false,
      createdBy: userId,
    })
    .onConflictDoNothing({
      target: [transactions.businessId, transactions.dedupHash],
    })
    .returning({ id: transactions.id });

  if (inserted.length === 0) {
    return { ok: false, error: DEDUP_CONFLICT_MESSAGE };
  }
  return { ok: true };
}

/**
 * Full-field edit of a MANUAL transaction. Rejects source === "import" (bank
 * statement is the source of truth — DECISION #1). Recomputes dedupHash when any
 * hash-relevant field changed and surfaces a friendly conflict message if the
 * unique constraint would be hit. Sets edited_manually + updatedBy. admin + staff.
 */
export async function updateManualTransaction(
  id: string,
  input: {
    date: string;
    description: string;
    amount: number;
    direction: string;
    bankAccountId: string;
    categoryId?: string | null;
  },
): Promise<ActionResult> {
  const { businessId, userId } = await requireRole(["admin", "staff"]);

  const [existing] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.businessId, businessId)))
    .limit(1);
  if (!existing) return { ok: false, error: "Transaksi tidak ditemukan." };

  if (existing.source !== "manual") {
    return {
      ok: false,
      error:
        "Transaksi dari mutasi bank tidak bisa diubah. Hanya kategorinya yang bisa diganti.",
    };
  }

  const parsed = manualSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }
  const data = parsed.data;
  const categoryId = data.categoryId ?? null;
  // Only re-validate the category when it's actually changing — the edit form
  // round-trips the transaction's current categoryId even when the user only
  // touched another field, so re-checking an unchanged (possibly since-
  // archived) category would block edits unrelated to categorization.
  const categoryChanged = categoryId !== existing.categoryId;
  const [accountOk, categoryOk] = await Promise.all([
    accountInBusiness(businessId, data.bankAccountId),
    categoryId && categoryChanged ? categoryInBusiness(businessId, categoryId) : true,
  ]);
  if (!accountOk) {
    return { ok: false, error: "Rekening tidak ditemukan." };
  }
  if (categoryId && categoryChanged && !categoryOk) {
    return { ok: false, error: "Kategori tidak ditemukan." };
  }

  const dedupHash = computeDedupHash({
    businessId,
    bankAccountId: data.bankAccountId,
    date: data.date,
    amount: data.amount,
    direction: data.direction,
    normalizedDescription: normalizeDescriptionForHash(data.description),
  });

  // If the hash changed, ensure it doesn't collide with a DIFFERENT existing row.
  if (dedupHash !== existing.dedupHash) {
    const [clash] = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.businessId, businessId),
          eq(transactions.dedupHash, dedupHash),
          ne(transactions.id, id),
        ),
      )
      .limit(1);
    if (clash) return { ok: false, error: DEDUP_CONFLICT_MESSAGE };
  }

  await db
    .update(transactions)
    .set({
      date: new Date(`${data.date}T00:00:00.000Z`),
      description: data.description,
      amount: data.amount,
      direction: data.direction,
      bankAccountId: data.bankAccountId,
      categoryId,
      dedupHash,
      reviewStatus: categoryId ? "reviewed" : "needs_review",
      editedManually: true,
      updatedBy: userId,
      updatedAt: new Date(),
    })
    .where(and(eq(transactions.id, id), eq(transactions.businessId, businessId)));

  return { ok: true };
}

/**
 * Delete a transaction. admin: any row in the business. staff: only rows they
 * created (createdBy === userId), enforced server-side (not just hidden in UI).
 */
export async function deleteTransaction(id: string): Promise<ActionResult> {
  const { businessId, userId, role } = await requireRole(["admin", "staff"]);

  const [existing] = await db
    .select({ createdBy: transactions.createdBy })
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.businessId, businessId)))
    .limit(1);
  if (!existing) return { ok: false, error: "Transaksi tidak ditemukan." };

  if (role !== "admin" && existing.createdBy !== userId) {
    return {
      ok: false,
      error: "Kamu hanya bisa menghapus transaksi yang kamu buat sendiri.",
    };
  }

  await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.businessId, businessId)));

  return { ok: true };
}
