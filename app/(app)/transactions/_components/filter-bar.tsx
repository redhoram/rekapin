"use client";

import * as React from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CategorySelect,
  CATEGORY_ALL,
} from "@/components/categories/category-select";
import { TypeIcon } from "@/components/categories/visuals";
import { cn, formatDateShort } from "@/lib/utils";
import {
  CATEGORY_TYPES_ORDERED,
  CATEGORY_TYPE_META,
} from "@/lib/categories/meta";
import type { CategoryDTO } from "@/lib/categories/types";
import type { TransactionFilters } from "@/lib/queries/transactions";
import type { AccountOption, MemberOption } from "./types";
import type { Role } from "@/lib/constants";

const ALL = "all";

const SORT_OPTIONS = [
  { value: "date_desc", label: "Terbaru" },
  { value: "date_asc", label: "Terlama" },
  { value: "amount_desc", label: "Nominal terbesar" },
  { value: "amount_asc", label: "Nominal terkecil" },
] as const;

const STATUS_OPTIONS = [
  { value: "needs_review", label: "Perlu ditinjau" },
  { value: "auto", label: "Otomatis" },
  { value: "reviewed", label: "Ditinjau" },
] as const;

export type ParamUpdate = Record<string, string | null>;

function countActiveFilters(f: TransactionFilters): number {
  let n = 0;
  if (f.from) n++;
  if (f.to) n++;
  if (f.bankAccountId) n++;
  if (f.categoryId) n++;
  if (f.categoryType) n++;
  if (f.reviewStatus) n++;
  if (f.q) n++;
  if (f.createdBy) n++;
  return n;
}

