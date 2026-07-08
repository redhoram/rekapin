import { describe, expect, it } from "vitest";
import { matchRule, type RuleForMatching } from "@/lib/rules/match";

function rule(
  id: string,
  pattern: string,
  matchType: "contains" | "prefix",
  categoryId: string,
): RuleForMatching {
  return { id, pattern, matchType, categoryId };
}

describe("matchRule", () => {
  it("matches a `contains` pattern anywhere in the description, any case", () => {
    const rules = [rule("r1", "GOJEK", "contains", "cat-transport")];
    expect(matchRule("Pembayaran ke gojek 123", rules)).toEqual({
      ruleId: "r1",
      categoryId: "cat-transport",
    });
    expect(matchRule("GOJEK*RIDE", rules)).toEqual({
      ruleId: "r1",
      categoryId: "cat-transport",
    });
  });

  it("matches a `prefix` pattern only at the start", () => {
    const rules = [rule("r1", "TRSF", "prefix", "cat-transfer")];
    expect(matchRule("TRSF E-Banking CR", rules)).toEqual({
      ruleId: "r1",
      categoryId: "cat-transfer",
    });
    expect(matchRule("Bayar TRSF listrik", rules)).toBeNull();
  });

  it("returns null when nothing matches", () => {
    const rules = [rule("r1", "GOJEK", "contains", "cat-transport")];
    expect(matchRule("Setoran tunai", rules)).toBeNull();
  });

  it("returns the FIRST hit — caller pre-sorts by priority then created_at", () => {
    // Simulates the SQL ORDER BY: lower priority first, oldest wins on a tie.
    // Both rules would match "gopay gojek"; the first in the array wins.
    const rules = [
      rule("r-high-prio", "GOPAY", "contains", "cat-A"),
      rule("r-low-prio", "GOJEK", "contains", "cat-B"),
    ];
    expect(matchRule("GOPAY GOJEK top-up", rules)?.categoryId).toBe("cat-A");
    // Reversed order (tie-break gave the other rule precedence) → other wins.
    expect(
      matchRule("GOPAY GOJEK top-up", [rules[1], rules[0]])?.categoryId,
    ).toBe("cat-B");
  });

  it("preserves punctuation so dotted/starred patterns still match", () => {
    const rules = [rule("r1", "PT. GOJEK", "contains", "cat-transport")];
    expect(matchRule("Transfer ke PT. Gojek Indonesia", rules)).toEqual({
      ruleId: "r1",
      categoryId: "cat-transport",
    });
  });

  it("is whitespace-tolerant on both sides", () => {
    const rules = [rule("r1", "  bank   admin ", "contains", "cat-fee")];
    expect(matchRule("Biaya BANK   ADMIN bulanan", rules)?.categoryId).toBe(
      "cat-fee",
    );
  });

  it("skips empty patterns defensively (never matches)", () => {
    const rules = [
      rule("r-empty", "   ", "contains", "cat-X"),
      rule("r-real", "listrik", "contains", "cat-Y"),
    ];
    expect(matchRule("Bayar listrik PLN", rules)?.categoryId).toBe("cat-Y");
    expect(matchRule("apa saja", [rules[0]])).toBeNull();
  });

  it("returns null for an empty rule set", () => {
    expect(matchRule("anything", [])).toBeNull();
  });
});
