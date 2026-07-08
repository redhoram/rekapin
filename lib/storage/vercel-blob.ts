import type { StorageAdapter } from "./index";

/**
 * Vercel Blob adapter. Only constructed when BLOB_READ_WRITE_TOKEN is set.
 * `@vercel/blob` is imported dynamically so environments without the token never
 * pull it into the module graph at import time.
 *
 * Blobs are PRIVATE — these are raw bank statements. Reads go through the SDK
 * with the store token (a plain fetch on the URL would 403), so a leaked blob
 * URL exposes nothing.
 */
export class VercelBlobAdapter implements StorageAdapter {
  async save(
    key: string,
    file: Buffer,
    contentType: string,
  ): Promise<{ url: string }> {
    const { put } = await import("@vercel/blob");
    const result = await put(key, file, {
      access: "private",
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
    });
    return { url: result.url };
  }

  async read(url: string): Promise<Buffer> {
    const { get } = await import("@vercel/blob");
    const result = await get(url, {
      access: "private",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    if (!result || result.statusCode !== 200 || !result.stream) {
      throw new Error("Gagal membaca file dari storage.");
    }
    const arrayBuffer = await new Response(result.stream).arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
