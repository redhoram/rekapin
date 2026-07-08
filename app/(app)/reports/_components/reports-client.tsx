"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ReportTab } from "@/lib/reports/types";
import { FinalBadge } from "./final-badge";
import { ReportTabs } from "./report-tabs";
import { PeriodPicker } from "./period-picker";
import { ReportEmpty } from "./report-empty";
import { ProfitLossView } from "./profit-loss-view";
import { CashFlowView } from "./cash-flow-view";
import { CashBookView } from "./cash-book-view";
import type { ParamUpdate, ReportsClientProps } from "./types";

/**
 * Client chrome for /reports: owns the searchParams pushes + the pending dim.
 * All report data arrives pre-fetched from the server component (active tab
 * only); every interaction is a URL change that re-runs the server fetch.
 */
export function ReportsClient(props: ReportsClientProps) {
  const {
    tab,
    period,
    previousPeriod,
    accounts,
    currentWibYear,
    hasAnyTransaction,
    profitLoss,
    cashFlow,
    cashBook,
  } = props;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();

  const pushParams = React.useCallback(
    (update: ParamUpdate) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(update)) {
        if (v === null) params.delete(k);
        else params.set(k, v);
      }
      // Any tab/period/account change resets the ledger page (like the
      // transactions page drops `page` on filter change).
      if (!("bkPage" in update)) params.delete("bkPage");
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [searchParams, pathname, router],
  );

  const hasUnreviewed =
    (tab === "laba-rugi" && profitLoss?.hasUnreviewed) ||
    (tab === "arus-kas" && cashFlow?.hasUnreviewed) ||
    (tab === "buku-kas" && cashBook?.hasUnreviewed) ||
    false;

  const accountLabel =
    cashBook && cashBook.accountId !== "combined"
      ? (() => {
          const a = accounts.find((x) => x.id === cashBook.accountId);
          return a ? `${a.bankCode} · ${a.label}` : null;
        })()
      : "Semua Rekening";

  // Per-tab subtitle: Buku Kas has no previous-period comparison (spec #6).
  const subtitle =
    tab === "buku-kas"
      ? `${period.label}${accountLabel ? ` · ${accountLabel}` : ""}`
      : `${period.label} · vs ${previousPeriod.label}`;

  // Tab-specific "nothing in this period" emptiness (design §7.3).
  const profitLossEmpty =
    profitLoss !== null &&
    profitLoss.sections.every((s) => s.lines.length === 0) &&
    profitLoss.uncategorized.count === 0;
  const cashFlowNoAccounts = cashFlow !== null && cashFlow.accounts.length === 0;

  let view: React.ReactNode = null;
  if (!hasAnyTransaction) {
    view = <ReportEmpty variant="new" />;
  } else if (tab === "laba-rugi" && profitLoss) {
    view = profitLossEmpty ? (
      <ReportEmpty variant="period" periodLabel={period.label} />
    ) : (
      <ProfitLossView report={profitLoss} />
    );
  } else if (tab === "arus-kas" && cashFlow) {
    view = cashFlowNoAccounts ? (
      <ReportEmpty
        variant="period"
        periodLabel={period.label}
        body="Belum ada rekening yang aktif di periode ini. Coba pilih periode lain di atas."
      />
    ) : (
      <CashFlowView report={cashFlow} accounts={accounts} />
    );
  } else if (tab === "buku-kas" && cashBook) {
    // Buku Kas keeps its toolbar visible even when the period is empty (§7.3).
    view = (
      <CashBookView
        cashBook={cashBook}
        accounts={accounts}
        onParamChange={pushParams}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text)] md:text-3xl">
            Laporan
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>
        </div>
        {hasUnreviewed && <FinalBadge />}
      </div>

      <ReportTabs tab={tab} onChange={(v: ReportTab) => pushParams({ tab: v })} />

      <PeriodPicker
        period={period}
        currentWibYear={currentWibYear}
        onParamChange={pushParams}
      />

      {/* Pending dim — snappy feedback while the server refetch runs (§2.6). */}
      <div
        className={cn(
          "transition-opacity duration-200",
          isPending && "pointer-events-none opacity-60",
        )}
      >
        {view}
      </div>
    </div>
  );
}
