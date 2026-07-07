import * as XLSX from "xlsx";
import type { ColumnMapping } from "./types";
import { findHeader, hasHeaderMatching } from "./headers";

/**
 * The standard Rekapin Excel template. This is NOT a bank preset (presets ship
 * BCA-only), but the template's shape is known, so files matching it are mapped
 * automatically without the wizard. Shape: Tanggal | Deskripsi | Jumlah | Arah,
 * amount_direction mode, dd/MM/yyyy, Arah ∈ {Masuk, Keluar} (design §9).
 */
export const TEMPLATE_HEADERS = ["Tanggal", "Deskripsi", "Jumlah", "Arah"] as const;

const TEMPLATE_REQUIRED = ["Tanggal", "Deskripsi", "Jumlah", "Arah"];

/** True when the file headers match the Rekapin template shape. */
export function matchesTemplateHeaders(rawHeaders: string[]): boolean {
  return TEMPLATE_REQUIRED.every((needle) => hasHeaderMatching(rawHeaders, needle));
}

/** Build a concrete mapping for a Rekapin-template file. */
export function templateMapping(rawHeaders: string[]): ColumnMapping {
  return {
    amountMode: "amount_direction",
    dateFormat: "dd/MM/yyyy",
    dateColumn: findHeader(rawHeaders, ["Tanggal"]) ?? "Tanggal",
    descriptionColumn: findHeader(rawHeaders, ["Deskripsi", "Keterangan"]) ?? "Deskripsi",
    amountColumn: findHeader(rawHeaders, ["Jumlah"]) ?? "Jumlah",
    directionColumn: findHeader(rawHeaders, ["Arah"]) ?? "Arah",
    balanceColumn: null,
  };
}

/**
 * Generate the Rekapin template workbook as an xlsx Buffer. One header row + a
 * single example row whose Deskripsi starts with "Contoh:" (parser skips it if
 * the user forgets to delete it — spec DECISIONS #4). Plus a short guide sheet.
 */
export function generateTemplateBuffer(): Buffer {
  const mutasi = XLSX.utils.aoa_to_sheet([
    ["Tanggal", "Deskripsi", "Jumlah", "Arah"],
    ["01/07/2026", "Contoh: Penjualan tunai harian", 700000, "Masuk"],
  ]);
  mutasi["!cols"] = [{ wch: 14 }, { wch: 42 }, { wch: 14 }, { wch: 10 }];

  const petunjuk = XLSX.utils.aoa_to_sheet([
    ["Petunjuk pengisian"],
    ["1. Tanggal: format Hari/Bulan/Tahun, contoh 31/07/2026."],
    ["2. Jumlah: angka Rupiah bulat tanpa titik/koma dan tanpa sen."],
    ["3. Arah: isi 'Masuk' atau 'Keluar'."],
    ["4. Hapus baris contoh (yang diawali 'Contoh:') sebelum mengisi data asli."],
  ]);
  petunjuk["!cols"] = [{ wch: 60 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, mutasi, "Mutasi");
  XLSX.utils.book_append_sheet(workbook, petunjuk, "Petunjuk");

  const out = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return Buffer.isBuffer(out) ? out : Buffer.from(out);
}
