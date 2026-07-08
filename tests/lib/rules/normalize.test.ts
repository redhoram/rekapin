import { describe, expect, it } from "vitest";
import { normalizeForRuleMatch } from "@/lib/rules/normalize";

describe("normalizeForRuleMatch", () => {
  it("trims and lowercases", () => {
    expect(normalizeForRuleMatch("  GoJek  ")).toBe("gojek");
  });

  it("collapses internal whitespace to single spaces", () => {
    expect(normalizeForRuleMatch("PT   GOJEK   INDONESIA")).toBe(
      "pt gojek indonesia",
    );
  });

  it("PRESERVES punctuation (unlike the dedup normalizer)", () => {
    // This is the whole reason this normalizer exists — "PT. GOJEK" must keep
    // its dot so patterns like it match faithfully.
    expect(normalizeForRuleMatch("PT. GOJEK")).toBe("pt. gojek");
    expect(normalizeForRuleMatch("GOJEK*")).toBe("gojek*");
    expect(normalizeForRuleMatch("TRSF E-Banking, CR")).toBe(
      "trsf e-banking, cr",
    );
  });

  it("returns empty string for whitespace-only input", () => {
    expect(normalizeForRuleMatch("   ")).toBe("");
  });
});
