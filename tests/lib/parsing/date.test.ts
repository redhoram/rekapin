import { describe, expect, it } from "vitest";
import { parseDate } from "@/lib/parsing/fields";

describe("parseDate", () => {
  it("parses dd/MM/yyyy to ISO", () => {
    expect(parseDate("01/07/2026", "dd/MM/yyyy")).toEqual({
      ok: true,
      value: "2026-07-01",
    });
    expect(parseDate("31/12/2026", "dd/MM/yyyy")).toEqual({
      ok: true,
      value: "2026-12-31",
    });
    expect(parseDate("1/7/2026", "dd/MM/yyyy")).toEqual({
      ok: true,
      value: "2026-07-01",
    });
  });

  it("parses yyyy-MM-dd and MM/dd/yyyy", () => {
    expect(parseDate("2026-07-01", "yyyy-MM-dd")).toEqual({
      ok: true,
      value: "2026-07-01",
    });
    expect(parseDate("2026/07/01", "yyyy-MM-dd")).toEqual({
      ok: true,
      value: "2026-07-01",
    });
    expect(parseDate("07/31/2026", "MM/dd/yyyy")).toEqual({
      ok: true,
      value: "2026-07-31",
    });
  });

  it("rejects impossible calendar dates", () => {
    expect(parseDate("32/01/2026", "dd/MM/yyyy").ok).toBe(false);
    expect(parseDate("31/02/2026", "dd/MM/yyyy").ok).toBe(false);
    expect(parseDate("13/13/2026", "MM/dd/yyyy").ok).toBe(false);
  });

  it("reports a format mismatch vs an empty value distinctly", () => {
    const mismatch = parseDate("ABC", "dd/MM/yyyy");
    expect(mismatch.ok).toBe(false);
    if (!mismatch.ok) expect(mismatch.reason).toContain("format");

    const empty = parseDate("", "dd/MM/yyyy");
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.reason).toBe("Tanggal kosong");
  });
});
