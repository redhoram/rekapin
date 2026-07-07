import { VercelBlobAdapter } from "./vercel-blob";
import { LocalFsAdapter } from "./local-fs";

/**
 * Write-and-read storage for the raw uploaded file (the audit trail). `read`
 * exists because commit/applyMapping re-derive rows server-side from the stored
 * file — the client-parsed rows are never trusted (spec Commit strategy).
 */
export interface StorageAdapter {
  /** Persist a file under `key`; returns a URL/path stored verbatim in uploads. */
  save(key: string, file: Buffer, contentType: string): Promise<{ url: string }>;
  /** Read back a previously-saved file by the url/path returned from save(). */
  read(url: string): Promise<Buffer>;
}

/**
 * Vercel Blob in production (BLOB_READ_WRITE_TOKEN set), local filesystem in
 * dev. A prod deploy without the token silently falls back to local FS (won't
 * persist across Vercel deploys) — acceptable until a Blob account exists (spec).
 */
export function getStorageAdapter(): StorageAdapter {
  return process.env.BLOB_READ_WRITE_TOKEN
    ? new VercelBlobAdapter()
    : new LocalFsAdapter();
}

/** Build the tenant-namespaced storage key for an upload. */
export function buildStorageKey(
  businessId: string,
  uploadId: string,
  originalName: string,
): string {
  const safeName = originalName.replace(/[^\w.\-]+/g, "_");
  return `${businessId}/${uploadId}/${safeName}`;
}
