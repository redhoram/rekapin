import type { ReportTab } from "./types";
import type { PeriodParams } from "./period";

/**
 * Parse raw /reports URL searchParams into typed report state. Never throws —
 * garbage values fall back to defaults (same contract as parseTransactionFilters
 * in lib/queries/transactions.ts). `tab` -> "laba-rugi", `accountId` -> "combined",
 * `bkPage` -> 1. Period fields are passed through raw; resolvePeriod validates them.
 */

const TABS: ReportTab[] = ["laba-rugi", "arus-kas", "buku-kas"];

function firstValue(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  const t = (s ?? "").trim();
  return t === "" ? undefined : t;
}

export interface ReportParams {
  tab: ReportTab;
  periodParams: PeriodParams;
  accountId: string; // account id or "combined"
  bkPage: number; // >= 1
}

export function parseReportParams(
  sp: Record<string, string | string[] | undefined>,
): ReportParams {
  const tabRaw = firstValue(sp.tab);
  const tab = (TABS as string[]).includes(tabRaw ?? "")
    ? (tabRaw as ReportTab)
    : "laba-rugi";

  const rawPage = Number.parseInt(firstValue(sp.bkPage) ?? "", 10);
  const bkPage = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

  return {
    tab,
    accountId: firstValue(sp.accountId) ?? "combined",
    bkPage,
    periodParams: {
      preset: firstValue(sp.preset),
      year: firstValue(sp.year),
      month: firstValue(sp.month),
      quarter: firstValue(sp.quarter),
      from: firstValue(sp.from),
      to: firstValue(sp.to),
    },
  };
}
