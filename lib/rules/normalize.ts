/**
 * Normalize text for RULE MATCHING. Deliberately NOT `normalizeDescriptionForHash`
 * (lib/parsing/dedup.ts) — that one strips ALL punctuation, which would break a
 * rule pattern like "PT. GOJEK" or "GOJEK*". This smaller normalizer only trims,
 * lowercases, and collapses internal whitespace, so punctuation in patterns and
 * descriptions is preserved and compared faithfully (spec §"Rules engine").
 */
export function normalizeForRuleMatch(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}
