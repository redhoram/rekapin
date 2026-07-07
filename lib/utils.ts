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
