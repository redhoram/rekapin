"use client";

import {
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ReviewStatusChip,
  SourceLabel,
  DirectionTag,
} from "@/components/categories/visuals";
import { cn, formatDateShort, formatRupiah } from "@/lib/utils";
import type { CategoryDTO } from "@/lib/categories/types";
import type {
  TransactionFilters,
  TransactionRow,
  TransactionSort,
} from "@/lib/queries/transactions";
import type { Role } from "@/lib/constants";
import type { AccountOption } from "./types";
import { CategoryCell } from "./category-cell";

function bankLabel(
  accountsById: Map<string, AccountOption>,
  id: string,
): string {
  const a = accountsById.get(id);
  return a ? `${a.bankCode} · ${a.label}` : "—";
}

/** Whether staff may delete this row (server enforces too — hide-don't-trust). */
function canDelete(
  row: TransactionRow,
  role: Role,
  currentUserId: string,
): boolean {
  if (role === "admin") return true;
  return row.source === "manual" && row.createdBy === currentUserId;
}

function RowActions({
  row,
  role,
  currentUserId,
  onEdit,
  onDelete,
}: {
  row: TransactionRow;
  role: Role;
  currentUserId: string;
  onEdit: (row: TransactionRow) => void;
  onDelete: (row: TransactionRow) => void;
}) {
  const deletable = canDelete(row, role, currentUserId);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Aksi transaksi ${row.description}`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--text-muted)] outline-none transition-colors hover:hover-wash focus-visible:ring-2 focus-visible:ring-[var(--yellow)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-card)]"
        >
          <MoreHorizontal size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <button type="button" className="w-full" onClick={() => onEdit(row)}>
            <Pencil size={16} strokeWidth={1.75} aria-hidden="true" />
            Edit
          </button>
        </DropdownMenuItem>
        {deletable && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <button
                type="button"
                className="w-full"
                onClick={() => onDelete(row)}
              >
                <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                Hapus
              </button>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SortHeader({
  label,
  column,
  align,
  sort,
  onSort,
}: {
  label: string;
  column: "date" | "amount";
  align: "left" | "right";
  sort: TransactionSort;
  onSort: (column: "date" | "amount") => void;
}) {
  const isActive = sort.startsWith(column);
  const isDesc = sort === `${column}_desc`;
  const ariaSort = isActive ? (isDesc ? "descending" : "ascending") : "none";
  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={cn(
        "px-3 py-2 font-semibold",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "inline-flex items-center gap-1 rounded outline-none transition-colors hover:text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--yellow)]",
          align === "right" && "flex-row-reverse",
        )}
      >
        {label}
        {isActive &&
          (isDesc ? (
            <ChevronDown size={12} strokeWidth={2} aria-hidden="true" />
          ) : (
            <ChevronUp size={12} strokeWidth={2} aria-hidden="true" />
          ))}
      </button>
    </th>
  );
}

export function TransactionsTable({
  rows,
  categories,
  accountsById,
  role,
  currentUserId,
  filters,
  selected,
  savingIds,
  onToggleRow,
  onToggleAll,
  onCategoryChange,
  onSort,
  onEdit,
  onDelete,
}: {
  rows: TransactionRow[];
  categories: CategoryDTO[];
  accountsById: Map<string, AccountOption>;
  role: Role;
  currentUserId: string;
  filters: TransactionFilters;
  selected: Set<string>;
  savingIds: Set<string>;
  onToggleRow: (id: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  onCategoryChange: (row: TransactionRow, categoryId: string) => void;
  onSort: (column: "date" | "amount") => void;
  onEdit: (row: TransactionRow) => void;
  onDelete: (row: TransactionRow) => void;
}) {
  const pageIds = rows.map((r) => r.id);
  const selectedOnPage = pageIds.filter((id) => selected.has(id)).length;
  const allSelected = pageIds.length > 0 && selectedOnPage === pageIds.length;
  const someSelected = selectedOnPage > 0 && !allSelected;

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Daftar transaksi</caption>
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              <th scope="col" className="w-10 px-3 py-2 text-center">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onCheckedChange={onToggleAll}
                  aria-label="Pilih semua transaksi di halaman ini"
                />
              </th>
              <SortHeader
                label="Tanggal"
                column="date"
                align="left"
                sort={filters.sort}
                onSort={onSort}
              />
              <th scope="col" className="max-w-[320px] px-3 py-2 font-semibold">
                Deskripsi
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                Rekening
              </th>
              <th scope="col" className="min-w-[200px] px-3 py-2 font-semibold">
                Kategori
              </th>
              <SortHeader
                label="Jumlah"
                column="amount"
                align="right"
                sort={filters.sort}
                onSort={onSort}
              />
              <th scope="col" className="px-3 py-2 font-semibold">
                Status
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                Sumber
              </th>
              <th scope="col" className="w-10 px-3 py-2 text-right font-semibold">
                <span className="sr-only">Aksi</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isSelected = selected.has(row.id);
              return (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b border-[var(--border)] transition-colors hover:hover-wash",
                    isSelected && "hover-wash",
                  )}
                >
                  <td className="px-3 py-2.5 text-center">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(c) => onToggleRow(row.id, c)}
                      aria-label={`Pilih transaksi ${row.description}`}
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-[var(--text)]">
                    {formatDateShort(row.date)}
                  </td>
                  <td className="max-w-[320px] px-3 py-2.5">
                    <span
                      className="block truncate text-[var(--text)]"
                      title={row.description}
                    >
                      {row.description}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-[var(--text-muted)]">
                    {bankLabel(accountsById, row.bankAccountId)}
                  </td>
                  <td className="px-3 py-2.5">
                    <CategoryCell
                      description={row.description}
                      categoryId={row.categoryId}
                      categories={categories}
                      saving={savingIds.has(row.id)}
                      onChange={(categoryId) => onCategoryChange(row, categoryId)}
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                    <span className="block font-medium text-[var(--text)]">
                      {formatRupiah(row.amount)}
                    </span>
                    <span className="mt-0.5 flex justify-end">
                      <DirectionTag direction={row.direction} />
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <ReviewStatusChip status={row.reviewStatus} />
                  </td>
                  <td className="px-3 py-2.5">
                    <SourceLabel source={row.source} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <RowActions
                      row={row}
                      role={role}
                      currentUserId={currentUserId}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <ul className="flex flex-col gap-2 md:hidden">
        {rows.map((row) => {
          const isSelected = selected.has(row.id);
          return (
            <li
              key={row.id}
              className={cn(
                "rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-3",
                isSelected && "hover-wash",
              )}
            >
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(c) => onToggleRow(row.id, c)}
                  aria-label={`Pilih transaksi ${row.description}`}
                />
                <span className="text-xs tabular-nums text-[var(--text-muted)]">
                  {formatDateShort(row.date)}
                </span>
                <span className="ml-auto flex items-center gap-1">
                  <ReviewStatusChip status={row.reviewStatus} />
                  <RowActions
                    row={row}
                    role={role}
                    currentUserId={currentUserId}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                </span>
              </div>
              <p className="mt-1.5 line-clamp-2 text-sm text-[var(--text)]">
                {row.description}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <span>{bankLabel(accountsById, row.bankAccountId)}</span>
                <span aria-hidden="true">·</span>
                <SourceLabel source={row.source} />
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <CategoryCell
                  description={row.description}
                  categoryId={row.categoryId}
                  categories={categories}
                  saving={savingIds.has(row.id)}
                  onChange={(categoryId) => onCategoryChange(row, categoryId)}
                />
                <span className="text-right tabular-nums">
                  <span className="block text-sm font-medium text-[var(--text)]">
                    {formatRupiah(row.amount)}
                  </span>
                  <span className="mt-0.5 flex justify-end">
                    <DirectionTag direction={row.direction} />
                  </span>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
