import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, categoryRules } from "@/lib/db/schema";
import type { RuleForMatching } from "./match";

/**
 * Fetch the business's active, non-archived-category rule set, pre-sorted for
 * matching: priority ASC, then created_at ASC (oldest wins on an exact tie).
 *
 * Joins categories to exclude rules whose target category has been archived —
 * such rules are SKIPPED at match time (treated as no-match), never deleted, so
 * an admin can unarchive the category or edit/delete the rule from Settings
 * (spec §edge-case "Rule matching an archived category").
 *
 * Rules tables are small — fetch this ONCE per import, never per-row.
 */
export async function fetchActiveRulesForMatching(
  businessId: string,
): Promise<RuleForMatching[]> {
  const rows = await db
    .select({
      id: categoryRules.id,
      pattern: categoryRules.pattern,
      matchType: categoryRules.matchType,
      categoryId: categoryRules.categoryId,
    })
    .from(categoryRules)
    .innerJoin(categories, eq(categoryRules.categoryId, categories.id))
    .where(
      and(
        eq(categoryRules.businessId, businessId),
        eq(categoryRules.status, "active"),
        isNull(categories.archivedAt),
      ),
    )
    .orderBy(asc(categoryRules.priority), asc(categoryRules.createdAt));

  return rows;
}
