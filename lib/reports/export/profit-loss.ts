import type {
  ProfitLossReport,
  ProfitLossSection,
  ProfitLossSectionType,
} from "../types";
import { buildSingleSheetWorkbook, headerRows, moneyCell, type SheetCell } from "./shared";

/**
 * Build the Laba Rugi export workbook (one sheet, current period only — the
 * exported sheet is clean/printable, no comparison columns; spec Scope/Out).
 *
 * The "Jumlah (Rp)" column is SIGNED for a readable vertical statement: revenue
 * positive, HPP/OPEX shown negative (a running subtraction that sums to Laba
 * Bersih), NON_OPERASIONAL as-is (± net). This differs from the on-screen
 * positive-magnitude-with-a-muted-minus rendering because a plain unstyled cell
 * has no way to co-sign a cost other than the sign itself.
 */

const PCT_FMT = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

function pctText(value: number | null): string {
  return value === null ? "—" : `${PCT_FMT.format(value)}%`;
}

/** P&L-signed value for the statement column (see doc above). */
function statementAmount(type: ProfitLossSectionType, displayTotal: number): number {
  return type === "HPP" || type === "OPEX" ? -displayTotal : displayTotal;
}

function marginPct(value: number, revenue: number): number | null {
  return revenue > 0 ? Math.round((value / revenue) * 1000) / 10 : null;
}

function sectionRows(
  section: ProfitLossSection | undefined,
): SheetCell[][] {
  if (!section || section.lines.length === 0) return [];
  const rows: SheetCell[][] = [
    [section.label, "", moneyCell(statementAmount(section.type, section.subtotal.current))],
  ];
  for (const line of section.lines) {
    rows.push([
      `    ${line.categoryName}`,
      pctText(line.percentOfRevenue),
      moneyCell(statementAmount(section.type, line.total)),
    ]);
  }
  return rows;
}

export function buildProfitLossWorkbook(
  report: ProfitLossReport,
  businessName: string,
): Buffer {
  const revenue = report.revenue.current;
  const bySection = new Map(report.sections.map((s) => [s.type, s]));

  const resultRow = (
    label: string,
    amount: number,
  ): SheetCell[] => [label, pctText(marginPct(amount, revenue)), moneyCell(amount)];

  const rows: SheetCell[][] = [
    ...headerRows("Laporan Laba Rugi", businessName, report.period.label),
    ["Keterangan", "% Pendapatan", "Jumlah (Rp)"],
    ...sectionRows(bySection.get("PENDAPATAN")),
    ...sectionRows(bySection.get("HPP")),
    resultRow("Laba Kotor", report.grossProfit.current),
    ...sectionRows(bySection.get("OPEX")),
    resultRow("Laba Operasional", report.operatingProfit.current),
    ...sectionRows(bySection.get("NON_OPERASIONAL")),
    resultRow("Laba Bersih", report.netProfit.current),
  ];

  if (report.uncategorized.count > 0) {
    rows.push([]);
    rows.push([
      `Belum terkategorisasi (${report.uncategorized.count} transaksi, di luar Laba Bersih)`,
      "",
      moneyCell(report.uncategorized.netAmount),
    ]);
  }

  return buildSingleSheetWorkbook("Laba Rugi", rows, [44, 14, 18]);
}
