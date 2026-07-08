import type { CategoryType } from "@/lib/categories/meta";

/**
 * Shared, fully-serializable report DTOs (step ④). Every field is a plain
 * string / number / boolean / null — NO `Date` objects — so these shapes are
 * export-ready: step ⑤'s Excel export is a straight walk over already-computed
 * DTOs, and every fetcher returns JSON-safe data to the client component.
 *
 * Money is always an integer Rupiah magnitude/sum (never a float). Percentages
 * are the only floating-point values and live purely at the presentation layer.
 */

export type ReportTab = "laba-rugi" | "arus-kas" | "buku-kas";
export type PeriodPreset = "month" | "quarter" | "year" | "custom";

/** The four P&L section types, in fixed display order (TRANSFER excluded). */
export type ProfitLossSectionType =
  | "PENDAPATAN"
  | "HPP"
  | "OPEX"
  | "NON_OPERASIONAL";

export interface ResolvedPeriod {
  preset: PeriodPreset;
  start: string; // yyyy-MM-dd inclusive
  end: string; // yyyy-MM-dd inclusive
  label: string; // Indonesian display label, e.g. "Juli 2026", "Kuartal 3 2026", "2026"
}

export interface MoneyDelta {
  current: number; // integer Rupiah
  previous: number | null; // null if no previous-period data requested/available
  changePct: number | null; // null when previous === 0 and current !== 0 (undefined baseline)
}

export interface ReportLine {
  categoryId: string | null; // null = "Belum terkategorisasi"
  categoryName: string;
  total: number; // integer Rupiah, display-convention already applied
  percentOfRevenue: number | null; // Laba Rugi only; null elsewhere
}

export interface ProfitLossSection {
  type: ProfitLossSectionType;
  label: string;
  lines: ReportLine[];
  subtotal: MoneyDelta;
}

export interface ProfitLossReport {
  period: ResolvedPeriod;
  previousPeriod: ResolvedPeriod;
  sections: ProfitLossSection[];
  revenue: MoneyDelta;
  grossProfit: MoneyDelta;
  operatingProfit: MoneyDelta;
  netProfit: MoneyDelta;
  uncategorized: { count: number; netAmount: number };
  hasUnreviewed: boolean;
  /** In-period needs_review transaction count backing `hasUnreviewed`. The
   *  dashboard CTA needs the actual number ("N transaksi perlu ditinjau"). */
  needsReviewCount: number;
}

export interface CashFlowAccountSection {
  accountId: string | "combined";
  accountLabel: string; // e.g. "BCA · Operasional · •••• 1234" or "Semua Rekening"
  openingBalance: MoneyDelta;
  cashInLines: ReportLine[];
  cashOutLines: ReportLine[];
  totalIn: MoneyDelta;
  totalOut: MoneyDelta;
  closingBalance: MoneyDelta;
  note: "opened_mid_period" | "not_yet_open" | null; // UI hint, see spec Edge cases
}

export interface CashFlowReport {
  period: ResolvedPeriod;
  previousPeriod: ResolvedPeriod;
  accounts: CashFlowAccountSection[]; // omits accounts not yet open in the period
  combined: CashFlowAccountSection;
  hasUnreviewed: boolean;
}

export interface CashBookRow {
  id: string;
  date: string; // yyyy-MM-dd
  description: string;
  categoryId: string | null;
  categoryName: string;
  categoryType: CategoryType | null;
  // Archived categories keep historical rows — ledger shows the "(diarsipkan)"
  // suffix via CategoryChip (design §6.2).
  categoryArchived: boolean;
  bankAccountId: string;
  bankAccountLabel: string;
  amountIn: number;
  amountOut: number;
  runningBalance: number;
  reviewStatus: "auto" | "reviewed" | "needs_review";
}

export interface CashBookPage {
  period: ResolvedPeriod;
  accountId: string | "combined";
  /** Where the running column starts — max(period.start, account.openingDate),
   *  or period.start for the combined view. yyyy-MM-dd. */
  effectiveStart: string;
  openingBalance: number; // for the selected account/combined view, at effectiveStart
  rows: CashBookRow[];
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
  hasUnreviewed: boolean;
}

// ---------------------------------------------------------------------------
// Pure-function input shapes (grouped/raw rows the DB fetchers hand to the
// unit-tested assembly helpers). Kept here so tests can import them directly.
// ---------------------------------------------------------------------------

