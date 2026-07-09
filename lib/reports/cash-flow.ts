import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { bankAccounts, categories, transactions } from "@/lib/db/schema";
import type {
  AccountMeta,
  AccountSectionCore,
  CashFlowAccountSection,
  CashFlowReport,
  CashRow,
  MoneyDelta,
  ReportLine,
  ResolvedPeriod,
} from "./types";
import { computeChangePct } from "./period";

const UNCATEGORIZED_LABEL = "Belum terkategorisasi";

/**
 * Pure per-account cash-flow math (unit-tested, no DB). Cash is cash: ALL
 * categories (including TRANSFER) and uncategorized rows count here — contrast
 * with Laba Rugi, which excludes TRANSFER and reports uncategorized separately.
 *
 * Binding decision (spec §Edge cases): `opening_balance` already reflects
 * everything before `opening_date`, so rows dated before it are structurally
 * excluded from this account's balance math AND its lines — for every period,
 * permanently. Those rows are still fully counted in Laba Rugi (cash-basis P&L
 * recognition is not account-ledger-dependent). This asymmetry is intentional.
 */
export function resolveAccountSection(
  account: AccountMeta,
  period: { start: string; end: string },
  rows: CashRow[],
): AccountSectionCore {
  const base = {
    accountId: account.accountId,
    accountLabel: account.accountLabel,
    cashInLines: [] as ReportLine[],
    cashOutLines: [] as ReportLine[],
    totalIn: 0,
    totalOut: 0,
  };

  // Account's tracked ledger starts after the whole period — it didn't exist
  // yet; the section is omitted from the report (never misleading zeros).
  if (account.openingDate > period.end) {
    return {
      ...base,
      openingBalance: account.openingBalance,
      closingBalance: account.openingBalance,
      note: "not_yet_open",
      included: false,
    };
  }

  const effectiveStart =
    account.openingDate > period.start ? account.openingDate : period.start;

  // Structural exclusion: pre-opening_date rows never count (see doc above).
  const tracked = rows.filter(
    (r) => r.date >= account.openingDate && r.date <= period.end,
  );

  // Net flow between opening_date and the period start — rolls the opening
  // balance forward to effectiveStart. Empty (contributes 0) whenever
  // period.start <= openingDate, the common case.
  const preNet = tracked
    .filter((r) => r.date < effectiveStart)
    .reduce((acc, r) => acc + (r.direction === "in" ? r.amount : -r.amount), 0);
  const openingBalance = account.openingBalance + preNet;

  const inPeriod = tracked.filter((r) => r.date >= effectiveStart);

  const groupLines = (direction: "in" | "out"): ReportLine[] => {
    const byCategory = new Map<string | null, ReportLine>();
    for (const r of inPeriod) {
      if (r.direction !== direction) continue;
      const existing = byCategory.get(r.categoryId);
      if (existing) {
        existing.total += r.amount;
      } else {
        byCategory.set(r.categoryId, {
          categoryId: r.categoryId,
          categoryName: r.categoryName,
          total: r.amount,
          percentOfRevenue: null,
        });
      }
    }
    // Largest magnitude first (same ordering rule as Laba Rugi lines).
    return [...byCategory.values()].sort(
      (a, b) => Math.abs(b.total) - Math.abs(a.total),
    );
  };

  const cashInLines = groupLines("in");
  const cashOutLines = groupLines("out");
  const totalIn = cashInLines.reduce((acc, l) => acc + l.total, 0);
  const totalOut = cashOutLines.reduce((acc, l) => acc + l.total, 0);

  return {
    ...base,
    openingBalance,
    cashInLines,
    cashOutLines,
    totalIn,
    totalOut,
    closingBalance: openingBalance + totalIn - totalOut,
    note: account.openingDate > period.start ? "opened_mid_period" : null,
    included: true,
  };
}

/** MoneyDelta where the previous period may have no data (account not open). */
function makeDelta(current: number, previous: number | null): MoneyDelta {
  if (previous === null) return { current, previous: null, changePct: null };
  return { current, previous, changePct: computeChangePct(current, previous) };
}

/** Format a Drizzle `date`-mode Date as yyyy-MM-dd (UTC, no drift). */
function toIsoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface GroupedLineRow {
  accountId: string;
  categoryId: string | null;
  categoryName: string | null;
  direction: "in" | "out";
  total: number;
}

