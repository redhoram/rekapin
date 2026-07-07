import type { StorageAdapter } from "./index";

/**
 * Vercel Blob adapter. Only constructed when BLOB_READ_WRITE_TOKEN is set.
 * `@vercel/blob` is imported dynamically so environments without the token never
 * pull it into the module graph at import time.
 */
export class VercelBlobAdapter implements StorageAdapter {
  async save(
    key: string,
    file: Buffer,
    contentType: string,
  ): Promise<{ url: string }> {
    const { put } = await import("@vercel/blob");
    const result = await put(key, file, {
      access: "public",
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
    });
    return { url: result.url };
  }

  async read(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Gagal membaca file dari storage (${response.status}).`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
