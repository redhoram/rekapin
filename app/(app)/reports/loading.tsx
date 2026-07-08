/**
 * First-load skeleton (design §7.4): header + 3-up KPI row + statement bars.
 * Pure CSS shimmer (animate-pulse); the global reduced-motion rule neutralizes
 * the animation timing. Tab/period switches use the isPending dim instead.
 */
export default function ReportsLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Memuat laporan">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="h-8 w-40 animate-pulse rounded-md bg-[var(--border)]" />
        <div className="h-4 w-64 animate-pulse rounded-md bg-[var(--border)]" />
      </div>

      {/* Tabs + picker */}
      <div className="h-10 w-full max-w-md animate-pulse rounded-md bg-[var(--border)]" />
      <div className="h-14 w-full animate-pulse rounded-xl bg-[var(--border)]" />

      {/* KPI strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
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

      {/* Statement */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3">
        <div className="flex flex-col gap-3 py-1">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="h-4 animate-pulse rounded bg-[var(--border)]"
              style={{ width: `${100 - (i % 3) * 18}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
