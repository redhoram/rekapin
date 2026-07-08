"use server";

import { and, asc, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { requireRole } from "@/lib/session";
import { ensureDefaultCategories } from "@/lib/categories/seed";
import { CATEGORY_TYPES, type CategoryType } from "@/lib/categories/meta";
import type { CategoryDTO } from "@/lib/categories/types";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type { CategoryDTO };

const nameSchema = z
  .string()
  .trim()
  .min(1, "Nama tidak boleh kosong.")
  .max(60, "Nama kategori terlalu panjang.");

const typeSchema = z.enum(CATEGORY_TYPES, {
  errorMap: () => ({ message: "Pilih tipe." }),
});

/**
 * List every category for the active business (active + archived), ordered by
 * type (enum order == display order) then name. Seeds defaults first — this is
 * the lazy-backfill path that self-heals pre-migration businesses (spec §seeding
 * strategy #2). admin + staff.
 */
export async function listCategories(): Promise<CategoryDTO[]> {
  const { businessId } = await requireRole(["admin", "staff"]);
  await ensureDefaultCategories(businessId);

  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      type: categories.type,
      isDefault: categories.isDefault,
      archivedAt: categories.archivedAt,
    })
    .from(categories)
    .where(eq(categories.businessId, businessId))
    .orderBy(asc(categories.type), asc(categories.name));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    isDefault: r.isDefault,
    archivedAt: r.archivedAt ? r.archivedAt.toISOString() : null,
  }));
}

/** Create a category. admin only. Unique-name conflict → friendly message. */
export async function createCategory(input: {
  name: string;
  type: string;
}): Promise<ActionResult> {
  const { businessId } = await requireRole(["admin"]);

  const name = nameSchema.safeParse(input.name);
  if (!name.success) return { ok: false, error: name.error.errors[0].message };
  const type = typeSchema.safeParse(input.type);
  if (!type.success) return { ok: false, error: type.error.errors[0].message };

  const inserted = await db
    .insert(categories)
    .values({ businessId, name: name.data, type: type.data, isDefault: false })
    .onConflictDoNothing({ target: [categories.businessId, categories.name] })
    .returning({ id: categories.id });

  if (inserted.length === 0) {
    return { ok: false, error: "Sudah ada kategori dengan nama ini." };
  }
  return { ok: true };
}

/** Rename / retype a category. admin only. */
export async function updateCategory(
  id: string,
  input: { name?: string; type?: string },
): Promise<ActionResult> {
  const { businessId } = await requireRole(["admin"]);

  const patch: { name?: string; type?: CategoryType } = {};
  if (input.name !== undefined) {
    const name = nameSchema.safeParse(input.name);
    if (!name.success) return { ok: false, error: name.error.errors[0].message };
    patch.name = name.data;
  }
  if (input.type !== undefined) {
    const type = typeSchema.safeParse(input.type);
    if (!type.success) return { ok: false, error: type.error.errors[0].message };
    patch.type = type.data;
  }
  if (patch.name === undefined && patch.type === undefined) {
    return { ok: true };
  }

  // Reject a rename onto another category's name (unique index would throw).
  if (patch.name !== undefined) {
    const dupe = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.businessId, businessId),
          eq(categories.name, patch.name),
          ne(categories.id, id),
        ),
      )
      .limit(1);
    if (dupe.length > 0) {
      return { ok: false, error: "Sudah ada kategori dengan nama ini." };
    }
  }

  const updated = await db
    .update(categories)
    .set(patch)
    .where(and(eq(categories.id, id), eq(categories.businessId, businessId)))
    .returning({ id: categories.id });

  if (updated.length === 0) {
    return { ok: false, error: "Kategori tidak ditemukan." };
  }
  return { ok: true };
}

/** Soft-delete (archive) a category. admin only. No hard delete in MVP. */
export async function archiveCategory(id: string): Promise<ActionResult> {
  const { businessId } = await requireRole(["admin"]);
  const updated = await db
    .update(categories)
    .set({ archivedAt: new Date() })
    .where(and(eq(categories.id, id), eq(categories.businessId, businessId)))
    .returning({ id: categories.id });
  if (updated.length === 0) {
    return { ok: false, error: "Kategori tidak ditemukan." };
  }
  return { ok: true };
}

/** Restore an archived category. admin only. */
export async function unarchiveCategory(id: string): Promise<ActionResult> {
  const { businessId } = await requireRole(["admin"]);
  const updated = await db
    .update(categories)
    .set({ archivedAt: null })
    .where(and(eq(categories.id, id), eq(categories.businessId, businessId)))
    .returning({ id: categories.id });
  if (updated.length === 0) {
    return { ok: false, error: "Kategori tidak ditemukan." };
  }
  return { ok: true };
}
