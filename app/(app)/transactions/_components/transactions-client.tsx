"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Plus,
  SearchX,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertStrip } from "@/components/ui/alert-strip";
import { cn } from "@/lib/utils";
import { updateTransactionCategory, deleteTransaction } from "@/actions/transactions";
import type { TransactionRow } from "@/lib/queries/transactions";
import type { TransactionsClientProps } from "./types";
import { FilterBar, ActiveFilterChips, type ParamUpdate } from "./filter-bar";
import { TransactionsTable } from "./transactions-table";
import { BulkBar } from "./bulk-bar";
import { BulkCategorizeDialog } from "./bulk-categorize-dialog";
import { ManualTransactionDialog } from "./manual-transaction-dialog";
import { DeleteTransactionDialog } from "./delete-transaction-dialog";
import {
  CorrectionRuleDialog,
  type CorrectionTarget,
} from "./correction-rule-dialog";

type CategoryOverride = { categoryId: string; reviewStatus: "reviewed" };

export function TransactionsClient(props: TransactionsClientProps) {
  const {
    result,
    totalUnfiltered,
    categories,
    accounts,
    members,
    needsReviewCount,
    role,
    currentUserId,
    filters,
    resultKey,
  } = props;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [savingIds, setSavingIds] = React.useState<Set<string>>(new Set());
  const [overrides, setOverrides] = React.useState<Map<string, CategoryOverride>>(
    new Map(),
  );
  const offeredRef = React.useRef<Set<string>>(new Set());

  const [notice, setNotice] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [manualState, setManualState] = React.useState<{
    open: boolean;
    mode: "create" | "edit";
    transaction: TransactionRow | null;
  }>({ open: false, mode: "create", transaction: null });
  const [deleteTarget, setDeleteTarget] = React.useState<TransactionRow | null>(
    null,
  );
  const [deleteBusy, setDeleteBusy] = React.useState(false);
  const [correctionTarget, setCorrectionTarget] =
    React.useState<CorrectionTarget | null>(null);

  // Page-scoped selection + optimistic overrides clear on any filter/sort/page
  // change (resultKey = serialized searchParams).
  React.useEffect(() => {
    setSelected(new Set());
    setOverrides(new Map());
  }, [resultKey]);

  const accountsById = React.useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );
  const categoriesById = React.useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const displayRows: TransactionRow[] = React.useMemo(
    () =>
      result.rows.map((r) => {
        const o = overrides.get(r.id);
        return o ? { ...r, ...o } : r;
      }),
    [result.rows, overrides],
  );

  // --- URL param helpers -----------------------------------------------------

  const pushParams = React.useCallback(
    (update: ParamUpdate) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(update)) {
        if (v === null) params.delete(k);
        else params.set(k, v);
      }
      if (!("page" in update)) params.delete("page"); // filter change → page 1
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, pathname, router],
  );

  const resetAll = React.useCallback(() => {
    const params = new URLSearchParams();
    if (filters.sort !== "date_desc") params.set("sort", filters.sort);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [filters.sort, pathname, router]);

  const handleSort = (column: "date" | "amount") => {
    const next =
      filters.sort === `${column}_desc` ? `${column}_asc` : `${column}_desc`;
    pushParams({ sort: next });
  };

  const goToPage = (page: number) => pushParams({ page: String(page) });

  // --- Selection -------------------------------------------------------------

  const toggleRow = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    setSelected(() => (checked ? new Set(result.rows.map((r) => r.id)) : new Set()));
  };

  // --- Inline category edit (optimistic + rule offer) ------------------------

  const handleCategoryChange = async (
    row: TransactionRow,
    categoryId: string,
  ) => {
    if (row.categoryId === categoryId) return;
    setError(null);
    setNotice(null);
    setOverrides((prev) =>
      new Map(prev).set(row.id, { categoryId, reviewStatus: "reviewed" }),
    );
    setSavingIds((prev) => new Set(prev).add(row.id));

    const revert = () =>
      setOverrides((prev) => {
        const m = new Map(prev);
        m.delete(row.id);
        return m;
      });

    try {
      const res = await updateTransactionCategory(row.id, categoryId);
      if (res.ok) {
        router.refresh(); // reconcile needs_review counts in the background
        if (!offeredRef.current.has(row.id)) {
          offeredRef.current.add(row.id);
          const cat = categoriesById.get(categoryId);
          if (cat) {
            setCorrectionTarget({ description: row.description, category: cat });
          }
        }
      } else {
        revert();
        setError(res.error);
      }
    } catch {
      revert();
      setError("Gagal menyimpan kategori. Coba lagi.");
    } finally {
      setSavingIds((prev) => {
        const s = new Set(prev);
        s.delete(row.id);
        return s;
      });
    }
  };

  // --- Delete ----------------------------------------------------------------

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setError(null);
    try {
      const res = await deleteTransaction(deleteTarget.id);
      if (res.ok) {
        setDeleteTarget(null);
        setNotice("Transaksi dihapus.");
        router.refresh();
      } else {
        setDeleteTarget(null);
        setError(res.error);
      }
    } catch {
      setDeleteTarget(null);
      setError("Gagal menghapus transaksi. Coba lagi.");
    } finally {
      setDeleteBusy(false);
    }
  };

  // --- Derived ---------------------------------------------------------------

  const selectedCount = selected.size;
  const isFiltered = result.total !== totalUnfiltered;
  const noDataAtAll = totalUnfiltered === 0;
  const emptyFilter = !noDataAtAll && result.total === 0;

  const from = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const to = Math.min(result.page * result.pageSize, result.total);

  const needsReviewActive = filters.reviewStatus === "needs_review";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text)] md:text-3xl">
            Transaksi
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Kelola dan kategorikan semua transaksi bisnismu.
          </p>
          <p className="mt-1 text-xs tabular-nums text-[var(--text-muted)]">
            {result.total} transaksi
            {isFiltered && ` (dari ${totalUnfiltered})`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 max-md:w-full">
          {needsReviewCount > 0 && (
            <button
              type="button"
              onClick={() =>
                pushParams({
                  reviewStatus: needsReviewActive ? null : "needs_review",
                })
              }
              aria-pressed={needsReviewActive}
              aria-label={`${needsReviewCount} transaksi perlu ditinjau — tampilkan`}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--text)] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--yellow)]",
                needsReviewActive ? "hover-wash" : "hover:hover-wash",
              )}
            >
              <AlertCircle
                size={14}
                strokeWidth={1.75}
                className="text-[var(--yellow)]"
                aria-hidden="true"
              />
              Perlu ditinjau · {needsReviewCount}
            </button>
          )}
          <Button
            variant={selectedCount > 0 ? "secondary" : "primary"}
            size="sm"
            className="max-md:w-full"
            onClick={() =>
              setManualState({ open: true, mode: "create", transaction: null })
            }
          >
            <Plus size={16} strokeWidth={1.75} />
            Tambah transaksi
          </Button>
        </div>
      </div>

      {notice && (
        <p aria-live="polite" className="text-sm text-[var(--text-muted)]">
          {notice}
        </p>
      )}
      {error && <AlertStrip>{error}</AlertStrip>}

      {noDataAtAll ? (
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-md border border-[var(--border)]">
            <ArrowLeftRight
              size={20}
              strokeWidth={1.75}
              className="text-[var(--text-muted)]"
              aria-hidden="true"
            />
          </div>
          <h2 className="font-display text-xl font-bold tracking-tight text-[var(--text)]">
            Belum ada transaksi
          </h2>
          <p className="max-w-sm text-sm text-[var(--text-muted)]">
            Unggah mutasi rekening atau tambahkan transaksi manual untuk mulai
            mencatat keuangan bisnismu.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="primary" size="sm" asChild>
              <Link href="/upload">Ke halaman Upload</Link>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setManualState({ open: true, mode: "create", transaction: null })
              }
            >
              Tambah transaksi manual
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <FilterBar
            filters={filters}
            categories={categories}
            accounts={accounts}
            members={members}
            role={role}
            onParamChange={pushParams}
          />
          <ActiveFilterChips
            filters={filters}
            categories={categories}
            accounts={accounts}
            members={members}
            onParamChange={pushParams}
            onResetAll={resetAll}
          />

          {emptyFilter ? (
            <Card className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-md border border-[var(--border)]">
                <SearchX
                  size={20}
                  strokeWidth={1.75}
                  className="text-[var(--text-muted)]"
                  aria-hidden="true"
                />
              </div>
              <h2 className="font-display text-xl font-bold tracking-tight text-[var(--text)]">
                Tidak ada transaksi yang cocok
              </h2>
              <p className="max-w-sm text-sm text-[var(--text-muted)]">
                Coba ubah kata kunci atau atur ulang filternya.
              </p>
              <Button variant="secondary" size="sm" onClick={resetAll}>
                Reset filter
              </Button>
            </Card>
          ) : (
            <Card className="p-3">
              <TransactionsTable
                rows={displayRows}
                categories={categories}
                accountsById={accountsById}
                role={role}
                currentUserId={currentUserId}
                filters={filters}
                selected={selected}
                savingIds={savingIds}
                onToggleRow={toggleRow}
                onToggleAll={toggleAll}
                onCategoryChange={handleCategoryChange}
                onSort={handleSort}
                onEdit={(row) =>
                  setManualState({ open: true, mode: "edit", transaction: row })
                }
                onDelete={(row) => setDeleteTarget(row)}
              />

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
                <p className="text-sm tabular-nums text-[var(--text-muted)]">
                  Menampilkan{" "}
                  <span className="font-medium text-[var(--text)]">
                    {from}–{to}
                  </span>{" "}
                  dari{" "}
                  <span className="font-medium text-[var(--text)]">
                    {result.total}
                  </span>
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={result.page <= 1}
                    onClick={() => goToPage(result.page - 1)}
                  >
                    <ChevronLeft size={16} strokeWidth={1.75} />
                    Sebelumnya
                  </Button>
                  <span className="text-sm tabular-nums text-[var(--text-muted)]">
                    Hal. {result.page}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={result.page >= result.totalPages}
                    onClick={() => goToPage(result.page + 1)}
                  >
                    Berikutnya
                    <ChevronRight size={16} strokeWidth={1.75} />
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Bulk bar + dialogs */}
      <BulkBar
        count={selectedCount}
        onCategorize={() => setBulkOpen(true)}
        onClear={() => setSelected(new Set())}
      />

      <BulkCategorizeDialog
        open={bulkOpen}
        count={selectedCount}
        ids={Array.from(selected)}
        categories={categories}
        onOpenChange={setBulkOpen}
        onDone={(message) => {
          setSelected(new Set());
          setNotice(message);
          router.refresh();
        }}
      />

      <ManualTransactionDialog
        open={manualState.open}
        mode={manualState.mode}
        transaction={manualState.transaction}
        accounts={accounts}
        categories={categories}
        onOpenChange={(open) =>
          setManualState((s) => ({ ...s, open }))
        }
        onDone={(message) => {
          setNotice(message);
          router.refresh();
        }}
      />

      <DeleteTransactionDialog
        open={deleteTarget !== null}
        description={deleteTarget?.description ?? ""}
        amount={deleteTarget?.amount ?? 0}
        busy={deleteBusy}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
      />

      <CorrectionRuleDialog
        target={correctionTarget}
        role={role}
        onOpenChange={(open) => {
          if (!open) setCorrectionTarget(null);
        }}
        onDone={(message) => setNotice(message)}
      />
    </div>
  );
}
