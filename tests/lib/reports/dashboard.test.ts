import { describe, expect, it } from "vitest";
import {
  assembleDashboardKpis,
  assembleMonthlyTrend,
  deriveExpenseComposition,
  type MonthlyCategoryRow,
} from "@/lib/reports/dashboard";
import { trailingMonths } from "@/lib/reports/period";
import type {
  CashFlowAccountSection,
  CashFlowReport,
  MoneyDelta,
  ProfitLossReport,
  ProfitLossSection,
  ReportLine,
  ResolvedPeriod,
} from "@/lib/reports/types";

const PERIOD: ResolvedPeriod = {
  preset: "month",
  start: "2026-07-01",
  end: "2026-07-31",
  label: "Juli 2026",
};
const PREV: ResolvedPeriod = {
  preset: "month",
  start: "2026-06-01",
  end: "2026-06-30",
  label: "Juni 2026",
};

function md(current: number, previous: number | null): MoneyDelta {
  return { current, previous, changePct: null };
}

function line(name: string, total: number, id: string | null = name): ReportLine {
  return { categoryId: id, categoryName: name, total, percentOfRevenue: null };
}

function section(
  type: ProfitLossSection["type"],
  subtotal: MoneyDelta,
  lines: ReportLine[] = [],
): ProfitLossSection {
  return { type, label: type, lines, subtotal };
}

function makeProfitLoss(over: Partial<ProfitLossReport> = {}): ProfitLossReport {
  return {
    period: PERIOD,
    previousPeriod: PREV,
    sections: [
      section("PENDAPATAN", md(10_000_000, 8_000_000)),
      section("HPP", md(4_000_000, 3_000_000)),
      section("OPEX", md(3_000_000, 2_000_000)),
      section("NON_OPERASIONAL", md(1_000_000, 500_000)),
    ],
    revenue: md(10_000_000, 8_000_000),
    grossProfit: md(6_000_000, 5_000_000),
    operatingProfit: md(3_000_000, 3_000_000),
    netProfit: md(2_000_000, 2_500_000),
    uncategorized: { count: 0, netAmount: 0 },
    hasUnreviewed: false,
    needsReviewCount: 0,
    ...over,
  };
}

function makeCashFlow(closing: MoneyDelta = md(15_000_000, 12_000_000)): CashFlowReport {
  const combined: CashFlowAccountSection = {
    accountId: "combined",
    accountLabel: "Semua Rekening",
    openingBalance: md(0, 0),
    cashInLines: [],
    cashOutLines: [],
    totalIn: md(0, 0),
    totalOut: md(0, 0),
    closingBalance: closing,
    note: null,
  };
  return {
    period: PERIOD,
    previousPeriod: PREV,
    accounts: [],
    combined,
    hasUnreviewed: false,
  };
}

describe("assembleDashboardKpis", () => {
  it("combines HPP+OPEX into Total Beban (NON_OPERASIONAL excluded)", () => {
    const kpis = assembleDashboardKpis(makeProfitLoss(), makeCashFlow());
    expect(kpis.totalExpense.current).toBe(7_000_000); // 4jt + 3jt, not 8jt
    expect(kpis.totalExpense.previous).toBe(5_000_000); // 3jt + 2jt
  });

  it("passes revenue / netProfit through, lifts cash position from cashFlow", () => {
    const kpis = assembleDashboardKpis(makeProfitLoss(), makeCashFlow());
    expect(kpis.revenue.current).toBe(10_000_000);
    expect(kpis.netProfit.current).toBe(2_000_000);
    expect(kpis.cashPosition.current).toBe(15_000_000);
    expect(kpis.cashPosition.previous).toBe(12_000_000);
  });

  it("computes margins as percentage-point deltas (1 decimal)", () => {
    const kpis = assembleDashboardKpis(makeProfitLoss(), makeCashFlow());
    // gross: 6jt/10jt = 60%; prev 5jt/8jt = 62,5% -> -2,5 pp
    expect(kpis.grossMarginPct.current).toBe(60);
    expect(kpis.grossMarginPct.previous).toBe(62.5);
    expect(kpis.grossMarginPct.changePts).toBe(-2.5);
    // net: 2jt/10jt = 20%
    expect(kpis.netMarginPct.current).toBe(20);
  });

  it("returns null margins when revenue <= 0 — never NaN/Infinity", () => {
    const kpis = assembleDashboardKpis(
      makeProfitLoss({
        sections: [
          section("PENDAPATAN", md(0, 0)),
          section("HPP", md(4_000_000, 0)),
          section("OPEX", md(3_000_000, 0)),
          section("NON_OPERASIONAL", md(0, 0)),
        ],
        revenue: md(0, 0),
        grossProfit: md(-4_000_000, 0),
        netProfit: md(-7_000_000, 0),
      }),
      makeCashFlow(),
    );
    expect(kpis.grossMarginPct.current).toBeNull();
    expect(kpis.grossMarginPct.previous).toBeNull();
    expect(kpis.grossMarginPct.changePts).toBeNull();
    expect(kpis.netMarginPct.current).toBeNull();
    expect(Number.isNaN(kpis.grossMarginPct.current as unknown as number)).toBe(false);
  });

  it("carries the review flags through", () => {
    const kpis = assembleDashboardKpis(
      makeProfitLoss({ hasUnreviewed: true, needsReviewCount: 3 }),
      makeCashFlow(),
    );
    expect(kpis.hasUnreviewed).toBe(true);
    expect(kpis.needsReviewCount).toBe(3);
  });
});

