import { createHash } from "node:crypto";
import type { Direction, HashedRow, NormalizedRow } from "./types";

/**
 * Normalize a description for hashing (spec "Dedup hash — exact algorithm").
 * Order matters and is part of the contract: trim → lowercase → collapse
 * whitespace → strip punctuation (keep letters/digits/space, unicode-aware).
 */
export function normalizeDescriptionForHash(description: string): string {
  return description
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N} ]/gu, "");
}

/**
 * Compute a per-row dedup hash. Scoped by businessId + bankAccountId so the
 * DB unique index (businessId, dedupHash) keeps tenants isolated. Computed
 * identically at parse time and commit time — this is the single source of truth.
 */
export function computeDedupHash(input: {
  businessId: string;
  bankAccountId: string;
  date: string; // ISO yyyy-MM-dd
  amount: number; // integer magnitude
  direction: Direction;
  normalizedDescription: string;
}): string {
  const payload = [
    input.businessId,
    input.bankAccountId,
    input.date,
    String(input.amount),
    input.direction,
    input.normalizedDescription,
  ].join("|");
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

/** Attach dedup hashes to normalized rows for a given business + account. */
export function attachHashes(
  rows: NormalizedRow[],
  businessId: string,
  bankAccountId: string,
): HashedRow[] {
  return rows.map((row) => ({
    ...row,
    dedupHash: computeDedupHash({
      businessId,
      bankAccountId,
      date: row.date,
      amount: row.amount,
      direction: row.direction,
      normalizedDescription: row.normalizedDescription,
    }),
  }));
}

export interface DuplicateRow {
  row: HashedRow;
  /** true = collides with an existing DB row; false = collides within this file. */
  againstDb: boolean;
}

export interface PartitionResult {
  /** First occurrence of each new hash, not already in the DB — safe to insert. */
  insertable: HashedRow[];
  duplicates: DuplicateRow[];
}

/**
 * Split hashed rows into insertable vs duplicate. A row is a duplicate if its
 * hash already exists in the DB (againstDb) or was already seen earlier in this
 * same file (in-file, first occurrence kept). Order of `rows` is preserved.
 */
export function partitionDedup(
  rows: HashedRow[],
  existingHashes: ReadonlySet<string>,
): PartitionResult {
  const insertable: HashedRow[] = [];
  const duplicates: DuplicateRow[] = [];
  const seenInFile = new Set<string>();

  for (const row of rows) {
    if (existingHashes.has(row.dedupHash)) {
      duplicates.push({ row, againstDb: true });
      continue;
    }
    if (seenInFile.has(row.dedupHash)) {
      duplicates.push({ row, againstDb: false });
      continue;
    }
    seenInFile.add(row.dedupHash);
    insertable.push(row);
  }

  return { insertable, duplicates };
}
