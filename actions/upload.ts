"use server";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { bankAccounts, transactions, uploads } from "@/lib/db/schema";
import { requireRole } from "@/lib/session";
import {
  MAX_UPLOAD_SIZE_BYTES,
  ACCEPTED_UPLOAD_EXTENSIONS,
  type Role,
} from "@/lib/constants";
import { getStorageAdapter, buildStorageKey } from "@/lib/storage";
import { readFile } from "@/lib/parsing/read-file";
import { detectPreset } from "@/lib/parsing/presets/registry";
import { matchesTemplateHeaders, templateMapping } from "@/lib/parsing/template";
import { hashRawRows, assembleResult, type PipelineResult } from "@/lib/parsing/pipeline";
import type {
  ColumnMapping,
  PreviewPayload,
  RawRow,
} from "@/lib/parsing/types";

// ---------------------------------------------------------------------------
// Result types (consumed by the client via `import type`)
// ---------------------------------------------------------------------------

export type ParseUploadResult =
  // Recoverable validation error — stay on landing, show AlertStrip, retry.
  | { status: "error"; message: string }
  // Hard file-level failure — show the dedicated error screen.
  | { status: "file_error"; message: string }
  // No preset/template/saved mapping — open the mapping wizard.
  | {
      status: "needs_mapping";
      uploadId: string;
      fileName: string;
      bankAccountId: string;
      rawHeaders: string[];
      sampleRows: RawRow[];
    }
  // Detected/reused mapping — straight to preview.
  | { status: "preview"; preview: PreviewPayload };

export type ApplyMappingResult =
  | { status: "error"; message: string }
  | { status: "preview"; preview: PreviewPayload };

export type CommitResult =
  | { ok: false; error: string }
  | { ok: true; insertedCount: number; bankLabel: string };

export type UndoResult =
  | { ok: false; error: string }
  | { ok: true; deletedCount: number };

export interface UploadHistoryItem {
  id: string;
  originalName: string;
  status: "pending" | "parsed" | "committed" | "undone" | "failed";
  rowCount: number;
  transactionCount: number;
  createdAt: string; // ISO
  uploadedBy: string;
  bankAccountId: string | null;
  bankLabel: string | null;
  bankCode: string | null;
  hasEditedRows: boolean;
}

