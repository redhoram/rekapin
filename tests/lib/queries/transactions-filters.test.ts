import { describe, expect, it } from "vitest";
import { parseTransactionFilters } from "@/lib/queries/transactions";

describe("parseTransactionFilters", () => {
  it("returns safe defaults for an empty query", () => {
    const f = parseTransactionFilters({});
    expect(f).toEqual({
      page: 1,
      from: null,
      to: null,
      bankAccountId: null,
      categoryId: null,
      categoryType: null,
      reviewStatus: null,
      q: null,
      createdBy: null,
      sort: "date_desc",
    });
  });

  it("falls back to defaults for garbage values (never errors)", () => {
    const f = parseTransactionFilters({
      page: "-5",
      sort: "chaos",
      reviewStatus: "nope",
      categoryType: "BOGUS",
      from: "2026/07/01",
    });
    expect(f.page).toBe(1);
    expect(f.sort).toBe("date_desc");
    expect(f.reviewStatus).toBeNull();
    expect(f.categoryType).toBeNull();
    expect(f.from).toBeNull(); // wrong date format rejected
  });

  it("accepts valid values", () => {
    const f = parseTransactionFilters({
      page: "3",
      sort: "amount_asc",
      reviewStatus: "needs_review",
      categoryType: "OPEX",
      from: "2026-07-01",
      to: "2026-07-31",
      q: "  gojek  ",
      bankAccountId: "acc-1",
      categoryId: "cat-1",
      createdBy: "user-1",
    });
    expect(f).toEqual({
      page: 3,
      from: "2026-07-01",
      to: "2026-07-31",
      bankAccountId: "acc-1",
      categoryId: "cat-1",
      categoryType: "OPEX",
      reviewStatus: "needs_review",
      q: "gojek",
      createdBy: "user-1",
      sort: "amount_asc",
    });
  });

  it("takes the first value of a repeated param", () => {
    const f = parseTransactionFilters({ q: ["a", "b"] });
    expect(f.q).toBe("a");
  });
});