export function FilterBar({
  filters,
  categories,
  accounts,
  members,
  role,
  onParamChange,
}: {
  filters: TransactionFilters;
  categories: CategoryDTO[];
  accounts: AccountOption[];
  members: MemberOption[];
  role: Role;
  onParamChange: (update: ParamUpdate) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [q, setQ] = React.useState(filters.q ?? "");

  // Sync the search box from the URL when NOT actively editing (back/forward,
  // reset) — never clobbers live typing.
  React.useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setQ(filters.q ?? "");
    }
  }, [filters.q]);

  // Debounced search push (300ms). Filter/sort selects apply instantly.
  React.useEffect(() => {
    const val = q.trim();
    if ((val || null) === (filters.q ?? null)) return;
    const t = setTimeout(() => onParamChange({ q: val || null }), 300);
    return () => clearTimeout(t);
  }, [q, filters.q, onParamChange]);

  const activeCount = countActiveFilters(filters);

  const accountValue = filters.bankAccountId ?? ALL;
  const typeValue = filters.categoryType ?? ALL;
  const statusValue = filters.reviewStatus ?? ALL;
  const createdByValue = filters.createdBy ?? ALL;
  const categoryValue = filters.categoryId ?? CATEGORY_ALL;

  const filterControls = (
    <div className="flex flex-wrap items-end gap-3">
      {/* Periode */}
      <div className="flex items-end gap-2">
        <div>
          <Label htmlFor="filter-from" className="sr-only">
            Dari tanggal
          </Label>
          <Input
            id="filter-from"
            type="date"
            aria-label="Dari tanggal"
            className="h-9 w-[9.5rem]"
            value={filters.from ?? ""}
            onChange={(e) => onParamChange({ from: e.target.value || null })}
          />
        </div>
        <span className="pb-2 text-xs text-[var(--text-muted)]">–</span>
        <div>
          <Label htmlFor="filter-to" className="sr-only">
            Sampai tanggal
          </Label>
          <Input
            id="filter-to"
            type="date"
            aria-label="Sampai tanggal"
            className="h-9 w-[9.5rem]"
            value={filters.to ?? ""}
            onChange={(e) => onParamChange({ to: e.target.value || null })}
          />
        </div>
      </div>

      {/* Rekening */}
      <Select
        value={accountValue}
        onValueChange={(v) =>
          onParamChange({ bankAccountId: v === ALL ? null : v })
        }
      >
        <SelectTrigger
          aria-label="Filter rekening"
          className="h-9 w-[12rem]"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua rekening</SelectItem>
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

      {/* Kategori (includes archived) */}
      <CategorySelect
        mode="filter"
        categories={categories}
        value={categoryValue}
        onValueChange={(v) =>
          onParamChange({ categoryId: v === CATEGORY_ALL ? null : v })
        }
        ariaLabel="Filter kategori"
        leadingItem={{ value: CATEGORY_ALL, label: "Semua kategori" }}
        triggerClassName="h-9 w-[13rem]"
      />

      {/* Tipe */}
      <Select
        value={typeValue}
        onValueChange={(v) =>
          onParamChange({ categoryType: v === ALL ? null : v })
        }
      >
        <SelectTrigger aria-label="Filter tipe kategori" className="h-9 w-[11rem]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua tipe</SelectItem>
          {CATEGORY_TYPES_ORDERED.map((type) => (
            <SelectItem key={type} value={type}>
              <span className="inline-flex items-center gap-1.5">
                <TypeIcon type={type} />
                {CATEGORY_TYPE_META[type].label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status */}
      <Select
        value={statusValue}
        onValueChange={(v) =>
          onParamChange({ reviewStatus: v === ALL ? null : v })
        }
      >
        <SelectTrigger aria-label="Filter status tinjau" className="h-9 w-[11rem]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua status</SelectItem>
          {STATUS_OPTIONS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Dibuat oleh — admin only */}
      {role === "admin" && (
        <Select
          value={createdByValue}
          onValueChange={(v) =>
            onParamChange({ createdBy: v === ALL ? null : v })
          }
        >
          <SelectTrigger aria-label="Filter dibuat oleh" className="h-9 w-[12rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua anggota</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.userId} value={m.userId}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );

  return (
    <Card className="flex flex-col gap-3 p-3">
      {/* Row 1: search + sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={16}
            strokeWidth={1.75}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <Input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari deskripsi transaksi…"
            aria-label="Cari transaksi"
            className="h-9 pl-9 pr-9"
          />
          {q && (
            <button
              type="button"
              aria-label="Hapus pencarian"
              onClick={() => {
                setQ("");
                onParamChange({ q: null });
                inputRef.current?.focus();
              }}
              className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-[var(--text-muted)] outline-none transition-colors hover:hover-wash focus-visible:ring-2 focus-visible:ring-[var(--yellow)]"
            >
              <X size={14} strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}
        </div>

        <Select
          value={filters.sort}
          onValueChange={(v) => onParamChange({ sort: v })}
        >
          <SelectTrigger
            aria-label="Urutkan transaksi"
            className="h-9 w-full sm:w-[12rem]"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Row 2 (md+): all filters inline. */}
      <div className="hidden md:block">{filterControls}</div>

      {/* Mobile: disclosure. */}
      <details className="md:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-1 py-1 text-sm text-[var(--text)] outline-none [&::-webkit-details-marker]:hidden">
          <SlidersHorizontal size={16} strokeWidth={1.75} aria-hidden="true" />
          Filter
          {activeCount > 0 && (
            <span className="text-[var(--text-muted)]">· {activeCount}</span>
          )}
        </summary>
        <div className="mt-3">{filterControls}</div>
      </details>
    </Card>
  );
}

/** Active-filter chip row + "Reset semua" (design §3.3). */
export function ActiveFilterChips({
  filters,
  categories,
  accounts,
  members,
  onParamChange,
  onResetAll,
}: {
  filters: TransactionFilters;
  categories: CategoryDTO[];
  accounts: AccountOption[];
  members: MemberOption[];
  onParamChange: (update: ParamUpdate) => void;
  onResetAll: () => void;
}) {
  const chips: { key: string; label: string; clear: ParamUpdate }[] = [];

  if (filters.from || filters.to) {
    const parts: string[] = [];
    if (filters.from) parts.push(formatDateShort(filters.from));
    parts.push("–");
    if (filters.to) parts.push(formatDateShort(filters.to));
    chips.push({
      key: "period",
      label: `Periode: ${parts.join(" ")}`,
      clear: { from: null, to: null },
    });
  }
  if (filters.bankAccountId) {
    const a = accounts.find((x) => x.id === filters.bankAccountId);
    chips.push({
      key: "account",
      label: `Rekening: ${a ? `${a.bankCode} · ${a.label}` : "—"}`,
      clear: { bankAccountId: null },
    });
  }
  if (filters.categoryId) {
    const c = categories.find((x) => x.id === filters.categoryId);
    chips.push({
      key: "category",
      label: `Kategori: ${c?.name ?? "—"}`,
      clear: { categoryId: null },
    });
  }
  if (filters.categoryType) {
    chips.push({
      key: "type",
      label: `Tipe: ${CATEGORY_TYPE_META[filters.categoryType].label}`,
      clear: { categoryType: null },
    });
  }
  if (filters.reviewStatus) {
    const s = STATUS_OPTIONS.find((x) => x.value === filters.reviewStatus);
    chips.push({
      key: "status",
      label: `Status: ${s?.label ?? "—"}`,
      clear: { reviewStatus: null },
    });
  }
  if (filters.q) {
    chips.push({
      key: "q",
      label: `Cari: "${filters.q}"`,
      clear: { q: null },
    });
  }
  if (filters.createdBy) {
    const m = members.find((x) => x.userId === filters.createdBy);
    chips.push({
      key: "createdBy",
      label: `Dibuat oleh: ${m?.name ?? "—"}`,
      clear: { createdBy: null },
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg)] px-2 py-0.5 text-xs text-[var(--text)]"
        >
          {chip.label}
          <button
            type="button"
            aria-label={`Hapus filter ${chip.label}`}
            onClick={() => onParamChange(chip.clear)}
            className={cn(
              "-mr-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-[var(--text-muted)] outline-none transition-colors",
              "hover:hover-wash focus-visible:ring-2 focus-visible:ring-[var(--yellow)]",
            )}
          >
            <X size={12} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </span>
      ))}
      <Button variant="link" size="sm" className="h-auto p-0" onClick={onResetAll}>
        Reset semua
      </Button>
    </div>
  );
}
