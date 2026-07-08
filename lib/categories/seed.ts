import { db } from "@/lib/db";
import { categories, type NewCategory } from "@/lib/db/schema";
import type { CategoryType } from "./meta";

/**
 * Default category set (spec §"Default category list"). 12 lean, UMKM-generic
 * rows. OPEX carries the most (8) — that's where UMKM cost variety lives; the
 * other four types stay lean by design. All seeded with is_default = true.
 *
 * Stored names are the canonical Indonesian strings; do not translate at write
 * time (the display layer never re-maps these).
 */
export const DEFAULT_CATEGORIES: { name: string; type: CategoryType }[] = [
  { name: "Penjualan", type: "PENDAPATAN" },
  { name: "Pembelian Bahan Baku/Stok", type: "HPP" },
  { name: "Gaji & Upah", type: "OPEX" },
  { name: "Sewa Tempat", type: "OPEX" },
  { name: "Listrik, Air & Internet", type: "OPEX" },
  { name: "Transportasi & Pengiriman", type: "OPEX" },
  { name: "Pemasaran & Iklan", type: "OPEX" },
  { name: "Perlengkapan & Peralatan", type: "OPEX" },
  { name: "Biaya Admin Bank", type: "OPEX" },
  { name: "Pajak & Retribusi", type: "OPEX" },
  { name: "Pendapatan & Beban Lain-lain", type: "NON_OPERASIONAL" },
  { name: "Transfer Antar Rekening", type: "TRANSFER" },
];

/**
 * Build the insert rows for the default category set of one business. Pure /
 * DB-free so it can be unit-tested (row count, names, types, is_default flag).
 */
export function buildDefaultCategoryRows(businessId: string): NewCategory[] {
  return DEFAULT_CATEGORIES.map((c) => ({
    businessId,
    name: c.name,
    type: c.type,
    isDefault: true,
  }));
}

/**
 * Ensure a business has its default categories. ONE idempotent path (no separate
 * backfill script): a single multi-row INSERT ... ON CONFLICT (business_id, name)
 * DO NOTHING. Race-safe on neon-http without db.transaction (spec §"Seeding
 * strategy") — re-running for a fully-seeded business inserts zero rows.
 *
 * Call sites: createBusiness (onboarding), the shared listCategories query
 * (lazy-backfill for pre-migration businesses), and the top of commitUpload.
 */
export async function ensureDefaultCategories(businessId: string): Promise<void> {
  await db
    .insert(categories)
    .values(buildDefaultCategoryRows(businessId))
    .onConflictDoNothing({
      target: [categories.businessId, categories.name],
    });
}
