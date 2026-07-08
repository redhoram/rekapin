import { and, eq, isNotNull, sql } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { listCategories } from "@/actions/categories";
import { listRules } from "@/actions/rules";
import { listMembersAndInvitations } from "@/actions/members";
import { SettingsClient } from "./_components/settings-client";

// Admin-only settings console (requireRole gates it; staff redirect server-side).
// Three panels: kelola kategori + kelola aturan (incl. pending proposals) + anggota.
export default async function SettingsPage() {
  const { businessId } = await requireRole(["admin"]);

  const [categories, rulesResult, members, usageRows] = await Promise.all([
    listCategories(),
    listRules(),
    listMembersAndInvitations(),
    db
      .select({
        categoryId: transactions.categoryId,
        count: sql<number>`count(*)::int`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.businessId, businessId),
          isNotNull(transactions.categoryId),
        ),
      )
      .groupBy(transactions.categoryId),
  ]);

  const categoryUsage: Record<string, number> = {};
  for (const row of usageRows) {
    if (row.categoryId) categoryUsage[row.categoryId] = row.count;
  }

  return (
    <SettingsClient
      categories={categories}
      categoryUsage={categoryUsage}
      rules={rulesResult.active}
      proposals={rulesResult.pending}
      members={members}
    />
  );
}
