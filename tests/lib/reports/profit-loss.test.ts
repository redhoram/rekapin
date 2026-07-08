import { describe, expect, it } from "vitest";
import { assembleProfitLoss } from "@/lib/reports/profit-loss";
import type {
  AssembleProfitLossInput,
  ProfitLossCategoryRow,
} from "@/lib/reports/types";

const PERIOD = {
  preset: "month" as const,
  start: "2026-07-01",
  end: "2026-07-31",
  label: "Juli 2026",
};
const PREV = {
  preset: "month" as const,
  start: "2026-06-01",
  end: "2026-06-30",
  label: "Juni 2026",
};

function makeInput(
  current: ProfitLossCategoryRow[],
  previous: ProfitLossCategoryRow[] = [],
  extra?: Partial<AssembleProfitLossInput>,
): AssembleProfitLossInput {
  return {
    period: PERIOD,
    previousPeriod: PREV,
    current,
    previous,
    uncategorized: { count: 0, netAmount: 0 },
    hasUnreviewed: false,
    needsReviewCount: 0,
    ...extra,
  };
}

// Hand-computed fixture (all integer Rupiah):
//   Pendapatan  +10_000_000  (Penjualan)
//   HPP          -4_000_000  (Bahan baku, netFlow negative = outflow)
//   OPEX         -3_000_000  (Gaji)
//   Non-Op       -1_000_000  (Bunga)
//   Laba Kotor = 6_000_000; Operasional = 3_000_000; Bersih = 2_000_000.
const FIXTURE: ProfitLossCategoryRow[] = [
  { categoryId: "c1", categoryName: "Penjualan", categoryType: "PENDAPATAN", netFlow: 10_000_000 },
  { categoryId: "c2", categoryName: "Bahan baku", categoryType: "HPP", netFlow: -4_000_000 },
  { categoryId: "c3", categoryName: "Gaji", categoryType: "OPEX", netFlow: -3_000_000 },
  { categoryId: "c4", categoryName: "Bunga", categoryType: "NON_OPERASIONAL", netFlow: -1_000_000 },
];

describe("assembleProfitLoss", () => {
  it("verifies the Laba Kotor / Operasional / Bersih formulas", () => {
    const report = assembleProfitLoss(makeInput(FIXTURE));
    expect(report.revenue.current).toBe(10_000_000);
    expect(report.grossProfit.current).toBe(6_000_000);
    expect(report.operatingProfit.current).toBe(3_000_000);
    expect(report.netProfit.current).toBe(2_000_000);
    // Invariant: Laba Bersih = SUM(netFlow) over all non-TRANSFER rows.
    const sumNet = FIXTURE.reduce((a, r) => a + r.netFlow, 0);
    expect(report.netProfit.current).toBe(sumNet);
  });

  it("applies the display sign convention (costs shown as positive magnitudes)", () => {
    const report = assembleProfitLoss(makeInput(FIXTURE));
    const hpp = report.sections.find((s) => s.type === "HPP")!;
    expect(hpp.subtotal.current).toBe(4_000_000); // -netFlow
    expect(hpp.lines[0].total).toBe(4_000_000);
    const pendapatan = report.sections.find((s) => s.type === "PENDAPATAN")!;
    expect(pendapatan.subtotal.current).toBe(10_000_000); // as-is
  });

  it("never includes TRANSFER rows in any section or total (defensive)", () => {
    const withTransfer = [
      ...FIXTURE,
      {
        categoryId: "t1",
        categoryName: "Pindah dana",
        categoryType: "TRANSFER" as const,
        netFlow: 99_000_000,
      },
    ];
    const report = assembleProfitLoss(makeInput(withTransfer));
    expect(report.netProfit.current).toBe(2_000_000); // unchanged
    for (const section of report.sections) {
      expect(section.lines.find((l) => l.categoryId === "t1")).toBeUndefined();
    }
  });

  it("computes percentOfRevenue against revenue, ordered by |total| desc", () => {
    const twoLines = [
      ...FIXTURE,
      { categoryId: "c5", categoryName: "Kemasan", categoryType: "HPP" as const, netFlow: -6_000_000 },
    ];
    const report = assembleProfitLoss(makeInput(twoLines));
    const hpp = report.sections.find((s) => s.type === "HPP")!;
    // Kemasan (6jt) sorts before Bahan baku (4jt).
    expect(hpp.lines.map((l) => l.categoryName)).toEqual(["Kemasan", "Bahan baku"]);
    expect(hpp.lines[0].percentOfRevenue).toBe(60);
    expect(hpp.lines[1].percentOfRevenue).toBe(40);
  });

  it("sets percentOfRevenue to null for every line when revenue <= 0", () => {
    const noRevenue: ProfitLossCategoryRow[] = [
      { categoryId: "c2", categoryName: "Bahan baku", categoryType: "HPP", netFlow: -4_000_000 },
      { categoryId: "c3", categoryName: "Gaji", categoryType: "OPEX", netFlow: -3_000_000 },
    ];
    const report = assembleProfitLoss(makeInput(noRevenue));
    for (const section of report.sections) {
      for (const line of section.lines) {
        expect(line.percentOfRevenue).toBeNull();
      }
    }
    expect(report.netProfit.current).toBe(-7_000_000);
  });

  it("reports uncategorized separately, excluded from netProfit", () => {
    const report = assembleProfitLoss(
      makeInput(FIXTURE, [], {
        uncategorized: { count: 3, netAmount: -500_000 },
        hasUnreviewed: true,
      }),
    );
    expect(report.uncategorized).toEqual({ count: 3, netAmount: -500_000 });
    expect(report.netProfit.current).toBe(2_000_000); // NOT 1_500_000
    expect(report.hasUnreviewed).toBe(true);
  });

  it("computes previous-period deltas", () => {
    const prev: ProfitLossCategoryRow[] = [
      { categoryId: "c1", categoryName: "Penjualan", categoryType: "PENDAPATAN", netFlow: 8_000_000 },
    ];
    const report = assembleProfitLoss(makeInput(FIXTURE, prev));
    expect(report.revenue.previous).toBe(8_000_000);
    expect(report.revenue.changePct).toBe(25);
    // No previous HPP -> subtotal previous 0, current 4jt -> null baseline.
    const hpp = report.sections.find((s) => s.type === "HPP")!;
    expect(hpp.subtotal.changePct).toBeNull();
  });

  it("returns a fully-zeroed report for an empty period", () => {
    const report = assembleProfitLoss(makeInput([]));
    expect(report.revenue.current).toBe(0);
    expect(report.grossProfit.current).toBe(0);
    expect(report.operatingProfit.current).toBe(0);
    expect(report.netProfit.current).toBe(0);
    expect(report.sections).toHaveLength(4);
    for (const s of report.sections) expect(s.lines).toEqual([]);
  });
});
