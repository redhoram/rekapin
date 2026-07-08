"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { FinalBadge } from "@/app/(app)/reports/_components/final-badge";
import { PeriodPicker } from "@/app/(app)/reports/_components/period-picker";
import { ReportEmpty } from "@/app/(app)/reports/_components/report-empty";
import { KpiGrid } from "./kpi-grid";
import { ReviewCta } from "./review-cta";
import { ChartSkeleton } from "./chart-skeleton";
import type { DashboardClientProps, ParamUpdate } from "./types";

/**
 * Client shell for /dashboard (design §2). Owns the searchParams pushes + the
 * pending dim, exactly like ReportsClient (minus the bkPage/tab/account params
 * the dashboard URL never has). All KPI/trend/composition data arrives
 * pre-computed from the server component — every period change is a URL replace
 * that re-runs the server fetch.
 *
 * The three Recharts islands are dynamically imported with `ssr: false`:
 * ResponsiveContainer needs ResizeObserver (absent during SSR), so rendering
 * them server-side would throw or produce a 0×0 chart. The ChartSkeleton fills
 * the space until the client-only bundle loads (all data is already serialized
 * props — zero client fetching/aggregation).
 */

const TrendChart = dynamic(
  () => import("./trend-chart").then((m) => m.TrendChart),
  { ssr: false, loading: () => <ChartSkeleton /> },
);
const ExpenseCompositionChart = dynamic(
  () => import("./expense-composition-chart").then((m) => m.ExpenseCompositionChart),
  { ssr: false, loading: () => <ChartSkeleton /> },
);
const MarginTrendChart = dynamic(
  () => import("./margin-trend-chart").then((m) => m.MarginTrendChart),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

export function DashboardClient(props: DashboardClientProps) {
  const {
    period,
    previousPeriod,
    currentWibYear,
    hasAnyTransaction,
    periodEmpty,
    kpis,
    trend,
    composition,
  } = props;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();

  const pushParams = React.useCallback(
    (update: ParamUpdate) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(update)) {
        if (v === null) params.delete(k);
        else params.set(k, v);
      }
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [searchParams, pathname, router],
  );

  let content: React.ReactNode;
  if (!hasAnyTransaction) {
    content = <ReportEmpty variant="new" />;
  } else if (periodEmpty || !kpis || !trend || !composition) {
    // Data exists globally but this period is P&L-empty (incl. the TRANSFER-only
    // edge) — the picker is the fix, not the Upload CTA.
    content = <ReportEmpty variant="period" periodLabel={period.label} />;
  } else {
    content = (
      <div className="flex flex-col gap-6">
        <KpiGrid kpis={kpis} />
        {kpis.needsReviewCount > 0 && (
          <ReviewCta needsReviewCount={kpis.needsReviewCount} />
        )}
        <div className="flex flex-col gap-4">
          <TrendChart data={trend.months} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ExpenseCompositionChart composition={composition} />
            <MarginTrendChart data={trend.months} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text)] md:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {period.label} · vs {previousPeriod.label}
          </p>
        </div>
        {kpis?.hasUnreviewed && <FinalBadge />}
      </div>

      <PeriodPicker
        period={period}
        currentWibYear={currentWibYear}
        onParamChange={pushParams}
      />

      {/* Pending dim — snappy feedback while the server refetch runs (§1.4). */}
      <div
        className={cn(
          "transition-opacity duration-200",
          isPending && "pointer-events-none opacity-60",
        )}
      >
        {content}
      </div>
    </div>
  );
}
