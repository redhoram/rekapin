"use client";

import { Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/**
 * Floating bulk-action bar (design §3.8). Appears when ≥1 row is selected. When
 * active this holds the surface's single yellow action ("Kategorikan") — the
 * header "Tambah transaksi" drops to secondary so yellow never doubles up.
 * Slide-up + fade in/out (disabled under prefers-reduced-motion globally).
 */
export function BulkBar({
  count,
  onCategorize,
  onClear,
}: {
  count: number;
  onCategorize: () => void;
  onClear: () => void;
}) {
  const visible = count > 0;
  return (
    <div
      role="region"
      aria-label="Aksi transaksi terpilih"
      aria-hidden={!visible}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex justify-center transition-all duration-200 ease-out md:inset-x-auto md:bottom-4 md:left-1/2 md:-translate-x-1/2",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0",
      )}
    >
      <div className="flex w-full items-center gap-3 border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2.5 shadow-[0_10px_28px_-10px_rgba(10,10,10,0.14)] dark:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.45)] max-md:rounded-none md:w-auto md:rounded-xl">
        <span
          aria-live="polite"
          className="text-sm font-medium tabular-nums text-[var(--text)]"
        >
          {count} dipilih
        </span>
        <Separator orientation="vertical" className="h-5" />
        <Button variant="primary" size="sm" onClick={onCategorize}>
          <Tag size={16} strokeWidth={1.75} />
          Kategorikan
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          aria-label="Batalkan pilihan"
        >
          Batal pilih
        </Button>
      </div>
    </div>
  );
}
