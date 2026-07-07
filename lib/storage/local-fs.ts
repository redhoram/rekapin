import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { StorageAdapter } from "./index";

/**
 * Local filesystem adapter (dev fallback when no Blob token). Writes under
 * UPLOAD_STORAGE_DIR (default ".data/uploads", gitignored). The returned `url`
 * is an absolute filesystem path stored verbatim in uploads.blobUrl — it is an
 * audit artifact, never served to the browser.
 */
export class LocalFsAdapter implements StorageAdapter {
  private baseDir(): string {
    return resolve(process.env.UPLOAD_STORAGE_DIR ?? ".data/uploads");
  }

  async save(key: string, file: Buffer): Promise<{ url: string }> {
    const fullPath = join(this.baseDir(), key);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, file);
    return { url: fullPath };
  }

  async read(url: string): Promise<Buffer> {
    return readFile(url);
  }
}
