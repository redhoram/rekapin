"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TypeIcon } from "@/components/categories/visuals";
import { groupByType } from "@/lib/categories/meta";
import type { CategoryDTO } from "@/lib/categories/types";

/** Sentinel values (Radix Select forbids empty-string item values). */
export const CATEGORY_ALL = "__all__";
export const CATEGORY_NONE = "__none__";

/**
 * The grouped category option tree (SelectGroup + SelectLabel per type + items).
 * Archived categories get a " (diarsipkan)" suffix. Reused by CategorySelect and
 * the inline CategoryCell so the grouping lives in exactly one place.
 */
export function CategoryGroups({ categories }: { categories: CategoryDTO[] }) {
  const groups = groupByType(categories);
  return (
    <>
      {groups.map((group) => (
        <SelectGroup key={group.type}>
          <SelectLabel>
            <TypeIcon type={group.type} />
            {group.meta.label}
          </SelectLabel>
          {group.items.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              <span className="inline-flex items-center gap-1.5">
                <TypeIcon type={cat.type} />
                {cat.name}
                {cat.archivedAt && (
                  <span className="text-[var(--text-muted)]"> (diarsipkan)</span>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      ))}
    </>
  );
}

/**
 * Standard-trigger grouped category picker.
 *  - mode "filter": shows ALL categories incl. archived (users filter history).
 *  - mode "assign": excludes archived EXCEPT `keepCategoryId` (so the Select is
 *    never blank when the current value is an archived category).
 * `leadingItem` renders an extra option before the groups ("Semua kategori" for
 * filters, "— Tanpa kategori —" for the optional manual-form category).
 */
export function CategorySelect({
  categories,
  value,
  onValueChange,
  mode,
  leadingItem,
  keepCategoryId,
  id,
  invalid,
  disabled,
  ariaLabel,
  placeholder,
  triggerClassName,
}: {
  categories: CategoryDTO[];
  value: string;
  onValueChange: (v: string) => void;
  mode: "filter" | "assign";
  leadingItem?: { value: string; label: string };
  keepCategoryId?: string | null;
  id?: string;
  invalid?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  placeholder?: string;
  triggerClassName?: string;
}) {
  const visible = React.useMemo(() => {
    if (mode === "filter") return categories;
    return categories.filter(
      (c) => c.archivedAt === null || c.id === keepCategoryId,
    );
  }, [categories, mode, keepCategoryId]);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        id={id}
        invalid={invalid}
        aria-label={ariaLabel}
        className={triggerClassName}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {leadingItem && (
          <SelectItem value={leadingItem.value}>{leadingItem.label}</SelectItem>
        )}
        <CategoryGroups categories={visible} />
      </SelectContent>
    </Select>
  );
}