export interface ListUploadsResult {
  uploads: UploadHistoryItem[];
  currentUserId: string;
  role: Role;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const columnMappingSchema = z
  .object({
    amountMode: z.enum(["signed", "debit_credit", "amount_direction"]),
    dateColumn: z.string().min(1),
    descriptionColumn: z.string().min(1),
    dateFormat: z.enum(["dd/MM/yyyy", "yyyy-MM-dd", "MM/dd/yyyy"]),
    amountColumn: z.string().optional(),
    debitColumn: z.string().optional(),
    creditColumn: z.string().optional(),
    directionColumn: z.string().optional(),
    balanceColumn: z.string().nullable().optional(),
  })
  .superRefine((m, ctx) => {
    const need = (field: keyof ColumnMapping) => {
      if (!m[field]) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Kolom ${field} belum dipetakan.` });
      }
    };
    if (m.amountMode === "signed") need("amountColumn");
    if (m.amountMode === "amount_direction") {
      need("amountColumn");
      need("directionColumn");
    }
    if (m.amountMode === "debit_credit") {
      need("debitColumn");
      need("creditColumn");
    }
  });

function validateFileMeta(name: string, size: number): string | null {
  if (size > MAX_UPLOAD_SIZE_BYTES) {
    const mb = (size / 1024 / 1024).toFixed(1);
    return `File terlalu besar (${mb} MB). Maksimal 10 MB.`;
  }
  const lower = name.toLowerCase();
  if (!ACCEPTED_UPLOAD_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    return "Format tidak didukung. Unggah file .csv, .xlsx, atau .xls.";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loadOwnedAccount(businessId: string, bankAccountId: string) {
  const [acc] = await db
    .select()
    .from(bankAccounts)
    .where(and(eq(bankAccounts.id, bankAccountId), eq(bankAccounts.businessId, businessId)))
    .limit(1);
  return acc ?? null;
}

/** Query which of the given hashes already exist in the DB for this business. */
async function fetchExistingHashes(
  businessId: string,
  hashes: string[],
): Promise<Set<string>> {
  const set = new Set<string>();
  if (hashes.length === 0) return set;
  const unique = Array.from(new Set(hashes));
  const CHUNK = 1000;
  for (let i = 0; i < unique.length; i += CHUNK) {
    const slice = unique.slice(i, i + CHUNK);
    const rows = await db
      .select({ h: transactions.dedupHash })
      .from(transactions)
      .where(
        and(eq(transactions.businessId, businessId), inArray(transactions.dedupHash, slice)),
      );
    for (const r of rows) set.add(r.h);
  }
  return set;
}

function toPreviewPayload(
  result: PipelineResult,
  meta: {
    uploadId: string;
    fileName: string;
    presetUsed: string | null;
    usedManualMapping: boolean;
    bankAccountId: string;
    encodingWarning: boolean;
  },
): PreviewPayload {
  return {
    uploadId: meta.uploadId,
    fileName: meta.fileName,
    presetUsed: meta.presetUsed,
    usedManualMapping: meta.usedManualMapping,
    bankAccountId: meta.bankAccountId,
    rowCount: result.rowCount,
    validCount: result.validCount,
    duplicateCount: result.duplicateCount,
    failedCount: result.failedCount,
    skippedExampleCount: result.skippedExampleCount,
    dateRange: result.dateRange,
    totalIn: result.totalIn,
    totalOut: result.totalOut,
    rows: result.previewRows,
    encodingWarning: meta.encodingWarning,
  };
}

/** Run the pipeline against a stored file + mapping. */
async function runAgainstStoredFile(
  blobUrl: string,
  originalName: string,
  mapping: ColumnMapping,
  businessId: string,
  bankAccountId: string,
): Promise<PipelineResult> {
  const adapter = getStorageAdapter();
  const buffer = await adapter.read(blobUrl);
  const { rows } = readFile(originalName, buffer);
  const hashed = hashRawRows(rows, mapping, businessId, bankAccountId);
  const existing = await fetchExistingHashes(
    businessId,
    hashed.hashed.map((h) => h.dedupHash),
  );
  return assembleResult(hashed, existing);
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Validate + store an uploaded file, then read/detect/normalize/dedup and return
 * a preview — or a "needs mapping" signal when no preset/template/saved mapping
 * applies. admin + staff.
 */
export async function parseUpload(formData: FormData): Promise<ParseUploadResult> {
  const { userId, businessId } = await requireRole(["admin", "staff"]);

  const file = formData.get("file");
  const bankAccountId = String(formData.get("bankAccountId") ?? "");

  if (!(file instanceof File)) {
    return { status: "error", message: "Tidak ada file yang diunggah." };
  }
  const metaError = validateFileMeta(file.name, file.size);
  if (metaError) return { status: "error", message: metaError };

  if (!bankAccountId) {
    return { status: "error", message: "Pilih rekening tujuan dulu." };
  }
  const account = await loadOwnedAccount(businessId, bankAccountId);
  if (!account) {
    return { status: "error", message: "Rekening tidak ditemukan." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploadId = crypto.randomUUID();

  // Store the raw file (write-once audit trail) before parsing.
  const adapter = getStorageAdapter();
  let blobUrl: string;
  try {
    const key = buildStorageKey(businessId, uploadId, file.name);
    const saved = await adapter.save(key, buffer, file.type || "application/octet-stream");
    blobUrl = saved.url;
  } catch {
    return { status: "error", message: "Gagal menyimpan file. Coba lagi." };
  }

  await db.insert(uploads).values({
    id: uploadId,
    businessId,
    bankAccountId,
    uploadedBy: userId,
    blobUrl,
    originalName: file.name,
    fileSize: file.size,
    status: "pending",
  });

  // Read the file.
  let headers: string[];
  let rows: RawRow[];
  let encodingWarning = false;
  try {
    const read = readFile(file.name, buffer);
    headers = read.headers;
    rows = read.rows;
    encodingWarning = read.encodingWarning;
  } catch {
    await db.update(uploads).set({ status: "failed" }).where(eq(uploads.id, uploadId));
    return {
      status: "file_error",
      message: "File rusak atau formatnya tidak dikenali. Coba ekspor ulang dari bank.",
    };
  }

  if (rows.length === 0) {
    await db.update(uploads).set({ status: "failed" }).where(eq(uploads.id, uploadId));
    return {
      status: "file_error",
      message:
        "File tidak berisi data transaksi. Pastikan ada baris di bawah baris judul kolom.",
    };
  }

  // Resolve a mapping: preset → template → saved-per-account → wizard.
  const preset = detectPreset(headers);
  let mapping: ColumnMapping | null = null;
  let presetUsed: string | null = null;
  let usedManualMapping = false;

  if (preset) {
    mapping = preset.resolveMapping(headers);
    presetUsed = preset.code;
  } else if (matchesTemplateHeaders(headers)) {
    mapping = templateMapping(headers);
  } else if (account.savedColumnMapping) {
    mapping = account.savedColumnMapping;
  }

  if (!mapping) {
    // Needs the mapping wizard. Keep upload "pending" until a mapping is applied.
    return {
      status: "needs_mapping",
      uploadId,
      fileName: file.name,
      bankAccountId,
      rawHeaders: headers,
      sampleRows: rows.slice(0, 5),
    };
  }

  const hashed = hashRawRows(rows, mapping, businessId, bankAccountId);
  const existing = await fetchExistingHashes(
    businessId,
    hashed.hashed.map((h) => h.dedupHash),
  );
  const result = assembleResult(hashed, existing);

  await db
    .update(uploads)
    .set({
      status: "parsed",
      columnMapping: mapping,
      presetUsed,
      rowCount: result.rowCount,
      skippedDupeCount: result.duplicateCount,
      failedRowCount: result.failedCount,
    })
    .where(eq(uploads.id, uploadId));

  return {
    status: "preview",
    preview: toPreviewPayload(result, {
      uploadId,
      fileName: file.name,
      presetUsed,
      usedManualMapping,
      bankAccountId,
      encodingWarning,
    }),
  };
}

/**
 * Re-normalize a stored upload with a wizard-built mapping (server is the source
 * of truth — client-normalized rows are never trusted). Persists the mapping to
 * the account so future uploads skip the wizard. admin + staff.
 */
export async function applyMapping(
  uploadId: string,
  mappingInput: ColumnMapping,
  bankAccountId: string,
): Promise<ApplyMappingResult> {
  const { businessId } = await requireRole(["admin", "staff"]);

  const parsed = columnMappingSchema.safeParse(mappingInput);
  if (!parsed.success) {
    return { status: "error", message: "Pemetaan kolom belum lengkap." };
  }
  const mapping = parsed.data as ColumnMapping;

  const [upload] = await db
    .select()
    .from(uploads)
    .where(and(eq(uploads.id, uploadId), eq(uploads.businessId, businessId)))
    .limit(1);
  if (!upload) return { status: "error", message: "Upload tidak ditemukan." };
  if (upload.status === "committed") {
    return { status: "error", message: "Upload ini sudah disimpan." };
  }

  const account = await loadOwnedAccount(businessId, bankAccountId);
  if (!account) return { status: "error", message: "Rekening tidak ditemukan." };

  let result: PipelineResult;
  try {
    result = await runAgainstStoredFile(
      upload.blobUrl,
      upload.originalName,
      mapping,
      businessId,
      bankAccountId,
    );
  } catch {
    return { status: "error", message: "Gagal membaca file. Coba unggah ulang." };
  }

  // Persist the mapping per account + snapshot on the upload.
  await db
    .update(bankAccounts)
    .set({ savedColumnMapping: mapping })
    .where(and(eq(bankAccounts.id, bankAccountId), eq(bankAccounts.businessId, businessId)));

  await db
    .update(uploads)
    .set({
      status: "parsed",
      bankAccountId,
      columnMapping: mapping,
      presetUsed: null,
      rowCount: result.rowCount,
      skippedDupeCount: result.duplicateCount,
      failedRowCount: result.failedCount,
    })
    .where(eq(uploads.id, uploadId));

  return {
    status: "preview",
    preview: toPreviewPayload(result, {
      uploadId,
      fileName: upload.originalName,
      presetUsed: null,
      usedManualMapping: true,
      bankAccountId,
      encodingWarning: false,
    }),
  };
}

/**
 * Commit a parsed upload: re-derive insertable rows server-side and insert them
 * as transactions (single multi-row INSERT ... ON CONFLICT DO NOTHING, chunked).
 * Idempotent — safe to re-run. admin + staff.
 */
export async function commitUpload(
  uploadId: string,
  bankAccountId: string,
): Promise<CommitResult> {
  const { userId, businessId } = await requireRole(["admin", "staff"]);

  const [upload] = await db
    .select()
    .from(uploads)
    .where(and(eq(uploads.id, uploadId), eq(uploads.businessId, businessId)))
    .limit(1);
  if (!upload) return { ok: false, error: "Upload tidak ditemukan." };

  const targetAccountId = upload.bankAccountId ?? bankAccountId;
  if (!targetAccountId) {
    return { ok: false, error: "Pilih rekening tujuan dulu." };
  }
  const account = await loadOwnedAccount(businessId, targetAccountId);
  if (!account) return { ok: false, error: "Rekening tidak ditemukan." };
  const bankLabel = `${account.bankCode} · ${account.label}`;

  // Idempotent double-commit guard.
  if (upload.status === "committed") {
    return { ok: true, insertedCount: 0, bankLabel };
  }
  if (upload.status !== "parsed" || !upload.columnMapping) {
    return { ok: false, error: "Upload belum siap disimpan." };
  }

  let result: PipelineResult;
  try {
    result = await runAgainstStoredFile(
      upload.blobUrl,
      upload.originalName,
      upload.columnMapping,
      businessId,
      targetAccountId,
    );
  } catch {
    return { ok: false, error: "Gagal membaca file. Coba unggah ulang." };
  }

  let insertedCount = 0;
  const CHUNK = 500;
  for (let i = 0; i < result.insertableRows.length; i += CHUNK) {
    const slice = result.insertableRows.slice(i, i + CHUNK);
    const values = slice.map((row) => ({
      businessId,
      bankAccountId: targetAccountId,
      uploadId,
      date: new Date(`${row.date}T00:00:00.000Z`),
      description: row.description,
      amount: row.amount,
      direction: row.direction,
      dedupHash: row.dedupHash,
      source: "import" as const,
      reviewStatus: "needs_review" as const,
      createdBy: userId,
    }));
    const inserted = await db
      .insert(transactions)
      .values(values)
      .onConflictDoNothing({
        target: [transactions.businessId, transactions.dedupHash],
      })
      .returning({ id: transactions.id });
    insertedCount += inserted.length;
  }

  await db
    .update(uploads)
    .set({
      status: "committed",
      committedAt: new Date(),
      bankAccountId: targetAccountId,
      rowCount: result.rowCount,
      skippedDupeCount: result.duplicateCount,
      failedRowCount: result.failedCount,
    })
    .where(eq(uploads.id, uploadId));

  return { ok: true, insertedCount, bankLabel };
}

/**
 * Undo a committed batch: delete its transactions and mark the upload undone.
 * Role: admin can undo any batch; staff only their own (uploadedBy === userId).
 * Blocked if any transaction in the batch was edited manually. Idempotent.
 */
export async function undoUpload(uploadId: string): Promise<UndoResult> {
  const { userId, businessId, role } = await requireRole(["admin", "staff"]);

  const [upload] = await db
    .select()
    .from(uploads)
    .where(and(eq(uploads.id, uploadId), eq(uploads.businessId, businessId)))
    .limit(1);
  if (!upload) return { ok: false, error: "Upload tidak ditemukan." };

  if (role !== "admin" && upload.uploadedBy !== userId) {
    return {
      ok: false,
      error: "Kamu hanya bisa membatalkan batch milikmu sendiri.",
    };
  }
  if (upload.status !== "committed") {
    return { ok: false, error: "Batch ini tidak bisa dibatalkan." };
  }

  const [{ editedCount }] = await db
    .select({ editedCount: sql<number>`count(*)::int` })
    .from(transactions)
    .where(
      and(
        eq(transactions.uploadId, uploadId),
        eq(transactions.businessId, businessId),
        eq(transactions.editedManually, true),
      ),
    );
  if (editedCount > 0) {
    return {
      ok: false,
      error: "Ada transaksi yang sudah diedit — tidak bisa dibatalkan.",
    };
  }

  const deleted = await db
    .delete(transactions)
    .where(
      and(eq(transactions.uploadId, uploadId), eq(transactions.businessId, businessId)),
    )
    .returning({ id: transactions.id });

  await db
    .update(uploads)
    .set({ status: "undone", undoneAt: new Date() })
    .where(eq(uploads.id, uploadId));

  return { ok: true, deletedCount: deleted.length };
}

/** Recent uploads for the business (history list). admin + staff. */
export async function listUploads(): Promise<ListUploadsResult> {
  const { userId, businessId, role } = await requireRole(["admin", "staff"]);

  const rows = await db
    .select({
      id: uploads.id,
      originalName: uploads.originalName,
      status: uploads.status,
      rowCount: uploads.rowCount,
      createdAt: uploads.createdAt,
      uploadedBy: uploads.uploadedBy,
      bankAccountId: uploads.bankAccountId,
      bankLabel: bankAccounts.label,
      bankCode: bankAccounts.bankCode,
    })
    .from(uploads)
    .leftJoin(bankAccounts, eq(uploads.bankAccountId, bankAccounts.id))
    .where(eq(uploads.businessId, businessId))
    .orderBy(desc(uploads.createdAt))
    .limit(25);

  // Actual committed transaction counts + edited flags, per upload.
  const countRows = await db
    .select({
      uploadId: transactions.uploadId,
      total: sql<number>`count(*)::int`,
      edited: sql<number>`count(*) filter (where ${transactions.editedManually})::int`,
    })
    .from(transactions)
    .where(eq(transactions.businessId, businessId))
    .groupBy(transactions.uploadId);

  const countMap = new Map<string, { total: number; edited: number }>();
  for (const c of countRows) {
    if (c.uploadId) countMap.set(c.uploadId, { total: c.total, edited: c.edited });
  }

  const items: UploadHistoryItem[] = rows.map((r) => {
    const counts = countMap.get(r.id);
    return {
      id: r.id,
      originalName: r.originalName,
      status: r.status,
      rowCount: r.rowCount,
      transactionCount: counts?.total ?? 0,
      createdAt: r.createdAt.toISOString(),
      uploadedBy: r.uploadedBy,
      bankAccountId: r.bankAccountId,
      bankLabel: r.bankLabel,
      bankCode: r.bankCode,
      hasEditedRows: (counts?.edited ?? 0) > 0,
    };
  });

  return { uploads: items, currentUserId: userId, role };
}
