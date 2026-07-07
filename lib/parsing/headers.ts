// Header-matching helpers shared by the preset registry and the template
// detector. Matching is case-insensitive and whitespace-tolerant so real-world
// exports (trailing spaces, casing) still resolve to the right column.

/** Lowercase, trim, collapse internal whitespace. */
export function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, " ");
}

/** True if `header`, normalized, contains the normalized `candidate`. */
export function headerContains(header: string, candidate: string): boolean {
  return normalizeHeader(header).includes(normalizeHeader(candidate));
}

/** True if any header contains the candidate token. */
export function hasHeaderMatching(headers: string[], candidate: string): boolean {
  return headers.some((h) => headerContains(h, candidate));
}

/**
 * Return the first actual header string that matches one of `candidates`
 * (exact-normalized first, then contains), or null if none match. Exact match
 * is preferred so "Tanggal" doesn't get shadowed by "Tanggal Transaksi".
 */
export function findHeader(headers: string[], candidates: string[]): string | null {
  for (const candidate of candidates) {
    const target = normalizeHeader(candidate);
    const exact = headers.find((h) => normalizeHeader(h) === target);
    if (exact) return exact;
  }
  for (const candidate of candidates) {
    const hit = headers.find((h) => headerContains(h, candidate));
    if (hit) return hit;
  }
  return null;
}
