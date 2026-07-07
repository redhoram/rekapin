"use client";

import * as React from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { cn, formatDateShort, formatRupiah } from "@/lib/utils";
import type { Direction, PreviewRow } from "@/lib/parsing/types";
import { StatusChip } from "./status-chip";
import { FilterTabs, type FilterKey, type FilterCounts } from "./filter-tabs";

function ArahCell({ direction }: { direction: Direction | null }) {
  if (!direction) return <span className="text-[var(--text-muted)]">—</span>;
  const Icon = direction === "in" ? ArrowDownLeft : ArrowUpRight;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <Icon
        size={16}
        strokeWidth={1.75}
        aria-hidden="true"
        className="text-[var(--text-muted)]"
      />
      {direction === "in" ? "Masuk" : "Keluar"}
    </span>
  );
}

function dupSubLabel(row: PreviewRow): string | undefined {
  if (row.status !== "duplicate") return undefined;
  return row.dupAgainstDb ? "sudah ada" : undefined;
}

/**
 * Preview table (design §C3 + §C4): filter tabs + desktop table + mobile card
 * list. Rows arrive already capped (≤50) and prioritized (Gagal → Duplikat →
 * Valid) from the server. Tab counts reflect the FULL parse, not just shown rows.
 */
export function PreviewTable({
  rows,
  counts,
  totalRowCount,
}: {
  rows: PreviewRow[];
  counts: FilterCounts;
  totalRowCount: number;
}) {
  const [filter, setFilter] = React.useState<FilterKey>("all");

  const visible = React.useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter],
  );

  const capped = rows.length < totalRowCount;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterTabs active={filter} onChange={setFilter} counts={counts} />
        {counts.failed > 0 && (
          <p className="text-xs font-medium text-[var(--text-muted)]">
            Ada masalah — cek tab <span className="text-[var(--text)]">Gagal</span>.
          </p>
        )}
      </div>

      <div aria-live="polite">
        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">
              Pratinjau transaksi hasil parsing
            </caption>
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                <th scope="col" className="px-3 py-2 font-semibold">
                  Tanggal
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Deskripsi
                </th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">
                  Jumlah
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Arah
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const dim = row.status === "duplicate";
                return (
                  <tr
                    key={row.rowNumber}
                    className={cn(
                      "border-b border-[var(--border)] transition-colors hover:hover-wash",
                      dim ? "text-[var(--text-muted)]" : "text-[var(--text)]",
                    )}
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">
                      {row.date ? formatDateShort(row.date) : "—"}
                    </td>
                    <td className="max-w-[280px] px-3 py-2.5">
                      <span className="block truncate">{row.description || "—"}</span>
                      {row.status === "failed" && row.reason && (
                        <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                          {row.reason}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                      {row.amount !== null ? formatRupiah(row.amount) : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <ArahCell direction={row.direction} />
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusChip status={row.status} subLabel={dupSubLabel(row)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <ul className="flex flex-col gap-2 md:hidden">
          {visible.map((row) => {
            const dim = row.status === "duplicate";
            return (
              <li
                key={row.rowNumber}
                className={cn(
                  "rounded-md border border-[var(--border)] p-3",
                  row.status === "failed" && "border-l-2 border-l-[var(--yellow)]",
                  dim ? "text-[var(--text-muted)]" : "text-[var(--text)]",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <ArahCell direction={row.direction} />
                  <StatusChip status={row.status} subLabel={dupSubLabel(row)} />
                </div>
                <p className="mt-1.5 line-clamp-2 text-sm">
                  {row.description || "—"}
                </p>
                {row.status === "failed" && row.reason && (
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {row.reason}
                  </p>
                )}
                <p className="mt-1 text-sm tabular-nums">
                  {row.amount !== null ? formatRupiah(row.amount) : "—"}
                </p>
              </li>
            );
          })}
        </ul>

        {visible.length === 0 && (
          <p className="py-6 text-center text-sm text-[var(--text-muted)]">
            Tidak ada baris pada filter ini.
          </p>
        )}
      </div>

      {capped && (
        <p className="text-xs text-[var(--text-muted)]">
          Menampilkan {rows.length} dari {totalRowCount} baris. Semua baris valid
          tetap ikut tersimpan.
        </p>
      )}
    </div>
  );
}
