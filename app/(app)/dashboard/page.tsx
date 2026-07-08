import { eq, sql } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { parseDashboardParams } from "@/lib/reports/params";
import {
  previousPeriod,
  resolvePeriod,
  trailingMonths,
  wibTodayIso,
} from "@/lib/reports/period";
import {
  deriveExpenseComposition,
  fetchDashboardKpis,
  fetchMonthlyTrend,
} from "@/lib/reports/dashboard";
import type {
  DashboardKpis,
  DashboardTrend,
  ExpenseComposition,
} from "@/lib/reports/types";
import { DashboardClient } from "./_components/dashboard-client";

// Admin-only margin/cash summary (spec §Dashboard page architecture). Mirrors
// /reports: requireRole is the real gate (staff redirect to /transactions
// server-side) -> parse period -> a cheap global COUNT gates the fetch -> render.
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { businessId } = await requireRole(["admin"]);
  const sp = await searchParams;
  const { periodParams } = parseDashboardParams(sp);

  const period = resolvePeriod(periodParams);
  const previous = previousPeriod(period);

  // Cheap "has any transaction ever" gate — same pattern as /reports; a brand-new
  // business gets the empty state with zero KPI/chart fetches.
  const totalEverRow = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transactions)
    .where(eq(transactions.businessId, businessId));
  const hasAnyTransaction = (totalEverRow[0]?.count ?? 0) > 0;

  const months = trailingMonths(period.end, 12);

  let kpis: DashboardKpis | null = null;
  let trend: DashboardTrend | null = null;
  let composition: ExpenseComposition | null = null;
  let periodEmpty = false;

  if (hasAnyTransaction) {
    // One Promise.all batch of top-level fetches (each internally parallelized) —
    // no per-month query loop (NFR-3 / acceptance #12).
    const [kpiResult, trendResult] = await Promise.all([
      fetchDashboardKpis(businessId, period, previous),
      fetchMonthlyTrend(businessId, months),
    ]);
    kpis = kpiResult.kpis;
    trend = trendResult;
    // Pure — derived from the already-fetched profitLoss, no extra await.
    composition = deriveExpenseComposition(kpiResult.profitLoss);
    // Same emptiness check reports-client uses (covers the TRANSFER-only edge).
    periodEmpty =
      kpiResult.profitLoss.sections.every((s) => s.lines.length === 0) &&
      kpiResult.profitLoss.uncategorized.count === 0;
  }

  return (
    <DashboardClient
      period={period}
      previousPeriod={previous}
      currentWibYear={Number(wibTodayIso().slice(0, 4))}
      hasAnyTransaction={hasAnyTransaction}
      periodEmpty={periodEmpty}
      kpis={kpis}
      trend={trend}
      composition={composition}
    />
  );
}
