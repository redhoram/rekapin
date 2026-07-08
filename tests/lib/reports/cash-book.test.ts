import { describe, expect, it } from "vitest";
import { mergeRunningBalances } from "@/lib/reports/cash-book";
import type { LedgerMergeRow } from "@/lib/reports/types";

const mk = (
  id: string,
  date: string,
  signedAmount: number,
  createdAt = "2026-07-01T00:00:00.000Z",
): LedgerMergeRow => ({ id, date, createdAt, signedAmount });

describe("mergeRunningBalances", () => {
  it("accumulates from the opening balance", () => {
    const merged = mergeRunningBalances(
      [
        mk("a", "2026-07-01", 5_000),
        mk("b", "2026-07-02", -2_000),
        mk("c", "2026-07-03", 1_000),
      ],
      10_000,
    );
    expect(merged.map((r) => r.runningBalance)).toEqual([15_000, 13_000, 14_000]);
  });

  it("each row's balance = previous balance + its signed amount (fixture walk)", () => {
    const amounts = [500, -300, 1_200, -50, -2_000, 700];
    const rows = amounts.map((amt, i) =>
      mk(`id${i}`, "2026-07-10", amt, `2026-07-10T00:00:0${i}.000Z`),
    );
    const merged = mergeRunningBalances(rows, 1_000);
    let expected = 1_000;
    for (const r of merged) {
      expected += r.signedAmount;
      expect(r.runningBalance).toBe(expected);
    }
  });

  it("pagination continuity: slicing never resets the balance", () => {
    const rows = Array.from({ length: 120 }, (_, i) =>
      mk(`id${String(i).padStart(3, "0")}`, "2026-07-15", 100, `2026-07-15T00:00:00.${String(i).padStart(3, "0")}Z`),
    );
    const merged = mergeRunningBalances(rows, 0);
    // Row 51 (index 50) continues from row 50 — page boundary at 50.
    expect(merged[49].runningBalance).toBe(5_000);
    expect(merged[50].runningBalance).toBe(5_100);
    const page2 = merged.slice(50, 100);
    expect(page2[0].runningBalance).toBe(5_100);
  });

  it("interleaves multiple accounts chronologically by (date, createdAt, id)", () => {
    const rows = [
      // Account A
      mk("a1", "2026-07-01", 1_000, "2026-07-01T08:00:00.000Z"),
      mk("a2", "2026-07-03", -500, "2026-07-03T08:00:00.000Z"),
      // Account B — same dates, different times.
      mk("b1", "2026-07-01", 2_000, "2026-07-01T09:00:00.000Z"),
      mk("b2", "2026-07-02", -250, "2026-07-02T07:00:00.000Z"),
    ];
    const merged = mergeRunningBalances(rows, 10_000);
    expect(merged.map((r) => r.id)).toEqual(["a1", "b1", "b2", "a2"]);
    expect(merged.map((r) => r.runningBalance)).toEqual([
      11_000, 13_000, 12_750, 12_250,
    ]);
  });

  it("breaks createdAt ties deterministically by id", () => {
    const t = "2026-07-01T12:00:00.000Z";
    const merged = mergeRunningBalances(
      [mk("z", "2026-07-01", 1, t), mk("a", "2026-07-01", 1, t)],
      0,
    );
    expect(merged.map((r) => r.id)).toEqual(["a", "z"]);
  });

  it("returns an empty array for an empty period", () => {
    expect(mergeRunningBalances([], 5_000)).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const rows = [mk("b", "2026-07-02", 1), mk("a", "2026-07-01", 1)];
    const copy = [...rows];
    mergeRunningBalances(rows, 0);
    expect(rows).toEqual(copy);
  });
});
