"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  businesses,
  businessMembers,
  bankAccounts,
  categories,
} from "@/lib/db/schema";
import { getCurrentSession, getActiveMembership } from "@/lib/session";
import { BUSINESS_TYPE_VALUES, BANK_VALUES } from "@/lib/constants";
import { buildDefaultCategoryRows } from "@/lib/categories/seed";

export type ActionResult = { ok: true } | { ok: false; error: string };

// --- Validation schemas (server-side; messages match client copy) ---

const createBusinessSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama bisnis tidak boleh kosong.")
    .max(120, "Nama bisnis terlalu panjang."),
  businessType: z.enum(BUSINESS_TYPE_VALUES, {
    errorMap: () => ({ message: "Pilih jenis usaha." }),
  }),
});

const bankAccountSchema = z.object({
  bankCode: z.enum(BANK_VALUES, {
    errorMap: () => ({ message: "Pilih bank." }),
  }),
  label: z
    .string()
    .trim()
    .min(1, "Label tidak boleh kosong.")
    .max(60, "Label terlalu panjang."),
  accountMask: z
    .string()
    .regex(/^\d{4}$/, "Harus 4 digit angka."),
  // Rupiah integer — reject decimals/negatives/non-numeric.
  openingBalance: z
    .number({ invalid_type_error: "Saldo harus berupa angka bulat" })
    .int("Saldo harus berupa angka bulat")
    .nonnegative("Saldo tidak boleh negatif."),
  // Calendar date string (yyyy-mm-dd) from the date input.
  openingDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pilih tanggal."),
});

/**
 * Create the business + an admin membership for the current user, then move to
 * the bank-account step.
 *
 * Idempotency (spec edge case): if the user already has a membership, redirect
 * instead of inserting a second business — guards double-submit.
 */
export async function createBusiness(input: {
  name: string;
  businessType: string;
}): Promise<ActionResult> {
  const data = await getCurrentSession();
  if (!data?.user) {
    return { ok: false, error: "Sesi tidak valid. Masuk ulang." };
  }
  if (!data.user.emailVerified) {
    return { ok: false, error: "Email kamu belum diverifikasi." };
  }

  // Already onboarded (or mid-flow) — do not create a second business.
  const existing = await getActiveMembership();
  if (existing) {
    redirect("/onboarding/bank-account");
  }

  const parsed = createBusinessSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.errors[0]?.message ?? "Data tidak valid.",
    };
  }

  // neon-http has no interactive db.transaction(), so we generate the business
  // id in app code and submit all inserts as ONE atomic HTTP batch (all-or-
  // nothing) instead of sequential writes (spec "Commit strategy"). The 12
  // default categories are seeded here so a brand-new business has them the
  // instant onboarding step 1 commits (spec §seeding strategy #1).
  const businessId = crypto.randomUUID();
  await db.batch([
    db.insert(businesses).values({
      id: businessId,
      name: parsed.data.name,
      businessType: parsed.data.businessType,
    }),
    db.insert(businessMembers).values({
      businessId,
      userId: data.user.id,
      role: "admin", // creator becomes admin automatically
    }),
    db
      .insert(categories)
      .values(buildDefaultCategoryRows(businessId))
      .onConflictDoNothing({ target: [categories.businessId, categories.name] }),
  ]);

  redirect("/onboarding/bank-account");
}

/**
 * Add one bank account to the current user's business. Every write is scoped to
 * the businessId resolved from the verified membership (never client-supplied) —
 * FR-9.2 / NFR-1.
 */
export async function addBankAccount(input: {
  bankCode: string;
  label: string;
  accountMask: string;
  openingBalance: number;
  openingDate: string;
}): Promise<ActionResult> {
  const membership = await getActiveMembership();
  if (!membership || membership.role !== "admin") {
    return { ok: false, error: "Tidak diizinkan." };
  }

  const parsed = bankAccountSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.errors[0]?.message ?? "Data tidak valid.",
    };
  }

  await db.insert(bankAccounts).values({
    businessId: membership.businessId,
    bankCode: parsed.data.bankCode,
    label: parsed.data.label,
    accountMask: parsed.data.accountMask,
    openingBalance: parsed.data.openingBalance,
    openingDate: new Date(parsed.data.openingDate),
  });

  return { ok: true };
}

/**
 * Finalize onboarding: requires the business to have ≥1 bank account, then
 * redirects to the dashboard (creator is admin).
 */
export async function completeOnboarding(): Promise<ActionResult> {
  const membership = await getActiveMembership();
  if (!membership) {
    return { ok: false, error: "Belum ada bisnis." };
  }

  const accounts = await db
    .select({ id: bankAccounts.id })
    .from(bankAccounts)
    .where(eq(bankAccounts.businessId, membership.businessId))
    .limit(1);

  if (accounts.length === 0) {
    return { ok: false, error: "Tambahkan minimal satu rekening dulu." };
  }

  redirect("/dashboard");
}

/**
 * Count bank accounts for the current user's business — used by the onboarding
 * layout/page to derive onboarding state (spec: derived, not stored).
 */
export async function countBankAccounts(): Promise<number> {
  const membership = await getActiveMembership();
  if (!membership) return 0;

  const rows = await db
    .select({ id: bankAccounts.id })
    .from(bankAccounts)
    .where(eq(bankAccounts.businessId, membership.businessId));
  return rows.length;
}
