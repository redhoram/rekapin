import type { ResolvedPeriod } from "../types";

/**
 * Server-owned export filename helpers. The download filename is built here (not
 * client-side) so the periodSlug/accountSlug can never drift from the workbook
 * content. Pattern: rekapin-{slug}-{periodSlug}[-{accountSlug}].xlsx.
 */

function quarterOf(month: number): number {
  return Math.floor((month - 1) / 3) + 1;
}

/**
 * A compact, filename-safe slug for a period:
 *   month   -> "2026-07"
 *   quarter -> "2026-Q3"
 *   year    -> "2026"
 *   custom  -> "2026-07-01_2026-07-15"
 */
export function periodSlug(period: ResolvedPeriod): string {
  const year = period.start.slice(0, 4);
  switch (period.preset) {
    case "month":
      return `${year}-${period.start.slice(5, 7)}`;
    case "quarter": {
      const month = Number(period.start.slice(5, 7));
      return `${year}-Q${quarterOf(month)}`;
    }
    case "year":
      return year;
    case "custom":
    default:
      return `${period.start}_${period.end}`;
  }
}

/** Lowercase, spaces -> dashes, strip anything not [a-z0-9-]. */
export function accountSlug(label: string): string {
  return label
    .toLowerCase()
    .replace(/[·•]/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/**
 * Full download filename, e.g. "rekapin-laba-rugi-2026-07.xlsx". `accountLabel`
 * (Buku Kas per-account only) appends its slug: "...-2026-07-bca-operasional.xlsx".
 */
export function reportExportFilename(
  slug: "laba-rugi" | "arus-kas" | "buku-kas",
  period: ResolvedPeriod,
  accountLabel?: string,
): string {
  const acct = accountLabel ? `-${accountSlug(accountLabel)}` : "";
  return `rekapin-${slug}-${periodSlug(period)}${acct}.xlsx`;
}
