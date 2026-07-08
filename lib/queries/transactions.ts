import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, transactions } from "@/lib/db/schema";
import type { Role } from "@/lib/constants";
import { CATEGORY_TYPES, type CategoryType } from "@/lib/categories/meta";

/** Fixed page size (not user-configurable in MVP, spec §page architecture). */
export const TRANSACTIONS_PAGE_SIZE = 25;

export type TransactionSort =
  | "date_desc"
  | "date_asc"
  | "amount_desc"
  | "amount_asc";

export interface TransactionFilters {
  page: number;
  from: string | null; // yyyy-MM-dd
  to: string | null; // yyyy-MM-dd
  bankAccountId: string | null;
  categoryId: string | null;
  categoryType: CategoryType | null;
  reviewStatus: "auto" | "reviewed" | "needs_review" | null;
  q: string | null;
  createdBy: string | null; // admin-only; ignored for staff
  sort: TransactionSort;
}

/** One row rendered in the /transactions table (serializable). */
export interface TransactionRow {
  id: string;
  date: string; // yyyy-MM-dd
  description: string;
  amount: number;
  direction: "in" | "out";
  categoryId: string | null;
  reviewStatus: "auto" | "reviewed" | "needs_review";
  source: "import" | "manual";
  bankAccountId: string;
  createdBy: string;
  uploadId: string | null;
}

export interface QueryTransactionsResult {
  rows: TransactionRow[];
  total: number; // rows matching the active filter
  page: number;
  pageSize: number;
  totalPages: number;
}

const SORT_VALUES: TransactionSort[] = [
  "date_desc",
  "date_asc",
  "amount_desc",
  "amount_asc",
];
const REVIEW_VALUES = ["auto", "reviewed", "needs_review"] as const;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function firstValue(v: string | string[] | undefined): string | null {
  const s = Array.isArray(v) ? v[0] : v;
  const t = (s ?? "").trim();
  return t === "" ? null : t;
}

/**
 * Parse raw URL searchParams into typed filters with a safe default for EVERY
 * field — invalid values fall back to their default rather than erroring (spec
 * §page architecture: a garbage `page` just becomes page 1). Pure + testable.
 * `createdBy` is kept here regardless of role; queryTransactions drops it for staff.
 */
export function parseTransactionFilters(
  params: Record<string, string | string[] | undefined>,
): TransactionFilters {
  const rawPage = Number.parseInt(firstValue(params.page) ?? "", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

  const from = firstValue(params.from);
  const to = firstValue(params.to);

  const reviewRaw = firstValue(params.reviewStatus);
  const reviewStatus = (REVIEW_VALUES as readonly string[]).includes(
    reviewRaw ?? "",
  )
    ? (reviewRaw as TransactionFilters["reviewStatus"])
    : null;

  const typeRaw = firstValue(params.categoryType);
  const categoryType = (CATEGORY_TYPES as readonly string[]).includes(
    typeRaw ?? "",
  )
    ? (typeRaw as CategoryType)
    : null;

  const sortRaw = firstValue(params.sort);
  const sort = (SORT_VALUES as string[]).includes(sortRaw ?? "")
    ? (sortRaw as TransactionSort)
    : "date_desc";

  return {
    page,
    from: from && ISO_DATE.test(from) ? from : null,
    to: to && ISO_DATE.test(to) ? to : null,
    bankAccountId: firstValue(params.bankAccountId),
    categoryId: firstValue(params.categoryId),
    categoryType,
    reviewStatus,
    q: firstValue(params.q),
    createdBy: firstValue(params.createdBy),
    sort,
  };
}

/** Format a Drizzle `date`-mode Date as a yyyy-MM-dd string (UTC, no drift). */
function toIsoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Assemble the WHERE conditions for a filtered transaction query. Factored out
 * (pure-ish; only the categoryType branch touches the DB) so the filter logic is
 * testable and shared by the page fetch + the count. `createdBy` is silently
 * dropped for staff (hide-don't-trust), never errors.
 */
async function buildConditions(
  businessId: string,
  role: Role,
  filters: TransactionFilters,
): Promise<SQL[]> {
  const conditions: SQL[] = [eq(transactions.businessId, businessId)];

  if (filters.from) conditions.push(gte(transactions.date, new Date(filters.from)));
  if (filters.to) conditions.push(lte(transactions.date, new Date(filters.to)));
  if (filters.bankAccountId)
    conditions.push(eq(transactions.bankAccountId, filters.bankAccountId));
  if (filters.categoryId)
    conditions.push(eq(transactions.categoryId, filters.categoryId));
  if (filters.reviewStatus)
    conditions.push(eq(transactions.reviewStatus, filters.reviewStatus));
  if (filters.q) {
    // ILIKE '%q%', case-insensitive. Escape LIKE metacharacters in the input.
    const escaped = filters.q.replace(/[\\%_]/g, (m) => `\\${m}`);
    conditions.push(ilike(transactions.description, `%${escaped}%`));
  }
  // createdBy is admin-only; staff's forged param is ignored, not rejected.
  if (filters.createdBy && role === "admin")
    conditions.push(eq(transactions.createdBy, filters.createdBy));

  if (filters.categoryType) {
    // Resolve which category ids have this type (≤12 per business), then filter
    // by id set — keeps the main query single-table (no join needed).
    const typeRows = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.businessId, businessId),
          eq(categories.type, filters.categoryType),
        ),
      );
    const ids = typeRows.map((r) => r.id);
    if (ids.length === 0) {
      conditions.push(sql`false`); // no category of this type → no rows
    } else {
      conditions.push(inArray(transactions.categoryId, ids));
    }
  }

  return conditions;
}

