import { and, eq, gte, lte, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, transactions } from "@/lib/db/schema";
import type { CategoryType } from "@/lib/categories/meta";
import type {
  DashboardKpis,
  DashboardTrend,
  ExpenseComposition,
  ExpenseCompositionSlice,
  MonthlyTrendPoint,
  MoneyDelta,
  PercentPointDelta,
  ProfitLossReport,
  CashFlowReport,
  ResolvedPeriod,
  TrendMonth,
} from "./types";
import { fetchProfitLoss } from "./profit-loss";
import { fetchCashFlow } from "./cash-flow";
import { toMoneyDelta } from "./period";

/**
 * Dashboard data layer (step ⑤). KPIs + expense composition are PURE derivations
 * of the already-fetched Laba Rugi / Arus Kas DTOs (zero new SQL); only the
 * 12-month trend runs one genuinely new GROUP BY month+type aggregate. Every
 * margin formula mirrors assembleProfitLoss/percentOfRevenue exactly so the
 * dashboard numbers can never silently drift from /reports.
 */

/** Same 1-decimal margin rounding as percentOfRevenue; null when revenue <= 0. */
function marginPct(value: number, revenue: number): number | null {
  return revenue > 0 ? Math.round((value / revenue) * 1000) / 10 : null;
}

/** Round a raw pp difference to 1 decimal (guards float subtraction error). */
function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/**
 * Percentage-POINT delta for a margin (design decision #1). `current`/`previous`
 * are each null when their period's revenue <= 0 (undefined margin); `changePts`
 * is null unless BOTH are defined.
 */
function marginPointDelta(
  profit: MoneyDelta,
  revenue: MoneyDelta,
): PercentPointDelta {
  const current = marginPct(profit.current, revenue.current);
  const previous =
    revenue.previous !== null && profit.previous !== null
      ? marginPct(profit.previous, revenue.previous)
      : null;
  const changePts =
    current !== null && previous !== null ? round1(current - previous) : null;
  return { current, previous, changePts };
}

// ---- KPIs (reuses fetchProfitLoss + fetchCashFlow — no new SQL) -------------

/**
 * PURE — derives Total Beban (HPP+OPEX cost magnitude, combined) and both
 * margin-% point-deltas from an already-fetched ProfitLossReport, and lifts
 * cashFlow.combined.closingBalance as Posisi Kas (period-end balance).
 *
 * NON_OPERASIONAL is deliberately EXCLUDED from Total Beban (a mixed ± bucket
 * that would misrepresent as an expense when net-positive) — it still fully
 * participates in Laba Bersih via the unchanged netProfit formula.
 */
export function assembleDashboardKpis(
  profitLoss: ProfitLossReport,
  cashFlow: CashFlowReport,
): DashboardKpis {
  const hpp = profitLoss.sections.find((s) => s.type === "HPP")?.subtotal;
  const opex = profitLoss.sections.find((s) => s.type === "OPEX")?.subtotal;

  const hppCur = hpp?.current ?? 0;
  const opexCur = opex?.current ?? 0;
  const hppPrev = hpp?.previous ?? 0;
  const opexPrev = opex?.previous ?? 0;

  const totalExpense = toMoneyDelta(hppCur + opexCur, hppPrev + opexPrev);

  return {
    period: profitLoss.period,
    previousPeriod: profitLoss.previousPeriod,
    revenue: profitLoss.revenue,
    totalExpense,
    netProfit: profitLoss.netProfit,
    grossMarginPct: marginPointDelta(profitLoss.grossProfit, profitLoss.revenue),
    netMarginPct: marginPointDelta(profitLoss.netProfit, profitLoss.revenue),
    cashPosition: cashFlow.combined.closingBalance,
    hasUnreviewed: profitLoss.hasUnreviewed,
    needsReviewCount: profitLoss.needsReviewCount,
    uncategorizedCount: profitLoss.uncategorized.count,
  };
}

/**
 * IMPURE — Promise.all([fetchProfitLoss, fetchCashFlow]) then assembleDashboardKpis.
 * Returns profitLoss + cashFlow too, so the page can derive expense composition
 * from the same profitLoss without a second fetch.
 *
 * Caller MUST have already verified admin role via requireRole(["admin"]).
 */
export async function fetchDashboardKpis(
  businessId: string,
  period: ResolvedPeriod,
  previous: ResolvedPeriod,
): Promise<{
  kpis: DashboardKpis;
  profitLoss: ProfitLossReport;
  cashFlow: CashFlowReport;
}> {
  const [profitLoss, cashFlow] = await Promise.all([
    fetchProfitLoss(businessId, period, previous),
    fetchCashFlow(businessId, period, previous),
  ]);
  return { kpis: assembleDashboardKpis(profitLoss, cashFlow), profitLoss, cashFlow };
}

// ---- Expense composition (PURE — derived from ProfitLossReport.sections) ----

const COMPOSITION_TOP_N = 5;

/**
 * PURE — merges the HPP + OPEX section lines (each already a positive cost
 * magnitude, sorted desc within its section), drops any line with total <= 0
 * (the rare cost-refund anomaly — a negative-magnitude slice is meaningless),
 * takes the top 5, and folds the rest into a synthetic "Lainnya" slice.
 */
