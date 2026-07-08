import * as React from "react";

/**
 * Themed tooltip for all three charts (design §4.1). Recharts' default tooltip
 * is light-only and unstyled — replaced via the `content` prop. `bg-card` is
 * opaque in both themes and `--border` adapts, so one component serves night +
 * day. Each row's color swatch is co-signed by the text label -> colorblind-safe.
 */

interface TooltipEntry {
  name?: string | number;
  value?: number | string | null;
  color?: string;
  dataKey?: string | number;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  /** Formats each entry value (e.g. formatRupiah, or "—" for null margins). */
  valueFormatter: (value: number | null | undefined) => string;
}

export function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-xs shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
      <p className="font-display mb-1 font-semibold text-[var(--text)]">{label}</p>
      {payload.map((entry, i) => (
        <div key={`${entry.dataKey ?? i}`} className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-[3px]"
            style={{ background: entry.color }}
          />
          <span className="text-[var(--text-muted)]">{entry.name}</span>
          <span className="ml-auto tabular-nums text-[var(--text)]">
            {valueFormatter(
              typeof entry.value === "number" ? entry.value : entry.value == null ? null : Number(entry.value),
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
