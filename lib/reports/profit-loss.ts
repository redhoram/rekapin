import { and, eq, gte, isNull, lte, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, transactions } from "@/lib/db/schema";
import { CATEGORY_TYPE_META, type CategoryType } from "@/lib/categories/meta";
import type {
  AssembleProfitLossInput,
  ProfitLossReport,
  ProfitLossSection,
  ProfitLossSectionType,
  ReportLine,
  ResolvedPeriod,
} from "./types";
import { toMoneyDelta } from "./period";

// Re-export so tests + fetchers share one input shape name.
export type { AssembleProfitLossInput } from "./types";

/**
 * The four P&L sections in fixed display order (CATEGORY_TYPE_META order, minus
 * TRANSFER which is excluded from P&L entirely — cash-basis, CLAUDE.md/FR-4.3).
 */
const SECTION_TYPES: ProfitLossSectionType[] = [
  "PENDAPATAN",
  "HPP",
  "OPEX",
  "NON_OPERASIONAL",
];

/**
 * Display sign convention for a category/section total:
 * - PENDAPATAN / NON_OPERASIONAL: shown as-is (netFlow)
 * - HPP / OPEX: shown as a positive COST magnitude (−netFlow), so a normally
 *   net-outflow cost reads positive; a rare net-inflow cost (e.g. a large
 *   supplier refund) legitimately renders negative — documented, not hidden.
 */
function displayTotal(type: CategoryType, netFlow: number): number {
  return type === "HPP" || type === "OPEX" ? -netFlow : netFlow;
}

/** % of revenue for a display total; null when revenue <= 0 (never divide). */
function percentOfRevenue(total: number, revenue: number): number | null {
  return revenue > 0 ? Math.round((total / revenue) * 1000) / 10 : null;
}

/**
 * Pure assembly of grouped SQL rows into the ProfitLossReport DTO. No DB. The
 * Laba Bersih invariant lives here:
 *   Laba Kotor        = netFlow(PENDAPATAN) + netFlow(HPP)
 *   Laba Operasional  = Laba Kotor + netFlow(OPEX)
 *   Laba Bersih       = Laba Operasional + netFlow(NON_OPERASIONAL)
 *                     = SUM(netFlow) over ALL non-TRANSFER categorized rows.
 * TRANSFER rows are filtered out defensively even if the query already excluded
 * them. Uncategorized is reported separately, OUTSIDE the Laba Bersih formula.
 */
export function assembleProfitLoss(
  input: AssembleProfitLossInput,
): ProfitLossReport {
  const current = input.current.filter((r) => r.categoryType !== "TRANSFER");
  const previous = input.previous.filter((r) => r.categoryType !== "TRANSFER");

  // Raw netFlow sums per type (both periods) — the basis for every result row.
  const sumNet = (
    rows: typeof current,
    type: ProfitLossSectionType,
  ): number =>
    rows
      .filter((r) => r.categoryType === type)
      .reduce((acc, r) => acc + r.netFlow, 0);

  const curNet: Record<ProfitLossSectionType, number> = {
    PENDAPATAN: sumNet(current, "PENDAPATAN"),
    HPP: sumNet(current, "HPP"),
    OPEX: sumNet(current, "OPEX"),
    NON_OPERASIONAL: sumNet(current, "NON_OPERASIONAL"),
  };
  const prevNet: Record<ProfitLossSectionType, number> = {
    PENDAPATAN: sumNet(previous, "PENDAPATAN"),
    HPP: sumNet(previous, "HPP"),
    OPEX: sumNet(previous, "OPEX"),
    NON_OPERASIONAL: sumNet(previous, "NON_OPERASIONAL"),
  };

  const revenueCur = curNet.PENDAPATAN;

  const sections: ProfitLossSection[] = SECTION_TYPES.map((type) => {
    const lines: ReportLine[] = current
      .filter((r) => r.categoryType === type)
      .map((r) => {
        const total = displayTotal(type, r.netFlow);
        return {
          categoryId: r.categoryId,
          categoryName: r.categoryName,
          total,
          percentOfRevenue: percentOfRevenue(total, revenueCur),
        };
      })
      // Largest magnitude first (spec decision #3).
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

    // Section subtotal display value = displayTotal(sum netFlow) = sum of line totals.
    const subCur = displayTotal(type, curNet[type]);
    const subPrev = displayTotal(type, prevNet[type]);

    return {
      type,
      label: CATEGORY_TYPE_META[type].label,
      lines,
      subtotal: toMoneyDelta(subCur, subPrev),
    };
  });

  const grossCur = curNet.PENDAPATAN + curNet.HPP;
  const grossPrev = prevNet.PENDAPATAN + prevNet.HPP;
  const operCur = grossCur + curNet.OPEX;
  const operPrev = grossPrev + prevNet.OPEX;
  const netCur = operCur + curNet.NON_OPERASIONAL;
  const netPrev = operPrev + prevNet.NON_OPERASIONAL;

  return {
    period: input.period,
    previousPeriod: input.previousPeriod,
    sections,
    revenue: toMoneyDelta(revenueCur, prevNet.PENDAPATAN),
    grossProfit: toMoneyDelta(grossCur, grossPrev),
    operatingProfit: toMoneyDelta(operCur, operPrev),
    netProfit: toMoneyDelta(netCur, netPrev),
    uncategorized: input.uncategorized,
    hasUnreviewed: input.hasUnreviewed,
    needsReviewCount: input.needsReviewCount,
  };
}

