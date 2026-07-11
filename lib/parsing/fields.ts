import type { ColumnMapping, DateFormat, Direction } from "./types";

// Pure field parsers (amount, date, direction). NO node:crypto import here, so
// this module is safe to import into client components (the mapping wizard's
// illustrative preview) as well as server-side normalization.

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };

// ---------------------------------------------------------------------------
// Amount parser — deterministic (spec DECISIONS #5). Never silently rounds.
// ---------------------------------------------------------------------------

/**
 * Parse a raw amount string to a nonnegative integer Rupiah magnitude.
 *  (a) strip everything but digits and .,
 *  (b) if it ends with . or , + exactly 1–2 digits, that's the decimal part:
 *      non-zero → FAIL (money is integer Rupiah, never round); zero → drop it
 *  (c) strip remaining . and , as thousand separators
 *  (d) must be a digits-only nonnegative integer, else FAIL
 */
export function parseAmount(raw: string): ParseResult<number> {
  const trimmed = (raw ?? "").trim();
  if (trimmed === "") return { ok: false, reason: "Jumlah kosong" };

  // (a) keep only digits and separators (drops "Rp", spaces, signs, letters).
  const cleaned = trimmed.replace(/[^\d.,]/g, "");
  if (cleaned === "") {
    return { ok: false, reason: `Jumlah tidak valid: '${trimmed}'` };
  }

  let working = cleaned;

  // (b) trailing decimal separator followed by 1–2 digits.
  const decMatch = working.match(/[.,](\d{1,2})$/);
  if (decMatch && decMatch.index !== undefined) {
    const decimalPart = decMatch[1];
    if (/[^0]/.test(decimalPart)) {
      return {
        ok: false,
        reason: "Jumlah mengandung sen — Rekapin mencatat Rupiah bulat",
      };
    }
    working = working.slice(0, decMatch.index);
  }

  // (c) strip remaining thousand separators.
  working = working.replace(/[.,]/g, "");

  // (d) digits-only nonnegative integer.
  if (working === "" || !/^\d+$/.test(working)) {
    return { ok: false, reason: `Jumlah tidak valid: '${trimmed}'` };
  }

  return { ok: true, value: parseInt(working, 10) };
}

/** True when a signed-amount cell represents a negative (outgoing) value. */
function isNegativeSigned(raw: string): boolean {
  const t = (raw ?? "").trim();
  if (t === "") return false;
  // Leading "-" or accounting parentheses, e.g. "(15.000)".
  return t.startsWith("-") || (t.startsWith("(") && t.endsWith(")"));
}

// ---------------------------------------------------------------------------
// Date parser — one resolved format applies to every row (spec edge case).
// ---------------------------------------------------------------------------

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Parse a raw date string against a fixed format to an ISO yyyy-MM-dd string.
 * Separators /, -, . are all accepted between parts.
 */
export function parseDate(raw: string, format: DateFormat): ParseResult<string> {
  const trimmed = (raw ?? "").trim();
  if (trimmed === "") return { ok: false, reason: "Tanggal kosong" };

  let day: number, month: number, year: number;

  if (format === "yyyy-MM-dd") {
    const m = trimmed.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
    if (!m) {
      return {
        ok: false,
        reason: `Tanggal tidak sesuai format yang dipilih: '${trimmed}'`,
      };
    }
    year = +m[1];
    month = +m[2];
    day = +m[3];
  } else {
    // dd/MM/yyyy or MM/dd/yyyy — both are 2/2/4 with a trailing 4-digit year.
    const m = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
    if (!m) {
      return {
        ok: false,
        reason: `Tanggal tidak sesuai format yang dipilih: '${trimmed}'`,
      };
    }
    if (format === "dd/MM/yyyy") {
      day = +m[1];
      month = +m[2];
    } else {
      month = +m[1];
      day = +m[2];
    }
    year = +m[3];
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { ok: false, reason: `Tanggal tidak valid: '${trimmed}'` };
  }

  // Validate a real calendar date (rejects 31 Feb etc.). UTC to avoid tz drift.
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return { ok: false, reason: `Tanggal tidak valid: '${trimmed}'` };
  }

  return { ok: true, value: `${year}-${pad2(month)}-${pad2(day)}` };
}

// ---------------------------------------------------------------------------
// Direction vocabulary (shared by amount_direction mode + BCA's DB/CR column).
// ---------------------------------------------------------------------------

const IN_TOKENS = new Set(["in", "masuk", "kredit", "credit", "cr", "c", "k", "+"]);
const OUT_TOKENS = new Set([
  "out",
  "keluar",
  "debit",
  "debet",
  "db",
  "dr",
  "d",
  "-",
]);

/** Map a raw direction cell to "in"/"out", or null if unrecognized. */
export function resolveDirectionToken(raw: string): Direction | null {
  const t = (raw ?? "").trim().toLowerCase();
  if (t === "") return null;
  if (IN_TOKENS.has(t)) return "in";
  if (OUT_TOKENS.has(t)) return "out";
  return null;
}

// ---------------------------------------------------------------------------
// Amount + direction resolution per amount mode.
// ---------------------------------------------------------------------------

/** Resolve a row's amount magnitude + direction according to the amount mode. */
export function resolveAmountAndDirection(
  raw: Record<string, string>,
  mapping: ColumnMapping,
): ParseResult<{ amount: number; direction: Direction }> {
  if (mapping.amountMode === "signed") {
    const cell = raw[mapping.amountColumn ?? ""] ?? "";
    const direction: Direction = isNegativeSigned(cell) ? "out" : "in";
    const parsed = parseAmount(cell);
    if (!parsed.ok) return parsed;
    return { ok: true, value: { amount: parsed.value, direction } };
  }

  if (mapping.amountMode === "amount_direction") {
    const parsed = parseAmount(raw[mapping.amountColumn ?? ""] ?? "");
    if (!parsed.ok) return parsed;
    const dirCell = raw[mapping.directionColumn ?? ""] ?? "";
    const direction = resolveDirectionToken(dirCell);
    if (!direction) {
      return { ok: false, reason: `Arah tidak dikenali: '${dirCell.trim()}'` };
    }
    return { ok: true, value: { amount: parsed.value, direction } };
  }

  // debit_credit: exactly one of the two columns carries the value. Many bank
  // exports use a bare "-" as the placeholder for "no value" in the unused
  // column (same convention as an empty cell), so it must not be parsed as an
  // amount.
  const debitRaw = (raw[mapping.debitColumn ?? ""] ?? "").trim();
  const creditRaw = (raw[mapping.creditColumn ?? ""] ?? "").trim();

  const hasDebit = debitRaw !== "" && debitRaw !== "-";
  const hasCredit = creditRaw !== "" && creditRaw !== "-";
  if (!hasDebit && !hasCredit) return { ok: false, reason: "Jumlah kosong" };

  let debitVal = 0;
  let creditVal = 0;
  if (hasDebit) {
    const p = parseAmount(debitRaw);
    if (!p.ok) return p;
    debitVal = p.value;
  }
  if (hasCredit) {
    const p = parseAmount(creditRaw);
    if (!p.ok) return p;
    creditVal = p.value;
  }

  if (debitVal > 0 && creditVal > 0) {
    return { ok: false, reason: "Baris punya nilai Debit dan Kredit sekaligus" };
  }
  if (debitVal > 0) return { ok: true, value: { amount: debitVal, direction: "out" } };
  if (creditVal > 0) return { ok: true, value: { amount: creditVal, direction: "in" } };
  return { ok: false, reason: "Jumlah harus lebih besar dari nol" };
}
