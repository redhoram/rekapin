import type { CategoryDTO } from "@/lib/categories/types";
import type {
  QueryTransactionsResult,
  TransactionFilters,
  TransactionRow,
} from "@/lib/queries/transactions";
import type { Role } from "@/lib/constants";

export interface AccountOption {
  id: string;
  bankCode: string;
  label: string;
  accountMask: string;
}

export interface MemberOption {
  userId: string;
  name: string;
}

export interface TransactionsClientProps {
  result: QueryTransactionsResult;
  totalUnfiltered: number;
  categories: CategoryDTO[];
  accounts: AccountOption[];
  members: MemberOption[];
  needsReviewCount: number;
  role: Role;
  currentUserId: string;
  filters: TransactionFilters;
  /** Serialized searchParams — changes clear page-scoped selection + overrides. */
  resultKey: string;
}

export type { CategoryDTO, TransactionRow, TransactionFilters };