interface PreSumRow {
  accountId: string;
  direction: "in" | "out";
  total: number;
}

/**
 * SQL-aggregated flows for one period: category-grouped in-period lines plus
 * pre-period (opening_date -> effectiveStart) sums, both keyed by account.
 * Aggregation happens in Postgres (spec P0 — no fetch-all-then-reduce); the
 * pure helper only does the opening/closing math over already-grouped rows.
 */
async function fetchPeriodFlows(
  businessId: string,
  p: ResolvedPeriod,
): Promise<{ lines: GroupedLineRow[]; preSums: PreSumRow[] }> {
  const [lines, preSums] = await Promise.all([
    db
      .select({
        accountId: transactions.bankAccountId,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        direction: transactions.direction,
        total: sql<number>`sum(${transactions.amount})::bigint`.mapWith(Number),
      })
      .from(transactions)
      .innerJoin(bankAccounts, eq(bankAccounts.id, transactions.bankAccountId))
      // LEFT JOIN: uncategorized rows count as a "Belum terkategorisasi" line.
      .leftJoin(categories, eq(categories.id, transactions.categoryId))
      .where(
        and(
          eq(transactions.businessId, businessId),
          eq(bankAccounts.businessId, businessId),
          lte(transactions.date, new Date(p.end)),
          // Per-account effectiveStart, computed in SQL.
          sql`${transactions.date} >= greatest(${bankAccounts.openingDate}, ${p.start}::date)`,
        ),
      )
      .groupBy(
        transactions.bankAccountId,
        transactions.categoryId,
        categories.name,
        transactions.direction,
      ),
    db
      .select({
        accountId: transactions.bankAccountId,
        direction: transactions.direction,
        total: sql<number>`sum(${transactions.amount})::bigint`.mapWith(Number),
      })
      .from(transactions)
      .innerJoin(bankAccounts, eq(bankAccounts.id, transactions.bankAccountId))
      .where(
        and(
          eq(transactions.businessId, businessId),
          eq(bankAccounts.businessId, businessId),
          gte(transactions.date, bankAccounts.openingDate),
          sql`${transactions.date} < greatest(${bankAccounts.openingDate}, ${p.start}::date)`,
        ),
      )
      .groupBy(transactions.bankAccountId, transactions.direction),
  ]);

  return {
    lines: lines.map((r) => ({ ...r, total: Number(r.total) })),
    preSums: preSums.map((r) => ({ ...r, total: Number(r.total) })),
  };
}

/**
 * Map one period's SQL aggregates into per-account CashRow[] for the pure
 * helper. Grouped in-period lines get date = period.end (any date within
 * [effectiveStart, end] works — grouping already happened in SQL); pre-period
 * sums get date = openingDate (< effectiveStart by construction).
 */
function rowsByAccount(
  accounts: AccountMeta[],
  p: ResolvedPeriod,
  flows: { lines: GroupedLineRow[]; preSums: PreSumRow[] },
): Map<string, CashRow[]> {
  const map = new Map<string, CashRow[]>(accounts.map((a) => [a.accountId, []]));
  const openingDateOf = new Map(accounts.map((a) => [a.accountId, a.openingDate]));

  for (const r of flows.lines) {
    map.get(r.accountId)?.push({
      date: p.end,
      direction: r.direction,
      amount: r.total,
      categoryId: r.categoryId,
      categoryName: r.categoryName ?? UNCATEGORIZED_LABEL,
    });
  }
  for (const r of flows.preSums) {
    map.get(r.accountId)?.push({
      date: openingDateOf.get(r.accountId) ?? p.start,
      direction: r.direction,
      amount: r.total,
      categoryId: null,
      categoryName: "",
    });
  }
  return map;
}

/** Arithmetic sum of category lines across sections (money is additive). */
function mergeLines(sections: AccountSectionCore[], key: "cashInLines" | "cashOutLines"): ReportLine[] {
  const byCategory = new Map<string | null, ReportLine>();
  for (const s of sections) {
    for (const line of s[key]) {
      const existing = byCategory.get(line.categoryId);
      if (existing) existing.total += line.total;
      else byCategory.set(line.categoryId, { ...line });
    }
  }
  return [...byCategory.values()].sort(
    (a, b) => Math.abs(b.total) - Math.abs(a.total),
  );
}

