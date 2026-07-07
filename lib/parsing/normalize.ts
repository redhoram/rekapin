import type { ColumnMapping, FailedRow, NormalizedRow, RawRow } from "./types";
import { parseDate, resolveAmountAndDirection } from "./fields";
import { normalizeDescriptionForHash } from "./dedup";

export type { ParseResult } from "./fields";

/** Rows whose Deskripsi starts with this marker are skipped (template example). */
const EXAMPLE_MARKER = "contoh:";

export type RowOutcome =
  | { kind: "normalized"; row: NormalizedRow }
  | { kind: "failed"; failed: FailedRow }
  | { kind: "skipped_example" };

/**
 * Normalize a single raw row using the resolved mapping. Returns a normalized
 * row, a failed row (with an Indonesian reason), or a skip for the template's
 * "Contoh:" example row.
 */
export function normalizeRow(
  raw: RawRow,
  mapping: ColumnMapping,
  rowNumber: number,
): RowOutcome {
  const description = (raw[mapping.descriptionColumn] ?? "").trim();

  if (description.toLowerCase().startsWith(EXAMPLE_MARKER)) {
    return { kind: "skipped_example" };
  }

  const dateResult = parseDate(raw[mapping.dateColumn] ?? "", mapping.dateFormat);
  if (!dateResult.ok) {
    return {
      kind: "failed",
      failed: { rowNumber, reason: dateResult.reason, description, raw },
    };
  }

  const amountResult = resolveAmountAndDirection(raw, mapping);
  if (!amountResult.ok) {
    return {
      kind: "failed",
      failed: { rowNumber, reason: amountResult.reason, description, raw },
    };
  }

  const { amount, direction } = amountResult.value;
  if (amount <= 0) {
    return {
      kind: "failed",
      failed: {
        rowNumber,
        reason: "Jumlah harus lebih besar dari nol",
        description,
        raw,
      },
    };
  }

  if (description === "") {
    return {
      kind: "failed",
      failed: { rowNumber, reason: "Deskripsi kosong", description, raw },
    };
  }

  return {
    kind: "normalized",
    row: {
      rowNumber,
      date: dateResult.value,
      description,
      amount,
      direction,
      normalizedDescription: normalizeDescriptionForHash(description),
    },
  };
}

export interface NormalizeResult {
  normalized: NormalizedRow[];
  failed: FailedRow[];
  skippedExampleCount: number;
}

/** Normalize every raw row, bucketing into normalized / failed / skipped. */
export function normalizeRows(
  rawRows: RawRow[],
  mapping: ColumnMapping,
): NormalizeResult {
  const normalized: NormalizedRow[] = [];
  const failed: FailedRow[] = [];
  let skippedExampleCount = 0;

  rawRows.forEach((raw, index) => {
    const outcome = normalizeRow(raw, mapping, index + 1);
    if (outcome.kind === "normalized") normalized.push(outcome.row);
    else if (outcome.kind === "failed") failed.push(outcome.failed);
    else skippedExampleCount++;
  });

  return { normalized, failed, skippedExampleCount };
}
