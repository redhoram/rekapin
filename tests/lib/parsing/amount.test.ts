import { describe, expect, it } from "vitest";
import { parseAmount } from "@/lib/parsing/fields";

// Deterministic amount parser (spec DECISIONS #5) — never silently rounds.
describe("parseAmount", () => {
  it("parses plain integers and BCA-style decimals with zero cents", () => {
    expect(parseAmount("700000")).toEqual({ ok: true, value: 700000 });
    expect(parseAmount("700000.00")).toEqual({ ok: true, value: 700000 });
    expect(parseAmount("15000.00")).toEqual({ ok: true, value: 15000 });
  });

  it("handles ID-locale thousand separators", () => {
    expect(parseAmount("700.000,00")).toEqual({ ok: true, value: 700000 });
    expect(parseAmount("1.000.000")).toEqual({ ok: true, value: 1000000 });
    expect(parseAmount("1.250.000")).toEqual({ ok: true, value: 1250000 });
  });

  it("strips currency symbols and surrounding whitespace", () => {
    expect(parseAmount("Rp 250.000")).toEqual({ ok: true, value: 250000 });
    expect(parseAmount("  1.250.000  ")).toEqual({ ok: true, value: 1250000 });
  });

  it("takes the magnitude of a signed value (sign is resolved elsewhere)", () => {
    expect(parseAmount("-15000")).toEqual({ ok: true, value: 15000 });
    expect(parseAmount("(15.000)")).toEqual({ ok: true, value: 15000 });
  });

  it("parses zero (row-level check rejects <= 0, not the parser)", () => {
    expect(parseAmount("0")).toEqual({ ok: true, value: 0 });
    expect(parseAmount("0.00")).toEqual({ ok: true, value: 0 });
  });

  it("FAILS on non-zero cents rather than rounding", () => {
    const a = parseAmount("700000.50");
    expect(a.ok).toBe(false);
    if (!a.ok) expect(a.reason).toContain("sen");
    expect(parseAmount("700.000,50").ok).toBe(false);
    expect(parseAmount("1.234.56").ok).toBe(false);
  });

  it("FAILS on empty and non-numeric input", () => {
    expect(parseAmount("").ok).toBe(false);
    expect(parseAmount("   ").ok).toBe(false);
    const bad = parseAmount("abc");
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.reason).toContain("tidak valid");
  });
});
