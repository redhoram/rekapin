import { formatDateShort, formatRupiah } from "@/lib/utils";
import type { CashBookPage } from "../types";
import { buildSingleSheetWorkbook, moneyCell, type SheetCell } from "./shared";

/**
 * Build the Buku Kas export workbook (one sheet). Contains EVERY transaction in
 * the period/account (the route fetches with pageSize=BUKU_KAS_EXPORT_PAGE_SIZE,
 * not the on-screen page of 50). The combined view adds a "Rekening" column.
 *
 * Masuk/Keluar are positive magnitudes (a row is either an inflow or an outflow);
 * the empty side is left blank. Saldo is the signed running balance.
 */
export function buildCashBookWorkbook(
  page: CashBookPage,
  businessName: string,
  accountLabel: string,
): Buffer {
  const isCombined = page.accountId === "combined";

  const rows: SheetCell[][] = [
    ["Buku Kas"],
    [businessName],
    [`Periode: ${page.period.label}`],
    [`Rekening: ${accountLabel}`],
    [
      `Saldo awal per ${formatDateShort(page.effectiveStart)}: ${formatRupiah(
        page.openingBalance,
      )}`,
    ],
    [],
  ];

  const header: SheetCell[] = isCombined
    ? ["Tanggal", "Deskripsi", "Kategori", "Rekening", "Masuk", "Keluar", "Saldo"]
    : ["Tanggal", "Deskripsi", "Kategori", "Masuk", "Keluar", "Saldo"];
  rows.push(header);

  for (const r of page.rows) {
    const category = r.categoryArchived
      ? `${r.categoryName} (diarsipkan)`
      : r.categoryName;
    const masuk: SheetCell = r.amountIn > 0 ? moneyCell(r.amountIn) : "";
    const keluar: SheetCell = r.amountOut > 0 ? moneyCell(r.amountOut) : "";
    const saldo = moneyCell(r.runningBalance);

    rows.push(
      isCombined
        ? [
            formatDateShort(r.date),
            r.description,
            category,
            r.bankAccountLabel,
            masuk,
            keluar,
            saldo,
          ]
        : [formatDateShort(r.date), r.description, category, masuk, keluar, saldo],
    );
  }

  const colWidths = isCombined
    ? [14, 40, 20, 20, 16, 16, 16]
    : [14, 40, 20, 16, 16, 16];

  return buildSingleSheetWorkbook("Buku Kas", rows, colWidths);
}
