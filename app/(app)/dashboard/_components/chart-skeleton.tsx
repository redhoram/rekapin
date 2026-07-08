import { Card } from "@/components/ui/card";

/**
 * Shared chart loading placeholder (design §3, §7.4) — the fallback for every
 * `dynamic(..., { ssr: false, loading })` chart island AND a building block of
 * the page-level loading.tsx. Pure CSS shimmer; the global reduced-motion rule
 * neutralizes the animation.
 */
export function ChartSkeleton() {
  return (
    <Card className="p-4" aria-hidden="true">
      <div className="h-4 w-32 animate-pulse rounded bg-[var(--border)]" />
      <div className="mt-3 h-[240px] animate-pulse rounded-md bg-[var(--border)] sm:h-[280px]" />
    </Card>
  );
}
