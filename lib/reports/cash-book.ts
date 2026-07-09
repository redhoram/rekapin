import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { bankAccounts, categories, transactions } from "@/lib/db/schema";
import type { CashBookPage, CashBookRow, LedgerMergeRow, ResolvedPeriod } from "./types";

/** Ledger page size — denser than the transactions table (spec §Buku Kas). */
export const BUKU_KAS_PAGE_SIZE = 50;

/** Export page size — one "page" large enough to hold every row in a period,
 *  so the Buku Kas export reuses fetchCashBook instead of a parallel fetch-all. */
export const BUKU_KAS_EXPORT_PAGE_SIZE = 100_000;

const UNCATEGORIZED_LABEL = "Belum terkategorisasi";

/**
 * Pure combined-view merge (unit-tested, no DB): interleave every account's
 * period-bounded rows by (date, created_at, id) and accumulate ONE combined
 * running total starting from `openingBalance` (the sum of every included
 * account's opening balance at its effective start). Pagination slices the
 * result AFTER this runs, so a row's balance never depends on its page.
 */
export function mergeRunningBalances<T extends LedgerMergeRow>(
  rows: T[],
  openingBalance: number,
): (T & { runningBalance: number })[] {
  const sorted = [...rows].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  let balance = openingBalance;
  return sorted.map((r) => ({ ...r, runningBalance: (balance += r.signedAmount) }));
}

/** Format a Drizzle `date`-mode Date as yyyy-MM-dd (UTC, no drift). */
function toIsoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface AccountRow {
  id: string;
  bankCode: string;
  label: string;
  openingBalance: number;
  openingDate: Date;
}

const accountLabel = (a: AccountRow) => `${a.bankCode} · ${a.label}`;

/**
 * Opening balance rolled forward to effectiveStart for each account:
 * opening_balance + SUM(signedAmount WHERE opening_date <= date < effectiveStart).
 * SQL-aggregated per account; empty (contributes 0) when the period starts at
 * or before the account's opening_date.
 */
async function preStartNetByAccount(
  businessId: string,
  periodStart: string,
): Promise<Map<string, number>> {
  const rows = await db
    .select({
      accountId: transactions.bankAccountId,
      net: sql<number>`coalesce(sum(case when ${transactions.direction} = 'in' then ${transactions.amount} else -${transactions.amount} end), 0)::bigint`.mapWith(Number),
    })
    .from(transactions)
    .innerJoin(bankAccounts, eq(bankAccounts.id, transactions.bankAccountId))
    .where(
      and(
        eq(transactions.businessId, businessId),
        eq(bankAccounts.businessId, businessId),
        gte(transactions.date, bankAccounts.openingDate),
        sql`${transactions.date} < greatest(${bankAccounts.openingDate}, ${periodStart}::date)`,
      ),
    )
    .groupBy(transactions.bankAccountId);
  return new Map(rows.map((r) => [r.accountId, Number(r.net)]));
}

/** Raw ledger row selected from the DB (shared by both views). */
const ledgerSelection = {
  id: transactions.id,
  date: transactions.date,
  createdAt: transactions.createdAt,
  description: transactions.description,
  amount: transactions.amount,
  direction: transactions.direction,
  reviewStatus: transactions.reviewStatus,
  bankAccountId: transactions.bankAccountId,
  categoryId: transactions.categoryId,
  categoryName: categories.name,
  categoryType: categories.type,
  categoryArchivedAt: categories.archivedAt,
};

type LedgerDbRow = {
  id: string;
  date: Date;
  createdAt: Date;
  description: string;
  amount: number;
  direction: "in" | "out";
  reviewStatus: "auto" | "reviewed" | "needs_review";
  bankAccountId: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryType: CashBookRow["categoryType"];
  categoryArchivedAt: Date | null;
};

function toCashBookRow(
  r: LedgerDbRow,
  runningBalance: number,
  accountsById: Map<string, AccountRow>,
): CashBookRow {
  const account = accountsById.get(r.bankAccountId);
  return {
    id: r.id,
    date: toIsoDate(r.date),
    description: r.description,
    categoryId: r.categoryId,
    categoryName: r.categoryName ?? UNCATEGORIZED_LABEL,
    categoryType: r.categoryId ? r.categoryType : null,
    categoryArchived: r.categoryArchivedAt !== null,
    bankAccountId: r.bankAccountId,
    bankAccountLabel: account ? accountLabel(account) : "—",
    amountIn: r.direction === "in" ? r.amount : 0,
    amountOut: r.direction === "out" ? r.amount : 0,
    runningBalance,
    reviewStatus: r.reviewStatus,
  };
}

/**
 * Fetch one page of the Buku Kas ledger for a period — per account, or the
 * combined ("semua rekening") interleaved view. TRANSFER + uncategorized rows
 * included (cash is cash). Rows dated before an account's opening_date are
 * structurally excluded (effectiveStart >= openingDate always).
 *
 * Caller MUST have already verified admin role via requireRole(["admin"]).
 * Business-scoped from the verified membership — never a client businessId.
 */
