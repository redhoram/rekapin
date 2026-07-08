import type {
  DashboardKpis,
  DashboardTrend,
  ExpenseComposition,
  ResolvedPeriod,
} from "@/lib/reports/types";

/** Same URL-param update shape as /reports (re-exported for the picker). */
export type { ParamUpdate } from "@/app/(app)/reports/_components/types";

export interface DashboardClientProps {
  period: ResolvedPeriod;
  previousPeriod: ResolvedPeriod;
  currentWibYear: number;
  hasAnyTransaction: boolean;
  /** True when data exists globally but the selected period is P&L-empty
   *  (incl. the TRANSFER-only edge) — mirrors reports-client's profitLossEmpty. */
  periodEmpty: boolean;
  // Null for a brand-new business (no fetch ran server-side).
  kpis: DashboardKpis | null;
  trend: DashboardTrend | null;
  composition: ExpenseComposition | null;
}
