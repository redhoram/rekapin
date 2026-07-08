import { describe, expect, it } from "vitest";
import {
  DEFAULT_CATEGORIES,
  buildDefaultCategoryRows,
} from "@/lib/categories/seed";
import { CATEGORY_TYPES } from "@/lib/categories/meta";

describe("DEFAULT_CATEGORIES", () => {
  it("has exactly 12 rows (spec §default category list)", () => {
    expect(DEFAULT_CATEGORIES).toHaveLength(12);
  });

  it("uses only valid category types", () => {
    for (const c of DEFAULT_CATEGORIES) {
      expect(CATEGORY_TYPES).toContain(c.type);
    }
  });

  it("has no duplicate names (unique index would otherwise reject them)", () => {
    const names = DEFAULT_CATEGORIES.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("keeps OPEX the largest bucket (8 rows per the 12-row table) by design", () => {
    // The spec table (authoritative for the seeded set) lists 8 OPEX rows; the
    // surrounding prose's "(6)" is a spec typo. The 12-row table is binding.
    const byType = DEFAULT_CATEGORIES.reduce<Record<string, number>>(
      (acc, c) => {
        acc[c.type] = (acc[c.type] ?? 0) + 1;
        return acc;
      },
      {},
    );
    expect(byType.OPEX).toBe(8);
    expect(byType.PENDAPATAN).toBe(1);
    expect(byType.HPP).toBe(1);
    expect(byType.NON_OPERASIONAL).toBe(1);
    expect(byType.TRANSFER).toBe(1);
  });
});

describe("buildDefaultCategoryRows", () => {
  it("scopes every row to the given business and flags is_default", () => {
    const rows = buildDefaultCategoryRows("biz-1");
    expect(rows).toHaveLength(12);
    for (const row of rows) {
      expect(row.businessId).toBe("biz-1");
      expect(row.isDefault).toBe(true);
    }
  });

  it("preserves the canonical stored names verbatim", () => {
    const rows = buildDefaultCategoryRows("biz-1");
    expect(rows.map((r) => r.name)).toEqual(
      DEFAULT_CATEGORIES.map((c) => c.name),
    );
  });
});
