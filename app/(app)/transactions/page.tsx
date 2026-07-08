import { eq, sql } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { bankAccounts, businessMembers, transactions, user } from "@/lib/db/schema";
import { listCategories } from "@/actions/categories";
import {
  queryTransactions,
  countNeedsReview,
  parseTransactionFilters,
} from "@/lib/queries/transactions";
import { TransactionsClient } from "./_components/transactions-client";
import type { AccountOption, MemberOption } from "./_components/types";

// URL searchParams are the single source of truth for filters/sort/page (spec
// §page architecture). This server component parses them, fetches the page of
// data + option lists, then hands off to the client for interaction.
export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { businessId, role, userId } = await requireRole(["admin", "staff"]);
  const sp = await searchParams;
  const filters = parseTransactionFilters(sp);

  const [result, categories, accountRows, needsReviewCount, unfilteredRow] =
    await Promise.all([
      queryTransactions(businessId, role, filters),
      listCategories(),
      db
        .select({
          id: bankAccounts.id,
          bankCode: bankAccounts.bankCode,
          label: bankAccounts.label,
          accountMask: bankAccounts.accountMask,
        })
        .from(bankAccounts)
        .where(eq(bankAccounts.businessId, businessId)),
      countNeedsReview(businessId),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(transactions)
        .where(eq(transactions.businessId, businessId)),
    ]);

  const accounts: AccountOption[] = accountRows;

  // createdBy filter is admin-only (spec DECISION #2). Fetch member names only
  // for admin; staff never sees the control and the query ignores the param.
  let members: MemberOption[] = [];
  if (role === "admin") {
    const memberRows = await db
      .select({ userId: businessMembers.userId, name: user.name })
      .from(businessMembers)
      .innerJoin(user, eq(businessMembers.userId, user.id))
      .where(eq(businessMembers.businessId, businessId));
    members = memberRows;
  }

  const totalUnfiltered = unfilteredRow[0]?.count ?? 0;
  const resultKey = JSON.stringify(filters);

  return (
    <TransactionsClient
      result={result}
      totalUnfiltered={totalUnfiltered}
      categories={categories}
      accounts={accounts}
      members={members}
      needsReviewCount={needsReviewCount}
      role={role}
      currentUserId={userId}
      filters={filters}
      resultKey={resultKey}
    />
  );
}
