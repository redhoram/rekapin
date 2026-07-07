"use client";

import { cn } from "@/lib/utils";

export type FilterKey = "all" | "valid" | "duplicate" | "failed";

export interface FilterCounts {
  all: number;
  valid: number;
  duplicate: number;
  failed: number;
}

const TABS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "valid", label: "Valid" },
  { key: "duplicate", label: "Duplikat" },
  { key: "failed", label: "Gagal" },
];

// Segmented control (design §7.6). Active tab is raised via bg contrast, NOT
// yellow — yellow stays on the Commit action + focus rings.
export function FilterTabs({
  active,
  onChange,
  counts,
}: {
  active: FilterKey;
  onChange: (key: FilterKey) => void;
  counts: FilterCounts;
}) {
  return (
    <div
      role="tablist"
      aria-label="Filter baris pratinjau"
      className="inline-flex rounded-md border border-[var(--border)] bg-[var(--bg)] p-0.5"
    >
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={cn(
              "rounded-[6px] px-3 py-1 text-xs font-medium outline-none transition-colors",
              "focus-visible:ring-2 focus-visible:ring-[var(--yellow)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg)]",
              isActive
                ? "bg-[var(--bg-card)] text-[var(--text)]"
                : "text-[var(--text-muted)] hover:hover-wash",
            )}
          >
            {tab.label} · {counts[tab.key]}
          </button>
        );
      })}
    </div>
  );
}