/**
 * Fetch the Arus Kas report for a period + previous-period comparison.
 *
 * Caller MUST have already verified admin role via requireRole(["admin"]).
 * Business-scoped from the verified membership — never a client businessId.
 */
export async function fetchCashFlow(
  businessId: string,
  period: ResolvedPeriod,
  previous: ResolvedPeriod,
): Promise<CashFlowReport> {
  const accountRows = await db
    .select({
      id: bankAccounts.id,
      bankCode: bankAccounts.bankCode,
      label: bankAccounts.label,
      accountMask: bankAccounts.accountMask,
      openingBalance: bankAccounts.openingBalance,
      openingDate: bankAccounts.openingDate,
    })
    .from(bankAccounts)
    .where(eq(bankAccounts.businessId, businessId));

  const metas: AccountMeta[] = accountRows.map((a) => ({
    accountId: a.id,
    accountLabel: `${a.bankCode} · ${a.label} · •••• ${a.accountMask}`,
    openingBalance: a.openingBalance,
    openingDate: toIsoDate(a.openingDate),
  }));

  const [curFlows, prevFlows, unreviewedRows] = await Promise.all([
    fetchPeriodFlows(businessId, period),
    fetchPeriodFlows(businessId, previous),
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

  const curRows = rowsByAccount(metas, period, curFlows);
  const prevRows = rowsByAccount(metas, previous, prevFlows);

  const curCores = metas.map((m) =>
    resolveAccountSection(m, period, curRows.get(m.accountId) ?? []),
  );
  const prevCores = metas.map((m) =>
    resolveAccountSection(m, previous, prevRows.get(m.accountId) ?? []),
  );
  const prevByAccount = new Map(prevCores.map((c) => [c.accountId, c]));

  const toSection = (
    cur: AccountSectionCore,
    prev: AccountSectionCore | null,
  ): CashFlowAccountSection => ({
    accountId: cur.accountId,
    accountLabel: cur.accountLabel,
    openingBalance: makeDelta(cur.openingBalance, prev?.openingBalance ?? null),
    cashInLines: cur.cashInLines,
    cashOutLines: cur.cashOutLines,
    totalIn: makeDelta(cur.totalIn, prev?.totalIn ?? null),
    totalOut: makeDelta(cur.totalOut, prev?.totalOut ?? null),
    closingBalance: makeDelta(cur.closingBalance, prev?.closingBalance ?? null),
    note: cur.note,
  });

  const includedCur = curCores.filter((c) => c.included);
  const accounts = includedCur.map((cur) => {
    const prev = prevByAccount.get(cur.accountId);
    // Account not open in the previous period -> no baseline ("Baru" state).
    return toSection(cur, prev && prev.included ? prev : null);
  });

  // Combined "Semua Rekening" = arithmetic sum of every included section.
  const sum = (cores: AccountSectionCore[], f: (c: AccountSectionCore) => number) =>
    cores.reduce((acc, c) => acc + f(c), 0);
  const includedPrev = prevCores.filter((c) => c.included);
  const prevAvailable = includedPrev.length > 0;

  const combinedCore: AccountSectionCore = {
    accountId: "combined",
    accountLabel: "Semua Rekening",
    openingBalance: sum(includedCur, (c) => c.openingBalance),
    cashInLines: mergeLines(includedCur, "cashInLines"),
    cashOutLines: mergeLines(includedCur, "cashOutLines"),
    totalIn: sum(includedCur, (c) => c.totalIn),
    totalOut: sum(includedCur, (c) => c.totalOut),
    closingBalance: sum(includedCur, (c) => c.closingBalance),
    note: null,
    included: true,
  };
  const combinedPrev: AccountSectionCore | null = prevAvailable
    ? {
        ...combinedCore,
        openingBalance: sum(includedPrev, (c) => c.openingBalance),
        totalIn: sum(includedPrev, (c) => c.totalIn),
        totalOut: sum(includedPrev, (c) => c.totalOut),
        closingBalance: sum(includedPrev, (c) => c.closingBalance),
      }
    : null;

  return {
    period,
    previousPeriod: previous,
    accounts,
    combined: toSection(combinedCore, combinedPrev),
    hasUnreviewed: (Number(unreviewedRows[0]?.count) || 0) > 0,
  };
}
