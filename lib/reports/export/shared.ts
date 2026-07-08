import * as XLSX from "xlsx";

/**
 * Shared xlsx-building primitives for the report exports. Same idiom as
 * lib/parsing/template.ts: aoa_to_sheet -> book_new -> book_append_sheet ->
 * write({ type: "buffer" }). NO cell styling (the free SheetJS build has weak
 * style-write support) — "rapi" comes from structure, column widths, and the
 * #,##0 number format on money cells (Excel renders per the user's own locale).
 */

/** A full SheetJS cell object; aoa_to_sheet honors { v, t, z } directly. */
export type SheetCell = string | number | { v: number; t: "n"; z: string };

/** A money cell: raw integer Rupiah + Indonesian-agnostic thousands format. */
export function moneyCell(value: number): { v: number; t: "n"; z: "#,##0" } {
  return { v: value, t: "n", z: "#,##0" };
}

/**
 * The three leading title rows every sheet shares (title, business name,
 * "Periode: {label}") followed by a blank spacer row.
 */
export function headerRows(
  title: string,
  businessName: string,
  periodLabel: string,
): SheetCell[][] {
  return [[title], [businessName], [`Periode: ${periodLabel}`], []];
}

/** Build a single-sheet workbook and serialize it to an xlsx Buffer. */
export function buildSingleSheetWorkbook(
  sheetName: string,
  rows: SheetCell[][],
  colWidths: number[],
): Buffer {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = colWidths.map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  // Excel sheet names cap at 31 chars and forbid a few characters.
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.isBuffer(out) ? out : Buffer.from(out);
}
