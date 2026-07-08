import { ChartSkeleton } from "./_components/chart-skeleton";

/**
 * First-load skeleton (design §7.4): header + picker bar + 6-card KPI grid +
 * one full-width chart + two half-width charts. Pure CSS shimmer (animate-pulse);
 * the global reduced-motion rule neutralizes the animation. Period switches use
 * the isPending dim instead.
 */
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Memuat dashboard">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="h-8 w-40 animate-pulse rounded-md bg-[var(--border)]" />
        <div className="h-4 w-64 animate-pulse rounded-md bg-[var(--border)]" />
      </div>

      {/* Period picker */}
      <div className="h-14 w-full animate-pulse rounded-xl bg-[var(--border)]" />

      {/* KPI grid — 6 cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4"
          >
            <div className="h-3 w-20 animate-pulse rounded bg-[var(--border)]" />
            <div className="mt-2 h-8 w-32 animate-pulse rounded bg-[var(--border)]" />
            <div className="mt-2 h-3 w-24 animate-pulse rounded bg-[var(--border)]" />
          </div>
        ))}
      </div>

      {/* Charts — full-width trend + two half-width */}
      <div className="flex flex-col gap-4">
        <ChartSkeleton />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    </div>
  );
}
