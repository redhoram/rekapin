import { eq, sql } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { bankAccounts, transactions } from "@/lib/db/schema";
import { parseReportParams } from "@/lib/reports/params";
import { previousPeriod, resolvePeriod, wibTodayIso } from "@/lib/reports/period";
import { fetchProfitLoss } from "@/lib/reports/profit-loss";
import { fetchCashFlow } from "@/lib/reports/cash-flow";
import { fetchCashBook } from "@/lib/reports/cash-book";
import { ReportsClient } from "./_components/reports-client";
import type { ReportAccountOption } from "./_components/types";

/** Drizzle date-mode Date -> yyyy-MM-dd (UTC, no drift). */
function toIsoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Admin-only, read-only, searchParams-driven (spec §Route structure): parse ->
// resolve period -> fetch ONLY the active tab's report -> render. Tab + period
// + account + page state all live in the URL, like /transactions.
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { businessId } = await requireRole(["admin"]);
  const sp = await searchParams;
  const { tab, periodParams, accountId, bkPage } = parseReportParams(sp);

  const period = resolvePeriod(periodParams);
  const previous = previousPeriod(period);

  // Account list (Buku Kas selector + opened-mid-period notes) and the
  // "has any transaction ever" count are cheap and always needed.
  const [accountRows, totalEverRow] = await Promise.all([
    db
      .select({
        id: bankAccounts.id,
        bankCode: bankAccounts.bankCode,
        label: bankAccounts.label,
        accountMask: bankAccounts.accountMask,
        openingDate: bankAccounts.openingDate,
      })
      .from(bankAccounts)
      .where(eq(bankAccounts.businessId, businessId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(transactions)
      .where(eq(transactions.businessId, businessId)),
  ]);

  const accounts: ReportAccountOption[] = accountRows.map((a) => ({
    id: a.id,
    bankCode: a.bankCode,
    label: a.label,
    accountMask: a.accountMask,
    openingDate: toIsoDate(a.openingDate),
  }));
  const hasAnyTransaction = (totalEverRow[0]?.count ?? 0) > 0;

  // Fetch only the active tab's report (skip entirely for a brand-new
  // business — the empty state needs no report data).
  const [profitLoss, cashFlow, cashBook] = await Promise.all([
    tab === "laba-rugi" && hasAnyTransaction
      ? fetchProfitLoss(businessId, period, previous)
      : null,
    tab === "arus-kas" && hasAnyTransaction
      ? fetchCashFlow(businessId, period, previous)
      : null,
    tab === "buku-kas" && hasAnyTransaction
      ? fetchCashBook(businessId, period, accountId, bkPage)
      : null,
  ]);

  return (
    <ReportsClient
      tab={tab}
      period={period}
      previousPeriod={previous}
      accounts={accounts}
      currentWibYear={Number(wibTodayIso().slice(0, 4))}
      hasAnyTransaction={hasAnyTransaction}
      profitLoss={profitLoss}
      cashFlow={cashFlow}
      cashBook={cashBook}
    />
  );
}
