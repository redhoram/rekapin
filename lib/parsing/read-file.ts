import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { RawRow } from "./types";

export interface ReadResult {
  headers: string[];
  rows: RawRow[];
  /** true when the CSV looked mis-encoded (replacement chars) even after retry. */
  encodingWarning: boolean;
}

/** Density of Unicode replacement chars above which we suspect wrong encoding. */
const REPLACEMENT_CHAR = "�";
const ENCODING_BAD_RATIO = 0.002; // 0.2% of chars mangled → likely wrong codepage

function replacementRatio(text: string): number {
  if (text.length === 0) return 0;
  let count = 0;
  for (const ch of text) if (ch === REPLACEMENT_CHAR) count++;
  return count / text.length;
}

/**
 * Decode a CSV buffer, preferring UTF-8 but falling back to latin1 when UTF-8
 * yields a suspicious density of replacement characters (legacy Windows-1252
 * exports). Returns the chosen text and whether garbling remains.
 */
function decodeCsv(buffer: Buffer): { text: string; encodingWarning: boolean } {
  const utf8 = buffer.toString("utf-8");
  const utf8Ratio = replacementRatio(utf8);
  if (utf8Ratio <= ENCODING_BAD_RATIO) {
    return { text: utf8, encodingWarning: false };
  }
  const latin1 = buffer.toString("latin1");
  const latin1Ratio = replacementRatio(latin1);
  // latin1 never produces replacement chars, so it usually "wins"; flag a
  // warning only if even latin1 still looks garbled (unrecoverable soft-fail).
  const chosen = latin1Ratio < utf8Ratio ? latin1 : utf8;
  return { text: chosen, encodingWarning: replacementRatio(chosen) > ENCODING_BAD_RATIO };
}

/** Coerce any cell value to a trimmed-safe string (never null/undefined). */
function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

/** Parse a CSV buffer into headers + string rows. */
export function readCsv(buffer: Buffer): ReadResult {
  const { text, encodingWarning } = decodeCsv(buffer);
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: "greedy",
  });
  const headers = (parsed.meta.fields ?? []).map((h) => cell(h));
  const rows: RawRow[] = [];
  for (const record of parsed.data) {
    const row: RawRow = {};
    let hasValue = false;
    for (const header of headers) {
      const v = cell(record[header]);
      row[header] = v;
      if (v.trim() !== "") hasValue = true;
    }
    if (hasValue) rows.push(row);
  }
  return { headers, rows, encodingWarning };
}

/** Parse an Excel (.xlsx/.xls) buffer's first sheet into headers + string rows. */
export function readXlsx(buffer: Buffer): ReadResult {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return { headers: [], rows: [], encodingWarning: false };
  const sheet = workbook.Sheets[firstSheetName];

  // header:1 → array-of-arrays so we control header extraction; dateNF makes
  // real date cells render as dd/mm/yyyy to match the Rekapin template.
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
    dateNF: "dd/mm/yyyy",
  });

  if (matrix.length === 0) return { headers: [], rows: [], encodingWarning: false };

  const headers = (matrix[0] ?? []).map((h) => cell(h));
  const rows: RawRow[] = [];
  for (let i = 1; i < matrix.length; i++) {
    const cells = matrix[i] ?? [];
    const row: RawRow = {};
    let hasValue = false;
    headers.forEach((header, col) => {
      const v = cell(cells[col]);
      row[header] = v;
      if (v.trim() !== "") hasValue = true;
    });
    if (hasValue) rows.push(row);
  }
  return { headers, rows, encodingWarning: false };
}

/** Read a file into headers + rows based on its extension. */
export function readFile(originalName: string, buffer: Buffer): ReadResult {
  const lower = originalName.toLowerCase();
  if (lower.endsWith(".csv")) return readCsv(buffer);
  return readXlsx(buffer);
}
