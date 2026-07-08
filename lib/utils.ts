import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names, de-duplicating Tailwind conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format an integer Rupiah amount for display, e.g. 5000000 -> "Rp 5.000.000".
 * Money is always a plain integer (no decimals) per CLAUDE.md.
 */
export function formatRupiah(amount: number): string {
  return `Rp ${new Intl.NumberFormat("id-ID").format(amount)}`;
}

/**
 * Format an ISO calendar date (yyyy-MM-dd) as a short Indonesian date, e.g.
 * "2026-07-01" -> "1 Jul 2026". Parsed as UTC to avoid off-by-one drift. A
 * longer ISO timestamp is accepted too (only the date part is used).
 */
export function formatDateShort(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(dt);
}

/**
 * Compact Indonesian magnitude abbreviation for chart axis ticks + bar-end
 * labels (design §4.4). No "Rp" prefix (the tooltip carries the full value):
 *   1_200_000_000 -> "1,2 M"   (miliar)
 *      12_500_000 -> "12,5 jt" (juta)
 *          45_000 -> "45 rb"   (ribu)
 *             500 -> "500"
 * Negative values are prefixed with U+2212 (real minus, never a hyphen).
 */
export function formatRupiahShort(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  const fmt = (v: number) =>
    new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(v);
  if (abs >= 1e9) return `${sign}${fmt(abs / 1e9)} M`;
  if (abs >= 1e6) return `${sign}${fmt(abs / 1e6)} jt`;
  if (abs >= 1e3) return `${sign}${fmt(abs / 1e3)} rb`;
  return `${sign}${fmt(abs)}`;
}

/**
 * Format a raw digit string with Indonesian thousand separators, e.g.
 * "5000000" -> "5.000.000". Empty input returns "".
 */
export function formatThousands(digits: string): string {
  const cleaned = digits.replace(/\D/g, "");
  if (cleaned === "") return "";
  return new Intl.NumberFormat("id-ID").format(parseInt(cleaned, 10));
}

/** Two-letter uppercase initials from a name, e.g. "Budi Santoso" -> "BS". */
export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
