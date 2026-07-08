import { AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CATEGORY_TYPE_META } from "@/lib/categories/meta";
import type {
  ProfitLossReport,
  ProfitLossSection,
  ProfitLossSectionType,
} from "@/lib/reports/types";
import { ComparisonDelta, type DeltaPolarity } from "./comparison-delta";
import {
  formatPct,
  LineRow,
  LossPill,
  Money,
  NotAvailable,
  ReportStat,
  ResultRow,
  SectionHeaderRow,
} from "./statement";

/**
 * Sign + delta-polarity conventions per section (design §2.3, §4.2):
 * - PENDAPATAN: totals as-is; delta up = good (normal).
 * - HPP / OPEX: totals are positive COST magnitudes -> structural `−`; a
 *   rising cost is bad, so their subtotal deltas use inverse polarity (the
 *   same finance trap the design calls out for Total Keluar in §5.1).
 * - NON_OPERASIONAL: ± as-is, neutral delta (could be income or cost).
 */
const SECTION_RULES: Record<
  ProfitLossSectionType,
  { moneyMode: "result" | "cost" | "neutral"; polarity: DeltaPolarity }
> = {
  PENDAPATAN: { moneyMode: "result", polarity: "normal" },
  HPP: { moneyMode: "cost", polarity: "inverse" },
  OPEX: { moneyMode: "cost", polarity: "inverse" },
  NON_OPERASIONAL: { moneyMode: "neutral", polarity: "neutral" },
};

/** Margin vs revenue, guarded: null when revenue <= 0 (never NaN/Infinity). */
function marginPct(value: number, revenue: number): number | null {
  return revenue > 0 ? Math.round((value / revenue) * 1000) / 10 : null;
}

export function ProfitLossView({ report }: { report: ProfitLossReport }) {
  const revenue = report.revenue.current;
  const grossMargin = marginPct(report.grossProfit.current, revenue);
  const operatingMargin = marginPct(report.operatingProfit.current, revenue);
  const netMargin = marginPct(report.netProfit.current, revenue);

  const bySectionType = new Map(report.sections.map((s) => [s.type, s]));

  const statValue = (value: number) => (
    <>
      <Money value={value} mode="result" />
      {value < 0 && <LossPill />}
    </>
  );

  const resultRow = (
    label: string,
    delta: ProfitLossReport["grossProfit"],
    margin: number | null,
    hero = false,
  ) => (
    <ResultRow
      label={label}
      hero={hero}
      hasPercentColumn
      percent={margin !== null ? formatPct(margin) : <NotAvailable />}
      percentInlineLabel={margin !== null ? formatPct(margin) : undefined}
      amount={
        <>
          <Money
            value={delta.current}
            mode="result"
            className={hero ? "font-display text-lg font-bold" : "font-display text-base font-bold"}
          />
          {delta.current < 0 && <LossPill />}
        </>
      }
      delta={<ComparisonDelta delta={delta} />}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      {/* KPI summary strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ReportStat
          label="Pendapatan"
          value={statValue(revenue)}
          sub={<ComparisonDelta delta={report.revenue} withSuffix />}
        />
        <ReportStat
          label="Laba Kotor"
          value={statValue(report.grossProfit.current)}
          sub={
            <>
              {grossMargin !== null ? (
                <span>Margin kotor {formatPct(grossMargin)}</span>
              ) : (
                <NotAvailable />
              )}
              <ComparisonDelta delta={report.grossProfit} withSuffix />
            </>
          }
        />
        <ReportStat
          label="Laba Bersih"
          value={statValue(report.netProfit.current)}
          sub={
            <>
              {netMargin !== null ? (
                <span>Margin bersih {formatPct(netMargin)}</span>
              ) : (
                <NotAvailable />
              )}
              <ComparisonDelta delta={report.netProfit} withSuffix />
            </>
          }
        />
      </div>

      {revenue <= 0 && (
        <p className="text-xs text-[var(--text-muted)]">
          Belum ada pendapatan di periode ini — margin belum bisa dihitung.
        </p>
      )}

      {/* The statement — a running subtraction down one column (design §4.2).
          Result rows interleave at their formula positions: Laba Kotor after
          HPP, Laba Operasional after OPEX, Laba Bersih (hero) last. Sections
          with zero lines are omitted (spec decision #2); result rows always
          render. */}
      <Card className="p-3">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Laporan Laba Rugi periode {report.period.label}
          </caption>
          <thead>
            <tr className="border-b border-[var(--border)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              <th scope="col" className="py-2 pr-2 text-left font-semibold">
                Keterangan
              </th>
              <th
                scope="col"
                className="hidden w-[6.5rem] px-2 py-2 text-right font-semibold md:table-cell"
              >
                % Pendapatan
              </th>
              <th scope="col" className="py-2 pl-2 text-right font-semibold">
                Jumlah
              </th>
            </tr>
          </thead>
          <tbody>
            <SectionRows section={bySectionType.get("PENDAPATAN")} />
            <SectionRows section={bySectionType.get("HPP")} />
            {resultRow("Laba Kotor", report.grossProfit, grossMargin)}
            <SectionRows section={bySectionType.get("OPEX")} />
            {resultRow("Laba Operasional", report.operatingProfit, operatingMargin)}
            <SectionRows section={bySectionType.get("NON_OPERASIONAL")} />
            {resultRow("Laba Bersih", report.netProfit, netMargin, true)}
          </tbody>
        </table>

        {/* Uncategorized — OUTSIDE the Laba Bersih formula (spec decision #5) */}
        {report.uncategorized.count > 0 && (
          <div className="mt-3 border-t border-dashed border-[var(--border)] pt-3">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--text)]">
              <AlertCircle
                size={14}
                strokeWidth={1.75}
                aria-hidden="true"
                className="text-[var(--yellow)]"
              />
              <span className="font-medium">Belum terkategorisasi</span>
              <span className="text-[var(--text-muted)]">
                · {report.uncategorized.count} transaksi · net
              </span>
              <Money value={report.uncategorized.netAmount} mode="neutral" />
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Belum masuk hitungan Laba Bersih. Kategorikan di halaman Transaksi
              agar laporan final.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

/** One section: header row + its category lines. Omitted when empty. */
function SectionRows({ section }: { section: ProfitLossSection | undefined }) {
  if (!section || section.lines.length === 0) return null;
  const rules = SECTION_RULES[section.type];
  const meta = CATEGORY_TYPE_META[section.type];
  return (
    <>
      <SectionHeaderRow
        icon={meta.icon}
        label={meta.label}
        subLabel={meta.subLabel}
        hasPercentColumn
        amount={
          <Money
            value={section.subtotal.current}
            mode={rules.moneyMode}
            className="font-semibold"
          />
        }
        delta={
          <ComparisonDelta delta={section.subtotal} polarity={rules.polarity} />
        }
      />
      {section.lines.map((line) => (
        <LineRow
          key={line.categoryId ?? "uncategorized"}
          label={line.categoryName}
          hasPercentColumn
          percent={
            line.percentOfRevenue !== null ? (
              formatPct(line.percentOfRevenue)
            ) : (
              <NotAvailable />
            )
          }
          amount={<Money value={line.total} mode={rules.moneyMode} />}
        />
      ))}
    </>
  );
}