function orderBy(sort: TransactionSort) {
  switch (sort) {
    case "date_asc":
      return [asc(transactions.date), asc(transactions.createdAt)];
    case "amount_desc":
      return [desc(transactions.amount), desc(transactions.createdAt)];
    case "amount_asc":
      return [asc(transactions.amount), desc(transactions.createdAt)];
    case "date_desc":
    default:
      return [desc(transactions.date), desc(transactions.createdAt)];
  }
}

/**
 * Server-paginated, filtered, sorted transaction fetch for /transactions.
 * Business-scoped from the verified membership (never a client businessId).
 * Category + bank-account display data is resolved client-side from the lists the
 * page already fetches — this returns only raw transaction columns.
 */
export async function queryTransactions(
  businessId: string,
  role: Role,
  filters: TransactionFilters,
): Promise<QueryTransactionsResult> {
  const conditions = await buildConditions(businessId, role, filters);
  const where = and(...conditions);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transactions)
    .where(where);

  const total = count ?? 0;
  const pageSize = TRANSACTIONS_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, filters.page), totalPages);

  const rows = await db
    .select({
      id: transactions.id,
      date: transactions.date,
      description: transactions.description,
      amount: transactions.amount,
      direction: transactions.direction,
      categoryId: transactions.categoryId,
      reviewStatus: transactions.reviewStatus,
      source: transactions.source,
      bankAccountId: transactions.bankAccountId,
      createdBy: transactions.createdBy,
      uploadId: transactions.uploadId,
    })
    .from(transactions)
    .where(where)
    .orderBy(...orderBy(filters.sort))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    rows: rows.map((r) => ({
      id: r.id,
      date: toIsoDate(r.date),
      description: r.description,
      amount: r.amount,
      direction: r.direction,
      categoryId: r.categoryId,
      reviewStatus: r.reviewStatus,
      source: r.source,
      bankAccountId: r.bankAccountId,
      createdBy: r.createdBy,
      uploadId: r.uploadId,
    })),
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Count needs_review transactions for the business (indexed COUNT). Powers the
 * sidebar badge + the page-level needs_review chip.
 */
export async function countNeedsReview(businessId: string): Promise<number> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transactions)
    .where(
      and(
        eq(transactions.businessId, businessId),
        eq(transactions.reviewStatus, "needs_review"),
      ),
    );
  return count ?? 0;
}
