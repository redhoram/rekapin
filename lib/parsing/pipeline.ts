import type {
  ColumnMapping,
  FailedRow,
  HashedRow,
  PreviewRow,
  RawRow,
} from "./types";
import { normalizeRows } from "./normalize";
import { attachHashes, partitionDedup } from "./dedup";

/** Max rows rendered in the preview table (design §C4). */
export const PREVIEW_ROW_CAP = 50;

export interface HashRawResult {
  hashed: HashedRow[];
  failed: FailedRow[];
  skippedExampleCount: number;
}

/**
 * Normalize + hash raw rows (no dedup yet). Separated so the server can compute
 * hashes, query the DB for which already exist, then assemble — without
 * normalizing twice.
 */
export function hashRawRows(
  rawRows: RawRow[],
  mapping: ColumnMapping,
  businessId: string,
  bankAccountId: string,
): HashRawResult {
  const { normalized, failed, skippedExampleCount } = normalizeRows(rawRows, mapping);
  return {
    hashed: attachHashes(normalized, businessId, bankAccountId),
    failed,
    skippedExampleCount,
  };
}

export interface PipelineResult {
  rowCount: number; // data rows considered (excludes skipped example rows)
  skippedExampleCount: number;
  validCount: number;
  duplicateCount: number;
  failedCount: number;
  totalIn: number;
  totalOut: number;
  dateRange: { min: string; max: string } | null;
  /** In-file-deduped, not-already-in-DB rows — the exact set commit inserts. */
  insertableRows: HashedRow[];
  /** Capped + prioritized (Gagal → Duplikat → Valid) rows for display. */
  previewRows: PreviewRow[];
}

/** Dedup, aggregate stats, and build the capped preview from hashed rows. */
export function assembleResult(
  input: HashRawResult,
  existingHashes: ReadonlySet<string>,
): PipelineResult {
  const { hashed, failed, skippedExampleCount } = input;
  const { insertable, duplicates } = partitionDedup(hashed, existingHashes);

  let totalIn = 0;
  let totalOut = 0;
  let min: string | null = null;
  let max: string | null = null;
  for (const row of insertable) {
    if (row.direction === "in") totalIn += row.amount;
    else totalOut += row.amount;
    if (min === null || row.date < min) min = row.date;
    if (max === null || row.date > max) max = row.date;
  }

  // Preview rows: problems first (Gagal → Duplikat → Valid), then cap.
  const previewRows: PreviewRow[] = [];
  for (const f of failed) {
    previewRows.push({
      rowNumber: f.rowNumber,
      status: "failed",
      date: null,
      description: f.description,
      amount: null,
      direction: null,
      reason: f.reason,
    });
  }
  for (const d of duplicates) {
    previewRows.push({
      rowNumber: d.row.rowNumber,
      status: "duplicate",
      date: d.row.date,
      description: d.row.description,
      amount: d.row.amount,
      direction: d.row.direction,
      dupAgainstDb: d.againstDb,
    });
  }
  for (const v of insertable) {
    previewRows.push({
      rowNumber: v.rowNumber,
      status: "valid",
      date: v.date,
      description: v.description,
      amount: v.amount,
      direction: v.direction,
    });
  }

  return {
    rowCount: input.hashed.length + failed.length,
    skippedExampleCount,
    validCount: insertable.length,
    duplicateCount: duplicates.length,
    failedCount: failed.length,
    totalIn,
    totalOut,
    dateRange: min !== null && max !== null ? { min, max } : null,
    insertableRows: insertable,
    previewRows: previewRows.slice(0, PREVIEW_ROW_CAP),
  };
}

export interface RunPipelineInput {
  rawRows: RawRow[];
  mapping: ColumnMapping;
  businessId: string;
  bankAccountId: string;
  /** Dedup hashes already present in the DB for this business. */
  existingHashes: ReadonlySet<string>;
}

/**
 * Pure end-to-end pipeline: raw rows + resolved mapping → normalized, hashed,
 * deduped, with preview stats. Convenience wrapper over hashRawRows +
 * assembleResult for tests and one-shot callers.
 */
export function runPipeline(input: RunPipelineInput): PipelineResult {
  const hashed = hashRawRows(
    input.rawRows,
    input.mapping,
    input.businessId,
    input.bankAccountId,
  );
  return assembleResult(hashed, input.existingHashes);
}
