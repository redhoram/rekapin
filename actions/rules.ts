"use server";

import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { categories, categoryRules, user } from "@/lib/db/schema";
import { requireRole } from "@/lib/session";
import type { CategoryType } from "@/lib/categories/meta";

export type ActionResult = { ok: true } | { ok: false; error: string };

export interface RuleDTO {
  id: string;
  pattern: string;
  matchType: "contains" | "prefix";
  priority: number;
  categoryId: string;
  categoryName: string;
  categoryType: CategoryType;
  categoryArchived: boolean;
}

export interface ProposalDTO {
  id: string;
  pattern: string;
  matchType: "contains" | "prefix";
  categoryId: string;
  categoryName: string;
  categoryType: CategoryType;
  categoryArchived: boolean;
  proposedByName: string | null;
}

export interface ListRulesResult {
  active: RuleDTO[];
  pending: ProposalDTO[];
}

const patternSchema = z
  .string()
  .trim()
  .min(1, "Pola tidak boleh kosong.")
  .max(200, "Pola terlalu panjang.");

const matchTypeSchema = z.enum(["contains", "prefix"], {
  errorMap: () => ({ message: "Pilih cara pencocokan." }),
});

const prioritySchema = z
  .number({ invalid_type_error: "Prioritas harus angka." })
  .int("Prioritas harus angka.")
  .min(0, "Prioritas tidak boleh negatif.")
  .max(1_000_000, "Prioritas terlalu besar.");

/** Confirm a category id belongs to this business and isn't archived (never
 * trust the client; archived categories are hidden from new assignments). */
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

/** Server-assigned default priority = (current max for this business) + 10. */
async function nextPriority(businessId: string): Promise<number> {
  const [row] = await db
    .select({ max: sql<number | null>`max(${categoryRules.priority})` })
    .from(categoryRules)
    .where(eq(categoryRules.businessId, businessId));
  return (row?.max ?? 0) + 10;
}

/** Active rules (priority ASC) + pending proposals. admin only. */
export async function listRules(): Promise<ListRulesResult> {
  const { businessId } = await requireRole(["admin"]);

  const activeRows = await db
    .select({
      id: categoryRules.id,
      pattern: categoryRules.pattern,
      matchType: categoryRules.matchType,
      priority: categoryRules.priority,
      categoryId: categoryRules.categoryId,
      categoryName: categories.name,
      categoryType: categories.type,
      categoryArchived: categories.archivedAt,
    })
    .from(categoryRules)
    .innerJoin(categories, eq(categoryRules.categoryId, categories.id))
    .where(
      and(
        eq(categoryRules.businessId, businessId),
        eq(categoryRules.status, "active"),
      ),
    )
    .orderBy(asc(categoryRules.priority), asc(categoryRules.createdAt));

  const pendingRows = await db
    .select({
      id: categoryRules.id,
      pattern: categoryRules.pattern,
      matchType: categoryRules.matchType,
      categoryId: categoryRules.categoryId,
      categoryName: categories.name,
      categoryType: categories.type,
      categoryArchived: categories.archivedAt,
      proposedByName: user.name,
    })
    .from(categoryRules)
    .innerJoin(categories, eq(categoryRules.categoryId, categories.id))
    .leftJoin(user, eq(categoryRules.proposedBy, user.id))
    .where(
      and(
        eq(categoryRules.businessId, businessId),
        eq(categoryRules.status, "pending"),
      ),
    )
    .orderBy(asc(categoryRules.createdAt));

  return {
    active: activeRows.map((r) => ({
      id: r.id,
      pattern: r.pattern,
      matchType: r.matchType,
      priority: r.priority,
      categoryId: r.categoryId,
      categoryName: r.categoryName,
      categoryType: r.categoryType,
      categoryArchived: r.categoryArchived !== null,
    })),
    pending: pendingRows.map((r) => ({
      id: r.id,
      pattern: r.pattern,
      matchType: r.matchType,
      categoryId: r.categoryId,
      categoryName: r.categoryName,
      categoryType: r.categoryType,
      categoryArchived: r.categoryArchived !== null,
      proposedByName: r.proposedByName,
    })),
  };
}

/** Create an active rule from Settings → Kelola Rules. admin only. */
export async function createRule(input: {
  pattern: string;
  matchType: string;
  categoryId: string;
  priority?: number;
}): Promise<ActionResult> {
  const { businessId } = await requireRole(["admin"]);

  const pattern = patternSchema.safeParse(input.pattern);
  if (!pattern.success)
    return { ok: false, error: pattern.error.errors[0].message };
  const matchType = matchTypeSchema.safeParse(input.matchType);
  if (!matchType.success)
    return { ok: false, error: matchType.error.errors[0].message };
  if (!input.categoryId) return { ok: false, error: "Pilih kategori." };
  if (!(await categoryInBusiness(businessId, input.categoryId))) {
    return { ok: false, error: "Kategori tidak ditemukan." };
  }

  let priority: number;
  if (input.priority !== undefined) {
    const p = prioritySchema.safeParse(input.priority);
    if (!p.success) return { ok: false, error: p.error.errors[0].message };
    priority = p.data;
  } else {
    priority = await nextPriority(businessId);
  }

  await db.insert(categoryRules).values({
    businessId,
    pattern: pattern.data,
    matchType: matchType.data,
    categoryId: input.categoryId,
    priority,
    status: "active",
  });
  return { ok: true };
}

