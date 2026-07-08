import { normalizeForRuleMatch } from "./normalize";

/** The minimal rule shape the pure matcher needs. */
export interface RuleForMatching {
  id: string;
  pattern: string;
  matchType: "contains" | "prefix";
  categoryId: string;
}

/**
 * Return the first rule that matches `description`, or null.
 *
 * The caller MUST pre-sort `rules` (WHERE status='active' AND category not
 * archived, ORDER BY priority ASC, created_at ASC). This function does NO
 * sorting — it just returns the first hit — so the priority + tie-break rule
 * (lower priority first, oldest wins on a tie) lives entirely in the SQL
 * ORDER BY, keeping this trivially testable with hand-built arrays.
 *
 * Matching is case-insensitive (both sides normalized) and whitespace-tolerant.
 */
export function matchRule(
  description: string,
  rules: RuleForMatching[],
): { ruleId: string; categoryId: string } | null {
  const normDesc = normalizeForRuleMatch(description);
  for (const rule of rules) {
    const normPattern = normalizeForRuleMatch(rule.pattern);
    if (normPattern === "") continue; // defensive: empty pattern never matches
    const hit =
      rule.matchType === "contains"
        ? normDesc.includes(normPattern)
        : normDesc.startsWith(normPattern);
    if (hit) return { ruleId: rule.id, categoryId: rule.categoryId };
  }
  return null;
}
