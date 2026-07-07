import type { BankPreset, ColumnMapping } from "../types";
import { findHeader, hasHeaderMatching } from "../headers";

/**
 * BCA (KlikBCA / internet-banking mutation export) preset.
 *
 * Assumed shape (best-effort from public knowledge — spec "BCA preset"; real
 * files may deviate, in which case the mapping wizard is the safety net):
 *   Tanggal Transaksi | Keterangan | Cabang | Jumlah | DB/CR | Saldo
 *   dd/MM/yyyy        | free text  | branch | 700000 | CR/DB | balance
 *
 * DB/CR → direction ("DB" = out, "CR" = in) via the shared amount_direction mode.
 */

const REQUIRED = ["Tanggal Transaksi", "Keterangan", "Jumlah", "DB/CR"];

export const bcaPreset: BankPreset = {
  code: "BCA",
  label: "BCA",
  dateFormat: "dd/MM/yyyy",

  matchesHeaders(rawHeaders: string[]): boolean {
    return REQUIRED.every((needle) => hasHeaderMatching(rawHeaders, needle));
  },

  resolveMapping(rawHeaders: string[]): ColumnMapping {
    const dateColumn = findHeader(rawHeaders, ["Tanggal Transaksi", "Tanggal"]) ?? "Tanggal Transaksi";
    const descriptionColumn = findHeader(rawHeaders, ["Keterangan"]) ?? "Keterangan";
    const amountColumn = findHeader(rawHeaders, ["Jumlah"]) ?? "Jumlah";
    const directionColumn = findHeader(rawHeaders, ["DB/CR", "DB CR", "DBCR"]) ?? "DB/CR";
    const balanceColumn = findHeader(rawHeaders, ["Saldo"]);

    return {
      amountMode: "amount_direction",
      dateFormat: "dd/MM/yyyy",
      dateColumn,
      descriptionColumn,
      amountColumn,
      directionColumn,
      balanceColumn,
    };
  },
};