export async function fetchCashBook(
  businessId: string,
  period: ResolvedPeriod,
  accountId: string | "combined",
  page: number,
  pageSize: number = BUKU_KAS_PAGE_SIZE,
): Promise<CashBookPage> {
  const accountRows: AccountRow[] = await db
    .select({
      id: bankAccounts.id,
      bankCode: bankAccounts.bankCode,
      label: bankAccounts.label,
      openingBalance: bankAccounts.openingBalance,
      openingDate: bankAccounts.openingDate,
    })
    .from(bankAccounts)
    .where(eq(bankAccounts.businessId, businessId));
  const accountsById = new Map(accountRows.map((a) => [a.id, a]));

  // Unknown/foreign accountId falls back to the combined view (never throws —
  // same "garbage params get defaults" discipline as parseReportParams).
  const target = accountId === "combined" ? null : (accountsById.get(accountId) ?? null);
  const view: string | "combined" = target ? target.id : "combined";

  const [preNets, unreviewedRows] = await Promise.all([
    preStartNetByAccount(businessId, period.start),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(transactions)
      .where(
        and(
          eq(transactions.businessId, businessId),
          eq(transactions.reviewStatus, "needs_review"),
          gte(transactions.date, new Date(period.start)),
          lte(transactions.date, new Date(period.end)),
        ),
      ),
  ]);
  const hasUnreviewed = (Number(unreviewedRows[0]?.count) || 0) > 0;

  const openingFor = (a: AccountRow): number =>
    a.openingBalance + (preNets.get(a.id) ?? 0);

  if (target) {
    // ---- Per-account view: SQL window function computes the running flow ----
    const openingIso = toIsoDate(target.openingDate);
    const effectiveStart = openingIso > period.start ? openingIso : period.start;
    const openingBalance = openingFor(target);

    const where = and(
      eq(transactions.businessId, businessId),
      eq(transactions.bankAccountId, target.id),
      gte(transactions.date, new Date(effectiveStart)),
      lte(transactions.date, new Date(period.end)),
    );

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(transactions)
      .where(where);
    const totalRows = Number(count) || 0;
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);

    // Window runs over the FULL filtered set before LIMIT/OFFSET (SQL window
    // semantics), so a row's balance never depends on which page it lands on.
    const rows = await db
      .select({
        ...ledgerSelection,
        cumFlow: sql<number>`sum(case when ${transactions.direction} = 'in' then ${transactions.amount} else -${transactions.amount} end) over (order by ${transactions.date}, ${transactions.createdAt}, ${transactions.id} rows unbounded preceding)::bigint`.mapWith(Number),
      })
      .from(transactions)
      .leftJoin(categories, eq(categories.id, transactions.categoryId))
      .where(where)
      .orderBy(asc(transactions.date), asc(transactions.createdAt), asc(transactions.id))
      .limit(pageSize)
      .offset((safePage - 1) * pageSize);

    return {
      period,
      accountId: view,
      effectiveStart,
      openingBalance,
      rows: rows.map((r) =>
        toCashBookRow(r, openingBalance + Number(r.cumFlow), accountsById),
      ),
      page: safePage,
      pageSize,
      totalRows,
      totalPages,
      hasUnreviewed,
    };
  }

  // ---- Combined view: interleave all included accounts in JS --------------
  // Bounded by the period's row count (fine at UMKM scale; flagged can-slip
  // refinement for very large periods in the spec).
  const included = accountRows.filter(
    (a) => toIsoDate(a.openingDate) <= period.end,
  );
  const openingBalance = included.reduce((acc, a) => acc + openingFor(a), 0);

  const dbRows = await db
    .select(ledgerSelection)
    .from(transactions)
    .innerJoin(bankAccounts, eq(bankAccounts.id, transactions.bankAccountId))
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(
      and(
        eq(transactions.businessId, businessId),
        eq(bankAccounts.businessId, businessId),
        lte(transactions.date, new Date(period.end)),
        sql`${transactions.date} >= greatest(${bankAccounts.openingDate}, ${period.start}::date)`,
      ),
    )
    .orderBy(asc(transactions.date), asc(transactions.createdAt), asc(transactions.id));

  const merged = mergeRunningBalances(
    dbRows.map((r) => ({
      ...r,
      date: toIsoDate(r.date),
      createdAt: r.createdAt.toISOString(),
      signedAmount: r.direction === "in" ? r.amount : -r.amount,
    })),
    openingBalance,
  );

  const totalRows = merged.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pageRows = merged.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  return {
    period,
    accountId: "combined",
    effectiveStart: period.start,
    openingBalance,
    rows: pageRows.map((r) =>
      toCashBookRow(
        // toCashBookRow re-derives date from a Date; hand it one built from the
        // already-normalized ISO string (UTC midnight, no drift).
        { ...r, date: new Date(r.date), createdAt: new Date(r.createdAt) },
        r.runningBalance,
        accountsById,
      ),
    ),
    page: safePage,
    pageSize,
    totalRows,
    totalPages,
    hasUnreviewed,
  };
}
