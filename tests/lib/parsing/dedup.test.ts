import { describe, expect, it } from "vitest";
import {
  attachHashes,
  computeDedupHash,
  normalizeDescriptionForHash,
  partitionDedup,
} from "@/lib/parsing/dedup";
import type { NormalizedRow } from "@/lib/parsing/types";

describe("normalizeDescriptionForHash", () => {
  it("trims, lowercases, collapses whitespace, strips punctuation", () => {
    expect(normalizeDescriptionForHash("  TRSF  E-Banking, CR!! ")).toBe(
      "trsf ebanking cr",
    );
  });

  it("keeps unicode letters and digits", () => {
    expect(normalizeDescriptionForHash("Café 123")).toBe("café 123");
  });
});

describe("computeDedupHash", () => {
  const base = {
    businessId: "biz-1",
    bankAccountId: "acc-1",
    date: "2026-07-01",
    amount: 700000,
    direction: "in" as const,
    normalizedDescription: "penjualan tunai",
  };

  it("is deterministic and 64-hex chars", () => {
    const h = computeDedupHash(base);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(computeDedupHash(base)).toBe(h);
  });

  it("isolates tenants — different business/account changes the hash", () => {
    const h = computeDedupHash(base);
    expect(computeDedupHash({ ...base, businessId: "biz-2" })).not.toBe(h);
    expect(computeDedupHash({ ...base, bankAccountId: "acc-2" })).not.toBe(h);
    expect(computeDedupHash({ ...base, amount: 700001 })).not.toBe(h);
    expect(computeDedupHash({ ...base, direction: "out" })).not.toBe(h);
  });
});

function row(n: number, desc: string, amount: number): NormalizedRow {
  return {
    rowNumber: n,
    date: "2026-07-01",
    description: desc,
    amount,
    direction: "in",
    normalizedDescription: normalizeDescriptionForHash(desc),
  };
}

describe("partitionDedup", () => {
  it("flags in-file duplicates (keeps first occurrence)", () => {
    const rows = attachHashes(
      [row(1, "A", 100), row(2, "B", 200), row(3, "A", 100)],
      "biz-1",
      "acc-1",
    );
    const { insertable, duplicates } = partitionDedup(rows, new Set());
    expect(insertable.map((r) => r.rowNumber)).toEqual([1, 2]);
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].row.rowNumber).toBe(3);
    expect(duplicates[0].againstDb).toBe(false);
  });

  it("flags rows already present in the DB", () => {
    const rows = attachHashes([row(1, "A", 100), row(2, "B", 200)], "biz-1", "acc-1");
    const existing = new Set([rows[0].dedupHash]);
    const { insertable, duplicates } = partitionDedup(rows, existing);
    expect(insertable.map((r) => r.rowNumber)).toEqual([2]);
    expect(duplicates[0].againstDb).toBe(true);
  });
});
