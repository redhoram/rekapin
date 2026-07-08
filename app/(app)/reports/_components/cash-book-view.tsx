"use client";

import { AlertCircle, ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryChip } from "@/components/categories/visuals";
import { formatDateShort, formatRupiah } from "@/lib/utils";
import type { CashBookPage, CashBookRow } from "@/lib/reports/types";
import { Money } from "./statement";
import type { ParamUpdate, ReportAccountOption } from "./types";

const COMBINED = "combined";

/** Yellow needs_review marker — the one attention cue in the ledger (§6.2). */
function ReviewMarker() {
  return (
    <AlertCircle
      size={14}
      strokeWidth={1.75}
      aria-label="Perlu ditinjau"
      className="inline shrink-0 text-[var(--yellow)]"
    />
  );
}

function CategoryCell({ row }: { row: CashBookRow }) {
  if (!row.categoryId || !row.categoryType) {
    return (
      <span className="text-xs text-[var(--text-muted)]">
        Belum terkategorisasi
      </span>
    );
  }
  return (
    <CategoryChip
      name={row.categoryName}
      type={row.categoryType}
      archived={row.categoryArchived}
    />
  );
}

/**
 * Buku Kas (design §6): running-balance ledger, per account or combined,
 * paginated via ?bkPage=. Reuses the transactions table/mobile-card grammar.
 */
