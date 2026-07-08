import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MoneyDelta } from "@/lib/reports/types";
import { formatPct } from "./statement";

/**
 * ▲/▼ + % vs previous period (design §7.1). The arrow glyph + explicit sign
 * carry the meaning; color only reinforces (colorblind-safe).
 *
 * `polarity` decides which direction is "good":
 * - normal  — up is good (revenue, profit, cash in)
 * - inverse — up is BAD (rising cash-out / costs)
 * - neutral — no judgement (muted)
 */
export type DeltaPolarity = "normal" | "inverse" | "neutral";

function colorFor(direction: "up" | "down", polarity: DeltaPolarity): string {
  if (polarity === "neutral") return "text-[var(--text-muted)]";
  const good = polarity === "normal" ? direction === "up" : direction === "down";
  return good ? "text-[var(--money-pos)]" : "text-[var(--money-neg)]";
}

export function ComparisonDelta({
  delta,
  polarity = "normal",
  withSuffix = false,
  className,
}: {
  delta: MoneyDelta;
  polarity?: DeltaPolarity;
  /** Append "vs periode lalu" — KPI cards only; table rows omit it (§7.1). */
  withSuffix?: boolean;
  className?: string;
}) {
  const { changePct } = delta;
  const suffix = withSuffix ? (
    <span className="text-[var(--text-muted)]">vs periode lalu</span>
  ) : null;

  // Undefined baseline (previous === 0, current !== 0) -> safe "Baru" pill.
  if (changePct === null) {
    return (
      <span
        className={cn("inline-flex items-center gap-1 text-xs tabular-nums", className)}
        aria-label="tidak ada data periode sebelumnya"
      >
        <span className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-1.5 py-px text-[10px] font-medium text-[var(--text-muted)]">
          Baru
        </span>
        {suffix}
      </span>
    );
  }

  if (changePct === 0) {
    return (
      <span
        className={cn("inline-flex items-center gap-1 text-xs tabular-nums text-[var(--text-muted)]", className)}
        aria-label="tidak berubah dari periode sebelumnya"
      >
        <span aria-hidden="true">—</span> 0%{suffix && <> {suffix}</>}
      </span>
    );
  }

  const up = changePct > 0;
  const Icon = up ? ArrowUp : ArrowDown;
  const pct = formatPct(Math.abs(changePct));
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-xs tabular-nums", className)}
      aria-label={`${up ? "naik" : "turun"} ${pct} dari periode sebelumnya`}
    >
      <span className={cn("inline-flex items-center gap-0.5", colorFor(up ? "up" : "down", polarity))}>
        <Icon size={12} strokeWidth={1.75} aria-hidden="true" />
        {up ? "+" : "−"}
        {pct}
      </span>
      {suffix}
    </span>
  );
}
