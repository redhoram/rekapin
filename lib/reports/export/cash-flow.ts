import type { CashFlowAccountSection, CashFlowReport } from "../types";
import { buildSingleSheetWorkbook, headerRows, moneyCell, type SheetCell } from "./shared";

/**
 * Build the Arus Kas export workbook (one sheet). Always comprehensive: the
 * combined "Semua Rekening" block first, then one block per included account —
 * independent of the on-screen per-account/combined toggle (spec §arus-kas).
 *
 * Cash flows are shown as positive magnitudes under labeled "Kas Masuk" / "Kas
 * Keluar" headers (matching the on-screen number values); Saldo Akhir is the
 * reconciled closing balance.
 */

function accountBlock(section: CashFlowAccountSection): SheetCell[][] {
  const rows: SheetCell[][] = [
    [section.accountLabel, ""],
    ["Saldo Awal", moneyCell(section.openingBalance.current)],
    ["Kas Masuk", ""],
  ];

  if (section.cashInLines.length === 0) {
    rows.push(["    (tidak ada)", ""]);
  } else {
    for (const line of section.cashInLines) {
      rows.push([`    ${line.categoryName}`, moneyCell(line.total)]);
    }
  }
  rows.push(["Total Masuk", moneyCell(section.totalIn.current)]);

  rows.push(["Kas Keluar", ""]);
  if (section.cashOutLines.length === 0) {
    rows.push(["    (tidak ada)", ""]);
  } else {
    for (const line of section.cashOutLines) {
      rows.push([`    ${line.categoryName}`, moneyCell(line.total)]);
    }
  }
  rows.push(["Total Keluar", moneyCell(section.totalOut.current)]);
  rows.push(["Saldo Akhir", moneyCell(section.closingBalance.current)]);

  return rows;
}

export function buildCashFlowWorkbook(
  report: CashFlowReport,
  businessName: string,
): Buffer {
  const rows: SheetCell[][] = [
    ...headerRows("Laporan Arus Kas", businessName, report.period.label),
    ...accountBlock(report.combined),
  ];

  for (const account of report.accounts) {
    rows.push([]);
    rows.push(...accountBlock(account));
  }

  return buildSingleSheetWorkbook("Arus Kas", rows, [44, 18]);
}
