import {
  ArrowLeftRight,
  CircleEllipsis,
  Package,
  Receipt,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

/**
 * SINGLE SOURCE of category-type metadata (design §2.1). Both /transactions and
 * /settings import from here — never duplicate the icon/label mapping elsewhere.
 *
 * Types are distinguished by ICON SHAPE + LABEL only, never by hue (colorblind-
 * safe, matches the step-② StatusChip discipline). Icons are chosen to differ in
 * silhouette and to avoid clashing with the direction arrows (Masuk/Keluar).
 */

export const CATEGORY_TYPES = [
  "PENDAPATAN",
  "HPP",
  "OPEX",
  "NON_OPERASIONAL",
  "TRANSFER",
] as const;

export type CategoryType = (typeof CATEGORY_TYPES)[number];

export interface CategoryTypeMeta {
  /** Displayed label. */
  label: string;
  /** Extra clarifier shown under group headers / in the category dialog. */
  subLabel?: string;
  icon: LucideIcon;
  /** Fixed display order across every surface. */
  order: number;
}

export const CATEGORY_TYPE_META: Record<CategoryType, CategoryTypeMeta> = {
  PENDAPATAN: { label: "Pendapatan", icon: TrendingUp, order: 1 },
  HPP: {
    label: "HPP",
    subLabel: "Harga Pokok Penjualan",
    icon: Package,
    order: 2,
  },
  OPEX: { label: "Operasional", icon: Receipt, order: 3 },
  NON_OPERASIONAL: {
    label: "Non-Operasional",
    icon: CircleEllipsis,
    order: 4,
  },
  TRANSFER: { label: "Transfer", icon: ArrowLeftRight, order: 5 },
};

/** The 5 types in their fixed display order. */
export const CATEGORY_TYPES_ORDERED: CategoryType[] = [...CATEGORY_TYPES].sort(
  (a, b) => CATEGORY_TYPE_META[a].order - CATEGORY_TYPE_META[b].order,
);

/**
 * Group any category-shaped items by type, in fixed type order. Empty groups are
 * omitted. Items keep their incoming order within each group (callers pre-sort by
 * name). Pure — reused by the grouped picker and the Settings list.
 */
export function groupByType<T extends { type: CategoryType }>(
  items: T[],
): { type: CategoryType; meta: CategoryTypeMeta; items: T[] }[] {
  return CATEGORY_TYPES_ORDERED.map((type) => ({
    type,
    meta: CATEGORY_TYPE_META[type],
    items: items.filter((it) => it.type === type),
  })).filter((group) => group.items.length > 0);
}