export function deriveExpenseComposition(
  profitLoss: ProfitLossReport,
): ExpenseComposition {
  const costLines = profitLoss.sections
    .filter((s) => s.type === "HPP" || s.type === "OPEX")
    .flatMap((s) => s.lines)
    .filter((l) => l.total > 0)
    .sort((a, b) => b.total - a.total);

  const total = costLines.reduce((acc, l) => acc + l.total, 0);
  const pctOf = (v: number): number | null =>
    total > 0 ? Math.round((v / total) * 1000) / 10 : null;

  const top = costLines.slice(0, COMPOSITION_TOP_N);
  const rest = costLines.slice(COMPOSITION_TOP_N);

  const slices: ExpenseCompositionSlice[] = top.map((l) => ({
    categoryId: l.categoryId,
    categoryName: l.categoryName,
    total: l.total,
    percentOfTotal: pctOf(l.total),
  }));

  if (rest.length > 0) {
    const restTotal = rest.reduce((acc, l) => acc + l.total, 0);
    slices.push({
      categoryId: null,
      categoryName: "Lainnya",
      total: restTotal,
      percentOfTotal: pctOf(restTotal),
    });
  }

  return { period: profitLoss.period, slices, total };
}

// ---- 12-month trend (genuinely NEW SQL — one GROUP BY month+type query) -----

/** One (month, type) net-flow bucket — input to assembleMonthlyTrend. */
export interface MonthlyCategoryRow {
  ym: string; // "yyyy-MM"
  categoryType: CategoryType; // TRANSFER excluded upstream
  netFlow: number;
}

type PnlType = "PENDAPATAN" | "HPP" | "OPEX" | "NON_OPERASIONAL";

/**
 * PURE — zero-fills every (month, type) bucket, then computes
 * revenue/expense/profit/margins per month with the SAME formulas as
 * assembleProfitLoss (revenue+HPP for gross, full sum for net). Rows outside the
 * requested window or TRANSFER-typed are ignored. Output length === months.length.
 */
export function assembleMonthlyTrend(
  months: TrendMonth[],
  rows: MonthlyCategoryRow[],
): DashboardTrend {
  const byMonth = new Map<string, Record<PnlType, number>>();
  for (const m of months) {
    byMonth.set(m.ym, { PENDAPATAN: 0, HPP: 0, OPEX: 0, NON_OPERASIONAL: 0 });
  }

  for (const r of rows) {
    if (r.categoryType === "TRANSFER") continue;
    const bucket = byMonth.get(r.ym);
    if (!bucket) continue;
    bucket[r.categoryType as PnlType] += r.netFlow;
  }

  const points: MonthlyTrendPoint[] = months.map((m) => {
    const b = byMonth.get(m.ym)!;
    const revenue = b.PENDAPATAN;
    const expense = -(b.HPP + b.OPEX); // HPP/OPEX net-outflow -> positive magnitude
    const grossProfit = b.PENDAPATAN + b.HPP;
    const netProfit = b.PENDAPATAN + b.HPP + b.OPEX + b.NON_OPERASIONAL;
    return {
      month: m.ym,
      label: m.label,
      revenue,
      expense,
      profit: netProfit,
      grossMarginPct: marginPct(grossProfit, revenue),
      netMarginPct: marginPct(netProfit, revenue),
    };
  });

  return { months: points };
}

/** SUM(signedAmount) — +in / -out — bigint + mapWith(Number) (mirrors fetchProfitLoss). */
const signedNetFlow = sql<number>`coalesce(sum(case when ${transactions.direction} = 'in' then ${transactions.amount} else -${transactions.amount} end), 0)::bigint`.mapWith(Number);

const monthBucket = sql<string>`to_char(date_trunc('month', ${transactions.date}), 'YYYY-MM')`;

/**
 * IMPURE — ONE query: GROUP BY month + categories.type over
 * [months[0].start, months[last].end], business-scoped, TRANSFER excluded
 * (mirrors fetchProfitLoss's WHERE shape). Covered by the existing
 * (business_id, date) index — no new index/migration. NO per-month loop.
 *
 * Caller MUST have already verified admin role via requireRole(["admin"]).
 */
export async function fetchMonthlyTrend(
  businessId: string,
  months: TrendMonth[],
): Promise<DashboardTrend> {
  if (months.length === 0) return { months: [] };
  const start = months[0].start;
  const end = months[months.length - 1].end;

  const rows = await db
    .select({
      ym: monthBucket,
      categoryType: categories.type,
      netFlow: signedNetFlow,
    })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .where(
      and(
        eq(transactions.businessId, businessId),
        gte(transactions.date, new Date(start)),
        lte(transactions.date, new Date(end)),
        ne(categories.type, "TRANSFER"),
      ),
    )
    .groupBy(monthBucket, categories.type);

  return assembleMonthlyTrend(
    months,
    rows.map((r) => ({
      ym: r.ym,
      categoryType: r.categoryType,
      netFlow: Number(r.netFlow),
    })),
  );
}
