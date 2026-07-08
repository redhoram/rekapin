import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PercentPointDelta } from "@/lib/reports/types";

/**
 * Percentage-POINT delta for a margin KPI (design §3′, decision #1). Mirrors
 * ComparisonDelta's arrow+sign+token grammar, but the unit is percentage points
 * (` pp`), NOT a relative %. Higher margin is always good -> fixed normal
 * polarity (up = --money-pos, down = --money-neg). Colorblind-safe: the arrow
 * glyph + explicit +/− sign carry the meaning; color only reinforces.
 */

const PP_FMT = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatPts(v: number): string {
  return PP_FMT.format(Math.abs(v));
}

export function MarginDelta({
  delta,
  withSuffix = false,
  className,
}: {
  delta: PercentPointDelta;
  /** Append "vs periode lalu" — KPI cards only. */
  withSuffix?: boolean;
  className?: string;
}) {
  const { current, previous, changePts } = delta;
  const suffix = withSuffix ? (
    <span className="text-[var(--text-muted)]">vs periode lalu</span>
  ) : null;

  // No margin this period (revenue <= 0) -> no arrow, margin is undefined.
  if (current === null) {
    return (
      <span
        className={cn("inline-flex items-center gap-1 text-xs tabular-nums text-[var(--text-muted)]", className)}
        aria-label="margin tidak tersedia, belum ada pendapatan"
      >
        Belum ada pendapatan{suffix && <> {suffix}</>}
      </span>
    );
  }

  // No previous-period margin baseline -> "Baru" pill (ComparisonDelta styling).
  if (previous === null || changePts === null) {
    return (
      <span
        className={cn("inline-flex items-center gap-1 text-xs tabular-nums", className)}
        aria-label="tidak ada margin periode sebelumnya"
      >
        <span className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-1.5 py-px text-[10px] font-medium text-[var(--text-muted)]">
          Baru
        </span>
        {suffix}
      </span>
    );
  }

  if (changePts === 0) {
    return (
      <span
        className={cn("inline-flex items-center gap-1 text-xs tabular-nums text-[var(--text-muted)]", className)}
        aria-label="margin tidak berubah dari periode sebelumnya"
      >
        <span aria-hidden="true">—</span> 0,0 pp{suffix && <> {suffix}</>}
      </span>
    );
  }

  const up = changePts > 0;
  const Icon = up ? ArrowUp : ArrowDown;
  const pts = formatPts(changePts);
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-xs tabular-nums", className)}
      aria-label={`margin ${up ? "naik" : "turun"} ${pts} poin persen dari periode sebelumnya`}
    >
      <span
        className={cn(
          "inline-flex items-center gap-0.5",
          up ? "text-[var(--money-pos)]" : "text-[var(--money-neg)]",
        )}
      >
        <Icon size={12} strokeWidth={1.75} aria-hidden="true" />
        {up ? "+" : "−"}
        {pts} pp
      </span>
      {suffix}
    </span>
  );
}