/** One category's net flow in a period (SQL-grouped) — input to assembleProfitLoss. */
export interface ProfitLossCategoryRow {
  categoryId: string;
  categoryName: string;
  categoryType: CategoryType;
  netFlow: number; // SUM(signedAmount) — positive = net inflow
}

/** Full input to the pure assembleProfitLoss (grouped rows + side counts). */
export interface AssembleProfitLossInput {
  period: ResolvedPeriod;
  previousPeriod: ResolvedPeriod;
  current: ProfitLossCategoryRow[];
  previous: ProfitLossCategoryRow[];
  uncategorized: { count: number; netAmount: number };
  hasUnreviewed: boolean;
  /** In-period needs_review count (backs both `hasUnreviewed` and the report). */
  needsReviewCount: number;
}

/** A single cash movement for one account — input to resolveAccountSection. */
export interface CashRow {
  date: string; // yyyy-MM-dd
  direction: "in" | "out";
  amount: number; // positive magnitude
  categoryId: string | null;
  categoryName: string; // resolved ("Belum terkategorisasi" for null)
}

/** Bank-account metadata needed for opening/effective-start math. */
export interface AccountMeta {
  accountId: string;
  accountLabel: string;
  openingBalance: number;
  openingDate: string; // yyyy-MM-dd
}

/** One period's resolved account section, before previous-period comparison. */
export interface AccountSectionCore {
  accountId: string;
  accountLabel: string;
  openingBalance: number;
  cashInLines: ReportLine[];
  cashOutLines: ReportLine[];
  totalIn: number;
  totalOut: number;
  closingBalance: number;
  note: "opened_mid_period" | "not_yet_open" | null;
  /** false when the account's opening_date is entirely after the period end. */
  included: boolean;
}

/** A ledger row fed to mergeRunningBalances (combined view). */
export interface LedgerMergeRow {
  date: string; // yyyy-MM-dd
  createdAt: string; // ISO timestamp — chronological tie-break
  id: string; // final deterministic tie-break
  signedAmount: number; // +in / -out
}

// ---------------------------------------------------------------------------
// Dashboard DTOs (step ⑤). All JSON-safe (no Date), same as the report DTOs.
// ---------------------------------------------------------------------------

/** One trailing month window, oldest -> newest — output of trailingMonths. */
export interface TrendMonth {
  ym: string; // "yyyy-MM"
  start: string; // yyyy-MM-dd, first day of month
  end: string; // yyyy-MM-dd, last day of month
  label: string; // short Indonesian label, e.g. "Jul 2026"
}

/** Percentage-point delta (margins) — NOT a MoneyDelta (no Rupiah, no "Baru"). */
export interface PercentPointDelta {
  current: number | null; // null when current-period revenue <= 0 (undefined margin)
  previous: number | null; // null when previous-period revenue <= 0
  changePts: number | null; // current - previous, 1 decimal; null unless both non-null
}

export interface DashboardKpis {
  period: ResolvedPeriod;
  previousPeriod: ResolvedPeriod;
  revenue: MoneyDelta;
  totalExpense: MoneyDelta; // HPP + OPEX cost magnitude, combined
  netProfit: MoneyDelta;
  grossMarginPct: PercentPointDelta;
  netMarginPct: PercentPointDelta;
  cashPosition: MoneyDelta; // combined closing balance AT PERIOD END
  hasUnreviewed: boolean;
  needsReviewCount: number;
  uncategorizedCount: number;
}

export interface ExpenseCompositionSlice {
  categoryId: string | null; // null = the synthetic "Lainnya" bucket
  categoryName: string;
  total: number; // integer Rupiah, positive cost magnitude
  percentOfTotal: number | null; // null when total expense === 0
}

export interface ExpenseComposition {
  period: ResolvedPeriod;
  slices: ExpenseCompositionSlice[]; // <= 6 entries: up to 5 categories + "Lainnya"
  total: number;
}

export interface MonthlyTrendPoint {
  month: string; // "yyyy-MM"
  label: string; // "Jul 2026"
  revenue: number; // integer Rupiah
  expense: number; // integer Rupiah, HPP+OPEX magnitude (>= 0 in the normal case)
  profit: number; // integer Rupiah, net profit incl. NON_OPERASIONAL (can be negative)
  grossMarginPct: number | null; // null when revenue <= 0 that month
  netMarginPct: number | null; // null when revenue <= 0 that month
}

export interface DashboardTrend {
  months: MonthlyTrendPoint[]; // chronological, oldest -> newest, length === requested count
}
