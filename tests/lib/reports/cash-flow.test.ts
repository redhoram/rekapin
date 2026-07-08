import { describe, expect, it } from "vitest";
import { resolveAccountSection } from "@/lib/reports/cash-flow";
import type { AccountMeta, CashRow } from "@/lib/reports/types";

const JULY = { start: "2026-07-01", end: "2026-07-31" };

const ACCOUNT: AccountMeta = {
  accountId: "acc1",
  accountLabel: "BCA · Operasional · •••• 1234",
  openingBalance: 10_000_000,
  openingDate: "2026-01-01",
};

const row = (
  date: string,
  direction: "in" | "out",
  amount: number,
  categoryId: string | null = null,
  categoryName = "Belum terkategorisasi",
): CashRow => ({ date, direction, amount, categoryId, categoryName });

describe("resolveAccountSection", () => {
  it("normal case: opening rolls forward, closing = opening + in - out", () => {
    const rows = [
      // Pre-period activity (Jan-Jun): net +2_000_000.
      row("2026-03-10", "in", 5_000_000),
      row("2026-05-02", "out", 3_000_000),
      // In-period.
      row("2026-07-05", "in", 30_000_000, "c-sales", "Penjualan"),
      row("2026-07-20", "out", 15_000_000, "c-hpp", "Bahan baku"),
    ];
    const s = resolveAccountSection(ACCOUNT, JULY, rows);
    expect(s.included).toBe(true);
    expect(s.note).toBeNull();
    expect(s.openingBalance).toBe(12_000_000); // 10jt + 2jt pre-period net
    expect(s.totalIn).toBe(30_000_000);
    expect(s.totalOut).toBe(15_000_000);
    expect(s.closingBalance).toBe(27_000_000);
  });

  it("groups lines per category, split by direction, |total| desc", () => {
    const rows = [
      row("2026-07-01", "in", 1_000_000, "c-sales", "Penjualan"),
      row("2026-07-02", "in", 2_000_000, "c-sales", "Penjualan"),
      row("2026-07-03", "in", 500_000, null),
      row("2026-07-04", "out", 4_000_000, "c-hpp", "Bahan baku"),
      row("2026-07-05", "out", 100_000, "c-hpp", "Bahan baku"),
    ];
    const s = resolveAccountSection(ACCOUNT, JULY, rows);
    expect(s.cashInLines).toEqual([
      { categoryId: "c-sales", categoryName: "Penjualan", total: 3_000_000, percentOfRevenue: null },
      { categoryId: null, categoryName: "Belum terkategorisasi", total: 500_000, percentOfRevenue: null },
    ]);
    expect(s.cashOutLines).toEqual([
      { categoryId: "c-hpp", categoryName: "Bahan baku", total: 4_100_000, percentOfRevenue: null },
    ]);
  });

  it("opening_date inside the period: opening = raw openingBalance, only post-opening activity counts", () => {
    const midAccount: AccountMeta = { ...ACCOUNT, openingDate: "2026-07-10" };
    const rows = [
      // Before opening_date — must not count anywhere.
      row("2026-07-05", "in", 99_000_000, "c-sales", "Penjualan"),
      // From opening_date onward.
      row("2026-07-15", "in", 1_000_000, "c-sales", "Penjualan"),
    ];
    const s = resolveAccountSection(midAccount, JULY, rows);
    expect(s.included).toBe(true);
    expect(s.note).toBe("opened_mid_period");
    expect(s.openingBalance).toBe(10_000_000); // raw, never projected
    expect(s.totalIn).toBe(1_000_000);
    expect(s.closingBalance).toBe(11_000_000);
  });

  it("opening_date after the period end: section flagged not_yet_open, excluded", () => {
    const future: AccountMeta = { ...ACCOUNT, openingDate: "2026-08-01" };
    const s = resolveAccountSection(future, JULY, [
      row("2026-07-10", "in", 1_000_000),
    ]);
    expect(s.included).toBe(false);
    expect(s.note).toBe("not_yet_open");
    expect(s.totalIn).toBe(0);
    expect(s.cashInLines).toEqual([]);
  });

  it("excludes pre-opening_date rows from BOTH balance and lines, permanently", () => {
    const midAccount: AccountMeta = { ...ACCOUNT, openingDate: "2026-07-10" };
    const rows = [
      row("2026-06-01", "in", 50_000_000, "c-sales", "Penjualan"), // pre-opening
      row("2026-07-01", "out", 20_000_000, "c-hpp", "Bahan baku"), // pre-opening (inside period!)
      row("2026-07-12", "in", 3_000_000, "c-sales", "Penjualan"),
    ];
    const s = resolveAccountSection(midAccount, JULY, rows);
    expect(s.openingBalance).toBe(10_000_000);
    expect(s.totalIn).toBe(3_000_000);
    expect(s.totalOut).toBe(0);
    expect(s.cashOutLines).toEqual([]);
    expect(s.closingBalance).toBe(13_000_000);
  });

  it("returns a valid zeroed section for an empty period", () => {
    const s = resolveAccountSection(ACCOUNT, JULY, []);
    expect(s.included).toBe(true);
    expect(s.openingBalance).toBe(10_000_000);
    expect(s.closingBalance).toBe(10_000_000);
    expect(s.cashInLines).toEqual([]);
    expect(s.cashOutLines).toEqual([]);
  });

  it("closing of period N equals opening of period N+1 (no boundary crossed)", () => {
    const rows = [
      row("2026-07-05", "in", 5_000_000, "c-sales", "Penjualan"),
      row("2026-08-02", "out", 1_000_000, "c-hpp", "Bahan baku"),
    ];
    const july = resolveAccountSection(ACCOUNT, JULY, rows);
    const august = resolveAccountSection(
      ACCOUNT,
      { start: "2026-08-01", end: "2026-08-31" },
      rows,
    );
    expect(august.openingBalance).toBe(july.closingBalance);
  });
});
