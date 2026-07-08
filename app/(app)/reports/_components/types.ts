import type {
  CashBookPage,
  CashFlowReport,
  ProfitLossReport,
  ReportTab,
  ResolvedPeriod,
} from "@/lib/reports/types";

/** Bank-account option for the Buku Kas selector + opened-mid-period notes. */
export interface ReportAccountOption {
  id: string;
  bankCode: string;
  label: string;
  accountMask: string;
  openingDate: string; // yyyy-MM-dd
}

export interface ReportsClientProps {
  tab: ReportTab;
  period: ResolvedPeriod;
  previousPeriod: ResolvedPeriod;
  accounts: ReportAccountOption[];
  currentWibYear: number;
  hasAnyTransaction: boolean;
  // Only the active tab's report is fetched/populated (spec §Route structure).
  profitLoss: ProfitLossReport | null;
  cashFlow: CashFlowReport | null;
  cashBook: CashBookPage | null;
}

export type ParamUpdate = Record<string, string | null>;