describe("deriveExpenseComposition", () => {
  it("takes the top 5 cost lines and folds the rest into Lainnya", () => {
    const pl = makeProfitLoss({
      sections: [
        section("PENDAPATAN", md(20_000_000, 0)),
        section("HPP", md(8_000_000, 0), [line("Bahan A", 5_000_000), line("Bahan B", 3_000_000)]),
        section("OPEX", md(7_500_000, 0), [
          line("Gaji", 4_000_000),
          line("Sewa", 2_000_000),
          line("Listrik", 1_000_000),
          line("Internet", 500_000),
          line("Refund", -300_000), // inflow anomaly -> excluded
        ]),
        section("NON_OPERASIONAL", md(0, 0)),
      ],
    });
    const comp = deriveExpenseComposition(pl);
    // 6 positive cost lines -> top 5 + Lainnya = 6 slices.
    expect(comp.slices).toHaveLength(6);
    expect(comp.slices[0].categoryName).toBe("Bahan A");
    expect(comp.slices[0].total).toBe(5_000_000);
    const last = comp.slices[comp.slices.length - 1];
    expect(last.categoryName).toBe("Lainnya");
    expect(last.categoryId).toBeNull();
    expect(last.total).toBe(500_000); // the leftover Internet line
    // Negative refund line never appears as a slice.
    expect(comp.slices.some((s) => s.categoryName === "Refund")).toBe(false);
    // Total = sum of the 6 positive lines (refund excluded).
    expect(comp.total).toBe(15_500_000);
  });

  it("omits Lainnya when there are <= 5 positive cost categories", () => {
    const pl = makeProfitLoss({
      sections: [
        section("PENDAPATAN", md(10_000_000, 0)),
        section("HPP", md(3_000_000, 0), [line("Bahan", 3_000_000)]),
        section("OPEX", md(2_000_000, 0), [line("Gaji", 2_000_000)]),
        section("NON_OPERASIONAL", md(0, 0)),
      ],
    });
    const comp = deriveExpenseComposition(pl);
    expect(comp.slices).toHaveLength(2);
    expect(comp.slices.some((s) => s.categoryName === "Lainnya")).toBe(false);
  });

  it("returns an empty composition when there are no cost lines", () => {
    const comp = deriveExpenseComposition(makeProfitLoss());
    expect(comp.slices).toEqual([]);
    expect(comp.total).toBe(0);
  });
});

describe("assembleMonthlyTrend", () => {
  const months = trailingMonths("2026-07-31", 12); // Agu 2025 -> Jul 2026

  it("always returns exactly one point per requested month", () => {
    const trend = assembleMonthlyTrend(months, []);
    expect(trend.months).toHaveLength(12);
    expect(trend.months[0].month).toBe("2025-08");
    expect(trend.months[11].month).toBe("2026-07");
  });

  it("computes revenue/expense/profit/margins with the P&L formulas", () => {
    const rows: MonthlyCategoryRow[] = [
      { ym: "2026-07", categoryType: "PENDAPATAN", netFlow: 10_000_000 },
      { ym: "2026-07", categoryType: "HPP", netFlow: -4_000_000 },
      { ym: "2026-07", categoryType: "OPEX", netFlow: -3_000_000 },
    ];
    const jul = assembleMonthlyTrend(months, rows).months.find((m) => m.month === "2026-07")!;
    expect(jul.revenue).toBe(10_000_000);
    expect(jul.expense).toBe(7_000_000); // -(HPP + OPEX) magnitude
    expect(jul.profit).toBe(3_000_000); // 10 - 4 - 3
    expect(jul.grossMarginPct).toBe(60); // (10 - 4) / 10
    expect(jul.netMarginPct).toBe(30); // 3 / 10
  });

  it("zero-fills months with no data and nulls their margins (no div-by-zero)", () => {
    const trend = assembleMonthlyTrend(months, []);
    const first = trend.months[0];
    expect(first.revenue).toBe(0);
    // expense is -(HPP+OPEX) -> a harmless -0 for empty months (serializes to 0).
    expect(first.expense).toBeCloseTo(0);
    expect(first.profit).toBe(0);
    expect(first.grossMarginPct).toBeNull();
    expect(first.netMarginPct).toBeNull();
  });

  it("ignores TRANSFER rows and rows outside the requested window", () => {
    const rows: MonthlyCategoryRow[] = [
      { ym: "2026-07", categoryType: "TRANSFER", netFlow: 99_000_000 },
      { ym: "2020-01", categoryType: "PENDAPATAN", netFlow: 5_000_000 },
    ];
    const jul = assembleMonthlyTrend(months, rows).months.find((m) => m.month === "2026-07")!;
    expect(jul.revenue).toBe(0);
    expect(jul.grossMarginPct).toBeNull();
  });
});
