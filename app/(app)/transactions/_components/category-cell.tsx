"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown, Loader2, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { SelectContent } from "@/components/ui/select";
import { CategoryGroups } from "@/components/categories/category-select";
import { CategoryChip } from "@/components/categories/visuals";
import type { CategoryDTO } from "@/lib/categories/types";

const Select = SelectPrimitive.Root;

/**
 * Inline-editable category cell (design §3.6). The CategoryChip (or a dashed
 * placeholder when uncategorized) is itself the Select trigger. Save is optimistic
 * + a server round-trip handled by the parent (`onChange`); while saving the chip
 * dims and shows a spinner. Radix Select provides keyboard + type-ahead + the
 * yellow focus ring for free.
 */
export function CategoryCell({
  description,
  categoryId,
  categories,
  saving,
  onChange,
}: {
  description: string;
  categoryId: string | null;
  categories: CategoryDTO[];
  saving: boolean;
  onChange: (categoryId: string) => void;
}) {
  // Assign context: active categories + the current one even if archived (so the
  // Select never renders a blank/invalid value).
  const visible = React.useMemo(
    () => categories.filter((c) => c.archivedAt === null || c.id === categoryId),
    [categories, categoryId],
  );
  const current = categories.find((c) => c.id === categoryId) ?? null;

  return (
    <Select
      value={categoryId ?? undefined}
      onValueChange={onChange}
      disabled={saving}
    >
      <SelectPrimitive.Trigger asChild aria-busy={saving}>
        <button
          type="button"
          aria-label={`Kategori untuk ${description}`}
          className={cn(
            "group inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs outline-none transition-colors",
            "focus-visible:ring-2 focus-visible:ring-[var(--yellow)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-card)]",
            current
              ? "border-[var(--border)] font-medium text-[var(--text)] hover:hover-wash"
              : "border-dashed border-[var(--border)] text-[var(--text-muted)] hover:hover-wash",
            saving && "opacity-70",
          )}
        >
          {current ? (
            <CategoryChip
              name={current.name}
              type={current.type}
              archived={current.archivedAt !== null}
              className="border-0 px-0 py-0"
            />
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Tag size={14} strokeWidth={1.75} aria-hidden="true" />
              Pilih kategori
            </span>
          )}
          {saving ? (
            <Loader2
              size={14}
              strokeWidth={1.75}
              className="animate-spin text-[var(--text-muted)]"
              aria-hidden="true"
            />
          ) : (
            <ChevronDown
              size={14}
              strokeWidth={1.75}
              className="text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100 group-data-[state=open]:opacity-100"
              aria-hidden="true"
            />
          )}
        </button>
      </SelectPrimitive.Trigger>
      <SelectContent>
        <CategoryGroups categories={visible} />
      </SelectContent>
    </Select>
  );
}