export function CashBookView({
  cashBook,
  accounts,
  onParamChange,
}: {
  cashBook: CashBookPage;
  accounts: ReportAccountOption[];
  onParamChange: (update: ParamUpdate) => void;
}) {
  const combined = cashBook.accountId === COMBINED;
  const empty = cashBook.totalRows === 0;

  const from = empty ? 0 : (cashBook.page - 1) * cashBook.pageSize + 1;
  const to = Math.min(cashBook.page * cashBook.pageSize, cashBook.totalRows);
  const goToPage = (page: number) => onParamChange({ bkPage: String(page) });

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar: account selector + opening-balance anchor + row count */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={cashBook.accountId}
          onValueChange={(v) =>
            // Account change resets pagination (bkPage dropped by pushParams).
            onParamChange({ accountId: v === COMBINED ? null : v })
          }
        >
          <SelectTrigger aria-label="Pilih rekening" className="h-9 w-full sm:w-[16rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={COMBINED}>
              <span className="inline-flex items-center gap-1.5">
                <Wallet
                  size={14}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  className="text-[var(--text-muted)]"
                />
                Semua Rekening
              </span>
            </SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.bankCode} · {a.label} ·{" "}
                <span className="text-[var(--text-muted)]">
                  •••• {a.accountMask}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <p className="text-xs text-[var(--text-muted)] sm:ml-auto">
          Saldo awal (per {formatDateShort(cashBook.effectiveStart)}):{" "}
          <span className="font-medium tabular-nums text-[var(--text)]">
            {cashBook.openingBalance < 0 && "−"}
            {formatRupiah(Math.abs(cashBook.openingBalance))}
          </span>
        </p>
        <p className="text-xs tabular-nums text-[var(--text-muted)]">
          {cashBook.totalRows} transaksi
        </p>
      </div>

      <Card className="p-3">
        {empty ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-md border border-[var(--border)]">
              <Wallet
                size={20}
                strokeWidth={1.75}
                className="text-[var(--text-muted)]"
                aria-hidden="true"
              />
            </div>
            <h2 className="font-display text-xl font-bold tracking-tight text-[var(--text)]">
              Belum ada transaksi di periode ini
            </h2>
            <p className="max-w-sm text-sm text-[var(--text-muted)]">
              Coba pilih periode atau rekening lain di atas.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop ledger table */}
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Buku kas periode {cashBook.period.label}
                </caption>
                <thead>
                  <tr className="border-b border-[var(--border)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    <th scope="col" className="py-2 pr-2 text-left font-semibold">
                      Tanggal
                    </th>
                    <th scope="col" className="px-2 py-2 text-left font-semibold">
                      Deskripsi
                    </th>
                    <th scope="col" className="px-2 py-2 text-left font-semibold">
                      Kategori
                    </th>
                    {combined && (
                      <th scope="col" className="px-2 py-2 text-left font-semibold">
                        Rekening
                      </th>
                    )}
                    <th scope="col" className="px-2 py-2 text-right font-semibold">
                      Masuk
                    </th>
                    <th scope="col" className="px-2 py-2 text-right font-semibold">
                      Keluar
                    </th>
                    <th scope="col" className="py-2 pl-2 text-right font-semibold">
                      Saldo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cashBook.rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-[var(--border)] transition-colors hover:hover-wash"
                    >
                      <td className="whitespace-nowrap py-2 pr-2 tabular-nums text-[var(--text-muted)]">
                        {formatDateShort(row.date)}
                      </td>
                      <td className="max-w-[280px] px-2 py-2">
                        <span
                          className="flex items-center gap-1.5"
                          title={row.description}
                        >
                          {row.reviewStatus === "needs_review" && <ReviewMarker />}
                          <span className="truncate">{row.description}</span>
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <CategoryCell row={row} />
                      </td>
                      {combined && (
                        <td className="whitespace-nowrap px-2 py-2 text-xs text-[var(--text-muted)]">
                          {row.bankAccountLabel}
                        </td>
                      )}
                      <td className="px-2 py-2 text-right tabular-nums">
                        {row.amountIn > 0 ? (
                          formatRupiah(row.amountIn)
                        ) : (
                          <span className="text-[var(--text-muted)]">–</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {row.amountOut > 0 ? (
                          <Money value={row.amountOut} mode="cost" />
                        ) : (
                          <span className="text-[var(--text-muted)]">–</span>
                        )}
                      </td>
                      <td className="py-2 pl-2 text-right">
                        <Money
                          value={row.runningBalance}
                          mode="result"
                          className="font-medium"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <ul className="flex flex-col gap-2 md:hidden">
              {cashBook.rows.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-col gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-3"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs tabular-nums text-[var(--text-muted)]">
                      {formatDateShort(row.date)}
                    </span>
                    <Money
                      value={row.runningBalance}
                      mode="result"
                      className="font-display font-semibold"
                    />
                  </div>
                  <p className="line-clamp-2 text-sm text-[var(--text)]">
                    {row.reviewStatus === "needs_review" && (
                      <>
                        <ReviewMarker />{" "}
                      </>
                    )}
                    {row.description}
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <CategoryCell row={row} />
                      {combined && (
                        <span className="text-xs text-[var(--text-muted)]">
                          {row.bankAccountLabel}
                        </span>
                      )}
                    </span>
                    {row.amountIn > 0 ? (
                      <span className="whitespace-nowrap text-sm tabular-nums text-[var(--text)]">
                        + {formatRupiah(row.amountIn)}
                      </span>
                    ) : (
                      <Money value={row.amountOut} mode="cost" className="text-sm" />
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {/* Pagination — transactions pattern verbatim */}
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
              <p className="text-sm tabular-nums text-[var(--text-muted)]">
                Menampilkan{" "}
                <span className="font-medium text-[var(--text)]">
                  {from}–{to}
                </span>{" "}
                dari{" "}
                <span className="font-medium text-[var(--text)]">
                  {cashBook.totalRows}
                </span>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={cashBook.page <= 1}
                  onClick={() => goToPage(cashBook.page - 1)}
                >
                  <ChevronLeft size={16} strokeWidth={1.75} />
                  Sebelumnya
                </Button>
                <span className="text-sm tabular-nums text-[var(--text-muted)]">
                  Hal. {cashBook.page}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={cashBook.page >= cashBook.totalPages}
                  onClick={() => goToPage(cashBook.page + 1)}
                >
                  Berikutnya
                  <ChevronRight size={16} strokeWidth={1.75} />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