/**
 * SUM(signedAmount) — +in / -out. Cast to bigint (a period sum easily exceeds
 * the int4 max of ~Rp 2.1B); neon returns bigint as a string, so mapWith(Number)
 * coerces it back — exact for any Rupiah total under 2^53.
 */
const signedSum = sql<number>`coalesce(sum(case when ${transactions.direction} = 'in' then ${transactions.amount} else -${transactions.amount} end), 0)::bigint`.mapWith(Number);

/**
 * Fetch the Laba Rugi report for a period + its previous-period comparison.
 *
 * Caller MUST have already verified admin role via requireRole(["admin"]).
 * Business-scoped from the verified membership — never a client businessId.
 */
export async function fetchProfitLoss(
  businessId: string,
  period: ResolvedPeriod,
  previous: ResolvedPeriod,
): Promise<ProfitLossReport> {
  const groupedFor = (p: ResolvedPeriod) =>
    db
      .select({
        categoryId: categories.id,
        categoryName: categories.name,
        categoryType: categories.type,
        netFlow: signedSum,
      })
      .from(transactions)
      // INNER JOIN: a category only appears if it has >=1 txn in the period.
      // NOT filtered by archived_at — archived categories keep historical rows.
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .where(
        and(
          eq(transactions.businessId, businessId),
          gte(transactions.date, new Date(p.start)),
          lte(transactions.date, new Date(p.end)),
          ne(categories.type, "TRANSFER"),
        ),
      )
      .groupBy(categories.id, categories.name, categories.type);

  const [currentRows, previousRows, uncatRows, unreviewedRows] =
    await Promise.all([
      groupedFor(period),
      groupedFor(previous),
      // Uncategorized bucket — reported outside the Laba Bersih formula.
      db
        .select({
          count: sql<number>`count(*)::int`,
          netAmount: signedSum,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.businessId, businessId),
            isNull(transactions.categoryId),
            gte(transactions.date, new Date(period.start)),
            lte(transactions.date, new Date(period.end)),
          ),
        ),
      // "Belum final" driver: any needs_review txn in the period.
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(transactions)
        .where(
          and(
            eq(transactions.businessId, businessId),
            eq(transactions.reviewStatus, "needs_review"),
            gte(transactions.date, new Date(period.start)),
            lte(transactions.date, new Date(period.end)),
          ),
        ),
    ]);

  const uncat = uncatRows[0] ?? { count: 0, netAmount: 0 };
  const needsReviewCount = Number(unreviewedRows[0]?.count) || 0;

  return assembleProfitLoss({
    period,
    previousPeriod: previous,
    current: currentRows.map((r) => ({
      categoryId: r.categoryId,
      categoryName: r.categoryName,
      categoryType: r.categoryType,
      netFlow: Number(r.netFlow),
    })),
    previous: previousRows.map((r) => ({
      categoryId: r.categoryId,
      categoryName: r.categoryName,
      categoryType: r.categoryType,
      netFlow: Number(r.netFlow),
    })),
    uncategorized: {
      count: Number(uncat.count) || 0,
      netAmount: Number(uncat.netAmount) || 0,
    },
    hasUnreviewed: needsReviewCount > 0,
    needsReviewCount,
  });
}
