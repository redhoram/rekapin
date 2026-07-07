// Shared types for the parsing pipeline (read → detect → normalize → dedup →
// preview). Everything here is pure/serializable so it crosses the server-action
// boundary and is fully unit-testable.

/** One raw file row keyed by its (verbatim) header name. All values are strings. */
export type RawRow = Record<string, string>;

/** How amount + direction are encoded in the source file. */
export type AmountMode = "signed" | "debit_credit" | "amount_direction";

/** Date formats offered by the mapping wizard / used by presets. */
export type DateFormat = "dd/MM/yyyy" | "yyyy-MM-dd" | "MM/dd/yyyy";

/** in = money received (masuk), out = money spent (keluar). */
export type Direction = "in" | "out";

/**
 * A concrete column mapping. Column fields hold the ACTUAL header strings found
 * in the file (presets resolve their canonical names against real headers), so
 * normalization can look values up directly in a RawRow.
 */
export interface ColumnMapping {
  amountMode: AmountMode;
  dateColumn: string;
  descriptionColumn: string;
  dateFormat: DateFormat;
  // amountMode === "signed"
  amountColumn?: string;
  // amountMode === "debit_credit"
  debitColumn?: string;
  creditColumn?: string;
  // amountMode === "amount_direction"
  directionColumn?: string;
  // Optional, ignored for parsing — reference only.
  balanceColumn?: string | null;
}

/** A bank preset in the registry. Adding a bank later = one new file + one line. */
export interface BankPreset {
  code: string;
  label: string;
  /** case/whitespace-insensitive header match. */
  matchesHeaders(rawHeaders: string[]): boolean;
  /** Build a concrete mapping against the file's actual headers. */
  resolveMapping(rawHeaders: string[]): ColumnMapping;
  dateFormat: DateFormat;
}

/** A successfully normalized row, before dedup hashing. */
export interface NormalizedRow {
  rowNumber: number; // 1-based data-row index (excludes the header row)
  date: string; // ISO yyyy-MM-dd
  description: string; // original, as-parsed (for display)
  amount: number; // positive integer Rupiah (magnitude only)
  direction: Direction;
  normalizedDescription: string; // feeds the dedup hash
}

/** A normalized row with its dedup hash attached. */
export interface HashedRow extends NormalizedRow {
  dedupHash: string;
}

/** A row that could not be parsed, with a human-readable Indonesian reason. */
export interface FailedRow {
  rowNumber: number;
  reason: string;
  // Best-effort description (mapped column value) for display in the preview.
  description: string;
  // Best-effort raw snapshot for context (may be partial).
  raw: RawRow;
}

export type RowStatus = "valid" | "duplicate" | "failed";

/** A row rendered in the preview table (display-only, capped set). */
export interface PreviewRow {
  rowNumber: number;
  status: RowStatus;
  date: string | null; // null when the row failed before a date was parsed
  description: string;
  amount: number | null;
  direction: Direction | null;
  reason?: string; // failed rows
  dupAgainstDb?: boolean; // duplicate rows: true = already in DB, false = in-file
}

/** Full preview payload returned to the client after parse / applyMapping. */
export interface PreviewPayload {
  uploadId: string;
  fileName: string;
  presetUsed: string | null; // e.g. "BCA"; null when template/manual mapping used
  usedManualMapping: boolean; // true when the mapping wizard produced the mapping
  bankAccountId: string;
  rowCount: number; // data rows considered (excludes skipped example rows)
  validCount: number;
  duplicateCount: number;
  failedCount: number;
  skippedExampleCount: number; // rows whose Deskripsi starts with "Contoh:"
  dateRange: { min: string; max: string } | null;
  totalIn: number;
  totalOut: number;
  rows: PreviewRow[]; // capped + prioritized (Gagal → Duplikat → Valid)
  encodingWarning: boolean;
}

/** Illustrative 5-row sample for the mapping wizard's live preview. */
export interface WizardSampleRow {
  date: string | null;
  description: string;
  amount: number | null;
  direction: Direction | null;
}
