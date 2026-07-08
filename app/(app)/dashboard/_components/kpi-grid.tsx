import type { DashboardKpis } from "@/lib/reports/types";
import { ComparisonDelta } from "@/app/(app)/reports/_components/comparison-delta";
import {
  formatPct,
  LossPill,
  Money,
  NotAvailable,
  ReportStat,
} from "@/app/(app)/reports/_components/statement";
import { MarginDelta } from "./margin-delta";

/**
 * The 6-card KPI grid (design §3). Every value reuses the step-④ money-token
 * primitives (Money/LossPill/NotAvailable/formatPct) and every delta uses the
 * arrow+sign+token discipline (ComparisonDelta for Rupiah, MarginDelta for
 * percentage points) — never a raw number. Fixed order: two semantic rows on lg
 * ([Pendapatan · Total Beban · Laba Bersih] then [Margin Kotor · Margin Bersih ·
 * Posisi Kas]).
 */
export function KpiGrid({ kpis }: { kpis: DashboardKpis }) {
  const marginValue = (current: number | null) =>
    current === null ? <NotAvailable /> : formatPct(current);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <ReportStat
        label="Pendapatan"
        value={<Money value={kpis.revenue.current} mode="result" />}
        sub={<ComparisonDelta delta={kpis.revenue} withSuffix />}
      />
      <ReportStat
        label="Total Beban"
        // Positive magnitude, no leading sign — the label declares it's expense;
        // good/bad direction lives in the inverse-polarity delta.
        value={<Money value={kpis.totalExpense.current} mode="result" />}
        sub={<ComparisonDelta delta={kpis.totalExpense} polarity="inverse" withSuffix />}
      />
      <ReportStat
        label="Laba Bersih"
        value={
          <>
            <Money value={kpis.netProfit.current} mode="result" />
            {kpis.netProfit.current < 0 && <LossPill />}
          </>
        }
        sub={<ComparisonDelta delta={kpis.netProfit} withSuffix />}
      />
      <ReportStat
        label="Margin Kotor"
        value={marginValue(kpis.grossMarginPct.current)}
        sub={<MarginDelta delta={kpis.grossMarginPct} withSuffix />}
      />
      <ReportStat
        label="Margin Bersih"
        value={marginValue(kpis.netMarginPct.current)}
        sub={<MarginDelta delta={kpis.netMarginPct} withSuffix />}
      />
      <ReportStat
        label="Posisi Kas"
        // Negative (overdraft) renders as − Rp… in --money-neg (Money mode
        // "result"); no LossPill — that pill is reserved for Laba Bersih.
        value={<Money value={kpis.cashPosition.current} mode="result" />}
        sub={<ComparisonDelta delta={kpis.cashPosition} withSuffix />}
      />
    </div>
  );
}
