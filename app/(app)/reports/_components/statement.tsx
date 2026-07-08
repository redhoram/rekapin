import type * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn, formatRupiah } from "@/lib/utils";

/**
 * Shared statement primitives for Laba Rugi + Arus Kas so the §2.3 sign
 * convention lives in exactly one place. Two visually distinct minuses:
 * - STRUCTURAL subtraction (a cost line — subtracting is normal): muted `−`,
 *   number in --text.
 * - SEMANTIC negative (a loss, a negative balance — the sign is a warning):
 *   `−` AND number in --money-neg.
 * formatRupiah is ALWAYS called with a non-negative integer; the sign is a
 * separate span (acceptance #19). U+2212 minus, never a hyphen.
 */

const MINUS = "−";

export type MoneyMode =
  /** Shown as-is; a negative value is a semantic negative (loss/overdraft). */
  | "result"
  /** Positive = cost magnitude -> structural `−`; negative = the rare inflow
   *  anomaly (e.g. supplier refund) -> `+` in --money-pos (design §2.3). */
  | "cost"
  /** Always signed (`+`/`−` muted), number stays --text (± lines). */
  | "neutral";

export function Money({
  value,
  mode = "result",
  className,
}: {
  value: number;
  mode?: MoneyMode;
  className?: string;
}) {
  const abs = formatRupiah(Math.abs(value));

  if (mode === "cost") {
    if (value < 0) {
      return (
        <span className={cn("whitespace-nowrap tabular-nums text-[var(--money-pos)]", className)}>
          + {abs}
        </span>
      );
    }
    return (
      <span className={cn("whitespace-nowrap tabular-nums text-[var(--text)]", className)}>
        {value > 0 && <span className="text-[var(--text-muted)]">{MINUS} </span>}
        {abs}
      </span>
    );
  }

  if (mode === "neutral") {
    return (
      <span className={cn("whitespace-nowrap tabular-nums text-[var(--text)]", className)}>
        {value !== 0 && (
          <span className="text-[var(--text-muted)]">
            {value > 0 ? "+" : MINUS}{" "}
          </span>
        )}
        {abs}
      </span>
    );
  }

  // "result": semantic negative when < 0.
  if (value < 0) {
    return (
      <span className={cn("whitespace-nowrap tabular-nums text-[var(--money-neg)]", className)}>
        {MINUS} {abs}
      </span>
    );
  }
  return (
    <span className={cn("whitespace-nowrap tabular-nums text-[var(--text)]", className)}>
      {abs}
    </span>
  );
}

/** Tiny "Rugi" pill appended after a negative result amount (design §4.1). */
export function LossPill() {
  return (
    <span className="ml-1.5 inline-flex items-center rounded-full border border-[var(--border)] px-1.5 py-px align-middle text-[10px] font-medium text-[var(--money-neg)]">
      Rugi
    </span>
  );
}

/** id-ID percent, max 1 decimal, e.g. 64 -> "64%", 12.34 -> "12,3%". */
export function formatPct(value: number): string {
  return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value)}%`;
}

/** `—` placeholder that never reads as data (design §9). */
export function NotAvailable({ className }: { className?: string }) {
  return (
    <span aria-label="tidak tersedia" className={cn("text-[var(--text-muted)]", className)}>
      —
    </span>
  );
}

// ---------------------------------------------------------------------------
// Statement rows. The Laba Rugi table has a `%` column (hidden < md); Arus Kas
// has none — `hasPercentColumn` keeps the <tr> cell counts consistent per table.
// ---------------------------------------------------------------------------

const PCT_CELL = "hidden w-[6.5rem] px-2 py-2 text-right text-sm tabular-nums text-[var(--text-muted)] md:table-cell";

export function SectionHeaderRow({
  icon: Icon,
  label,
  subLabel,
  amount,
  delta,
  hasPercentColumn,
}: {
  icon: LucideIcon;
  label: string;
  subLabel?: string;
  amount: React.ReactNode;
  delta?: React.ReactNode;
  hasPercentColumn: boolean;
}) {
  return (
    <tr>
      <th scope="row" className="py-2.5 pr-2 text-left text-sm font-semibold text-[var(--text)]">
        <span className="inline-flex items-center gap-2">
          <Icon size={14} strokeWidth={1.75} className="text-[var(--text-muted)]" aria-hidden="true" />
          {label}
          {subLabel && (
            <span className="ml-0.5 hidden text-xs font-normal text-[var(--text-muted)] sm:inline">
              {subLabel}
            </span>
          )}
        </span>
      </th>
      {hasPercentColumn && <td className={PCT_CELL} />}
      <td className="py-2.5 pl-2 text-right text-sm font-semibold">
        <span className="inline-flex flex-wrap items-center justify-end gap-x-2">
          {delta}
          {amount}
        </span>
      </td>
    </tr>
  );
}

export function LineRow({
  label,
  archived = false,
  percent,
  amount,
  hasPercentColumn,
}: {
  label: string;
  archived?: boolean;
  percent?: React.ReactNode;
  amount: React.ReactNode;
  hasPercentColumn: boolean;
}) {
  return (
    <tr>
      <th scope="row" className="py-2 pl-7 pr-2 text-left text-sm font-normal text-[var(--text-muted)]">
        {label}
        {archived && <span> (diarsipkan)</span>}
      </th>
      {hasPercentColumn && <td className={PCT_CELL}>{percent}</td>}
      <td className="py-2 pl-2 text-right text-sm">{amount}</td>
    </tr>
  );
}

export function ResultRow({
  label,
  percent,
  percentInlineLabel,
  amount,
  delta,
  hero = false,
  hasPercentColumn,
}: {
  label: string;
  percent?: React.ReactNode;
  /** Mobile fallback for the hidden % column, e.g. "· 64%" (design §4.2). */
  percentInlineLabel?: string;
  amount: React.ReactNode;
  delta?: React.ReactNode;
  hero?: boolean;
  hasPercentColumn: boolean;
}) {
  return (
    <tr
      className={cn(
        "border-t border-[var(--border)]",
        hero && "border-t-2 hover-wash",
      )}
    >
      <th
        scope="row"
        className="font-display py-3 pr-2 text-left text-sm font-semibold text-[var(--text)]"
      >
        {label}
        {hasPercentColumn && percentInlineLabel && (
          <span className="ml-1.5 text-xs font-normal text-[var(--text-muted)] md:hidden">
            · {percentInlineLabel}
          </span>
        )}
      </th>
      {hasPercentColumn && <td className={PCT_CELL}>{percent}</td>}
      <td className={cn("font-display py-3 pl-2 text-right font-bold", hero ? "text-lg" : "text-base")}>
        <span className="inline-flex flex-wrap items-center justify-end gap-x-2">
          {delta}
          {amount}
        </span>
      </td>
    </tr>
  );
}

/** KPI stat card: eyebrow label + display value + sub-line (deltas/margins). */
export function ReportStat({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4",
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="font-display mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {sub && (
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--text-muted)]">
          {sub}
        </div>
      )}
    </div>
  );
}
