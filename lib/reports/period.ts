import { formatDateShort } from "@/lib/utils";
import type { PeriodPreset, ResolvedPeriod, TrendMonth } from "./types";

/**
 * Pure period-resolution layer (no DB import) for /reports. Same "never throws,
 * garbage falls back to a safe default" discipline as parseTransactionFilters.
 *
 * Date arithmetic treats calendar dates as UTC-midnight Date objects (the same
 * convention as `toIsoDate` in lib/queries/transactions.ts) so results never
 * drift with the server timezone (Vercel runs UTC).
 */

export interface PeriodParams {
  preset?: string;
  year?: string;
  month?: string;
  quarter?: string;
  from?: string;
  to?: string;
}

const MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const MONTHS_ID_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const PRESETS: PeriodPreset[] = ["month", "quarter", "year", "custom"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function ymd(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/** Last calendar day (28–31) of month `m` (1-12) in year `y`. */
function lastDayOfMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Quarter (1-4) that month `m` (1-12) belongs to. */
function quarterOf(m: number): number {
  return Math.floor((m - 1) / 3) + 1;
}

function isValidIsoDate(s: string | undefined): s is string {
  if (!s || !ISO_DATE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1) return false;
  return d <= lastDayOfMonth(y, m);
}

function parseIntInRange(
  raw: string | undefined,
  min: number,
  max: number,
): number | null {
  const n = Number.parseInt((raw ?? "").trim(), 10);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

// --- period builders (shared by resolvePeriod + previousPeriod) -------------

function buildMonth(y: number, m: number): ResolvedPeriod {
  return {
    preset: "month",
    start: ymd(y, m, 1),
    end: ymd(y, m, lastDayOfMonth(y, m)),
    label: `${MONTHS_ID[m - 1]} ${y}`,
  };
}

function buildQuarter(y: number, q: number): ResolvedPeriod {
  const startMonth = (q - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  return {
    preset: "quarter",
    start: ymd(y, startMonth, 1),
    end: ymd(y, endMonth, lastDayOfMonth(y, endMonth)),
    label: `Kuartal ${q} ${y}`,
  };
}

function buildYear(y: number): ResolvedPeriod {
  return {
    preset: "year",
    start: ymd(y, 1, 1),
    end: ymd(y, 12, 31),
    label: `${y}`,
  };
}

function buildCustom(fromIso: string, toIso: string): ResolvedPeriod {
  // from > to is silently swapped, never rejected (spec: never block the user).
  const [start, end] = fromIso <= toIso ? [fromIso, toIso] : [toIso, fromIso];
  return {
    preset: "custom",
    start,
    end,
    label: `${formatDateShort(start)} – ${formatDateShort(end)}`,
  };
}

/**
 * WIB "today" as yyyy-MM-dd, independent of the server timezone. A naive
 * `new Date()` UTC-date read is WRONG for any request between 00:00–07:00 UTC
 * (it would report the previous WIB calendar day) — Intl with the Asia/Jakarta
 * zone is the fix. `en-CA` formats as yyyy-MM-dd.
 */
export function wibTodayIso(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Resolve raw period params into a concrete period. Never throws: missing or
 * garbage input falls back to the current WIB month. `from > to` is swapped.
 */
export function resolvePeriod(
  params: PeriodParams,
  now: Date = new Date(),
): ResolvedPeriod {
  const today = wibTodayIso(now);
  const curYear = Number(today.slice(0, 4));
  const curMonth = Number(today.slice(5, 7));

  const preset = (PRESETS as string[]).includes(params.preset ?? "")
    ? (params.preset as PeriodPreset)
    : "month";

  const year = parseIntInRange(params.year, 1900, 3000) ?? curYear;

  switch (preset) {
    case "quarter": {
      const q = parseIntInRange(params.quarter, 1, 4) ?? quarterOf(curMonth);
      return buildQuarter(year, q);
    }
    case "year":
      return buildYear(year);
    case "custom":
      if (isValidIsoDate(params.from) && isValidIsoDate(params.to)) {
        return buildCustom(params.from, params.to);
      }
      // Incomplete/garbage custom range → safe default (current WIB month).
      return buildMonth(curYear, curMonth);
    case "month":
    default: {
      const m = parseIntInRange(params.month, 1, 12) ?? curMonth;
      return buildMonth(year, m);
    }
  }
}

/** Add `n` calendar days to a yyyy-MM-dd string (UTC math, no TZ drift). */
function addDaysIso(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return ymd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/** Inclusive day count between two yyyy-MM-dd strings (start <= end assumed). */
function daysInclusive(startIso: string, endIso: string): number {
  const [sy, sm, sd] = startIso.split("-").map(Number);
  const [ey, em, ed] = endIso.split("-").map(Number);
  const start = Date.UTC(sy, sm - 1, sd);
  const end = Date.UTC(ey, em - 1, ed);
  return Math.round((end - start) / 86_400_000) + 1;
}

/**
 * The immediately-preceding period of the same shape/length:
 * - month   -> prior calendar month (year rollover handled)
 * - quarter -> prior quarter (year rollover handled)
 * - year    -> prior year
 * - custom  -> same day-count window ending the day before `start`.
 */
export function previousPeriod(period: ResolvedPeriod): ResolvedPeriod {
  const y = Number(period.start.slice(0, 4));
  const m = Number(period.start.slice(5, 7));

  switch (period.preset) {
    case "quarter": {
      const q = quarterOf(m);
      return q === 1 ? buildQuarter(y - 1, 4) : buildQuarter(y, q - 1);
    }
    case "year":
      return buildYear(y - 1);
    case "custom": {
      const days = daysInclusive(period.start, period.end);
      const newEnd = addDaysIso(period.start, -1);
      const newStart = addDaysIso(newEnd, -(days - 1));
      return buildCustom(newStart, newEnd);
    }
    case "month":
    default:
      return m === 1 ? buildMonth(y - 1, 12) : buildMonth(y, m - 1);
  }
}

/**
 * Percent change from `previous` to `current`, rounded to 1 decimal. The sign
 * always follows the DIRECTION of change (sign of current − previous), so an
 * increase reads positive even when the baseline is negative (a loss shrinking
 * to a profit reads as "up") — the ComparisonDelta arrow/color polarity relies
 * on this. Undefined-baseline guards:
 * - previous === 0 && current !== 0 -> null (no meaningful %; UI shows "Baru")
 * - previous === 0 && current === 0 -> 0
 */
export function computeChangePct(
  current: number,
  previous: number,
): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  return Math.round(pct * 10) / 10;
}

/** Convenience: wrap current/previous into a MoneyDelta with a computed %. */
export function toMoneyDelta(current: number, previous: number) {
  return { current, previous, changePct: computeChangePct(current, previous) };
}

/**
 * The trailing `count` calendar months ending at the month that contains
 * `anchorIso` (yyyy-MM-dd), returned oldest -> newest. Pure, no DB — the same
 * UTC month-rollover math as the private period builders. Used by the dashboard
 * 12-month trend/margin charts; a business younger than `count` months simply
 * gets zero-filled early buckets downstream (assembleMonthlyTrend).
 */
export function trailingMonths(anchorIso: string, count: number): TrendMonth[] {
  const anchorYear = Number(anchorIso.slice(0, 4));
  const anchorMonth = Number(anchorIso.slice(5, 7)); // 1-12
  const months: TrendMonth[] = [];
  for (let i = count - 1; i >= 0; i--) {
    // Zero-based month arithmetic handles year rollover cleanly.
    const idx = anchorYear * 12 + (anchorMonth - 1) - i;
    const y = Math.floor(idx / 12);
    const m = (idx % 12) + 1; // 1-12
    months.push({
      ym: `${y}-${pad2(m)}`,
      start: ymd(y, m, 1),
      end: ymd(y, m, lastDayOfMonth(y, m)),
      label: `${MONTHS_ID_SHORT[m - 1]} ${y}`,
    });
  }
  return months;
}