/**
 * Create a rule FROM a single-transaction correction. admin + staff.
 * - admin → status "active" (live immediately).
 * - staff → status "pending", proposedBy set (admin must approve).
 * Priority is server-assigned (max + 10) regardless of role.
 */
export async function createRuleFromCorrection(input: {
  pattern: string;
  matchType: string;
  categoryId: string;
}): Promise<ActionResult> {
  const { businessId, userId, role } = await requireRole(["admin", "staff"]);

  const pattern = patternSchema.safeParse(input.pattern);
  if (!pattern.success)
    return { ok: false, error: pattern.error.errors[0].message };
  const matchType = matchTypeSchema.safeParse(input.matchType);
  if (!matchType.success)
    return { ok: false, error: matchType.error.errors[0].message };
  if (!input.categoryId) return { ok: false, error: "Pilih kategori." };
  if (!(await categoryInBusiness(businessId, input.categoryId))) {
    return { ok: false, error: "Kategori tidak ditemukan." };
  }

  const priority = await nextPriority(businessId);

  await db.insert(categoryRules).values({
    businessId,
    pattern: pattern.data,
    matchType: matchType.data,
    categoryId: input.categoryId,
    priority,
    status: role === "admin" ? "active" : "pending",
    proposedBy: role === "admin" ? null : userId,
  });
  return { ok: true };
}

/** Edit an active rule. admin only. Not for pending proposals. */
export async function updateRule(
  id: string,
  input: {
    pattern?: string;
    matchType?: string;
    categoryId?: string;
    priority?: number;
  },
): Promise<ActionResult> {
  const { businessId } = await requireRole(["admin"]);

  const patch: {
    pattern?: string;
    matchType?: "contains" | "prefix";
    categoryId?: string;
    priority?: number;
  } = {};

  if (input.pattern !== undefined) {
    const pattern = patternSchema.safeParse(input.pattern);
    if (!pattern.success)
      return { ok: false, error: pattern.error.errors[0].message };
    patch.pattern = pattern.data;
  }
  if (input.matchType !== undefined) {
    const matchType = matchTypeSchema.safeParse(input.matchType);
    if (!matchType.success)
      return { ok: false, error: matchType.error.errors[0].message };
    patch.matchType = matchType.data;
  }
  if (input.categoryId !== undefined) {
    // Only re-validate when the category is actually changing — the edit
    // dialog round-trips the rule's current categoryId even when just the
    // pattern/priority changed, so re-checking an unchanged (possibly since-
    // archived) category would block unrelated edits.
    const [current] = await db
      .select({ categoryId: categoryRules.categoryId })
      .from(categoryRules)
      .where(and(eq(categoryRules.id, id), eq(categoryRules.businessId, businessId)))
      .limit(1);
    if (!current) return { ok: false, error: "Rule tidak ditemukan." };

    if (input.categoryId !== current.categoryId) {
      if (!(await categoryInBusiness(businessId, input.categoryId))) {
        return { ok: false, error: "Kategori tidak ditemukan." };
      }
    }
    patch.categoryId = input.categoryId;
  }
  if (input.priority !== undefined) {
    const p = prioritySchema.safeParse(input.priority);
    if (!p.success) return { ok: false, error: p.error.errors[0].message };
    patch.priority = p.data;
  }
  if (Object.keys(patch).length === 0) return { ok: true };

  const updated = await db
    .update(categoryRules)
    .set(patch)
    .where(
      and(
        eq(categoryRules.id, id),
        eq(categoryRules.businessId, businessId),
        eq(categoryRules.status, "active"),
      ),
    )
    .returning({ id: categoryRules.id });

  if (updated.length === 0) {
    return { ok: false, error: "Aturan tidak ditemukan." };
  }
  return { ok: true };
}

/** Delete a rule (active or pending). admin only. */
export async function deleteRule(id: string): Promise<ActionResult> {
  const { businessId } = await requireRole(["admin"]);
  const deleted = await db
    .delete(categoryRules)
    .where(and(eq(categoryRules.id, id), eq(categoryRules.businessId, businessId)))
    .returning({ id: categoryRules.id });
  if (deleted.length === 0) {
    return { ok: false, error: "Aturan tidak ditemukan." };
  }
  return { ok: true };
}

/** Approve a pending proposal → active. admin only. */
export async function approveRuleProposal(id: string): Promise<ActionResult> {
  const { businessId, userId } = await requireRole(["admin"]);
  const updated = await db
    .update(categoryRules)
    .set({ status: "active", reviewedBy: userId, reviewedAt: new Date() })
    .where(
      and(
        eq(categoryRules.id, id),
        eq(categoryRules.businessId, businessId),
        eq(categoryRules.status, "pending"),
      ),
    )
    .returning({ id: categoryRules.id });
  if (updated.length === 0) {
    return { ok: false, error: "Usulan tidak ditemukan." };
  }
  return { ok: true };
}

/** Reject a pending proposal → hard delete (no rejection history in MVP). admin only. */
export async function rejectRuleProposal(id: string): Promise<ActionResult> {
  const { businessId } = await requireRole(["admin"]);
  const deleted = await db
    .delete(categoryRules)
    .where(
      and(
        eq(categoryRules.id, id),
        eq(categoryRules.businessId, businessId),
        eq(categoryRules.status, "pending"),
      ),
    )
    .returning({ id: categoryRules.id });
  if (deleted.length === 0) {
    return { ok: false, error: "Usulan tidak ditemukan." };
  }
  return { ok: true };
}
