import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  FileSpreadsheet,
  PenLine,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CATEGORY_TYPE_META,
  type CategoryType,
} from "@/lib/categories/meta";

/**
 * Shared read-only visual encoders (design §2). Every status / type / direction /
 * source is distinguished by ICON SHAPE + LABEL + WEIGHT, never hue — reads in
 * grayscale (colorblind-safe). Yellow appears ONLY as the single attention signal
 * (needs_review). Reused across /transactions and /settings.
 */

/** Category-type icon in the single source's muted style. */
export function TypeIcon({
  type,
  size = 14,
}: {
  type: CategoryType;
  size?: number;
}) {
  const Icon = CATEGORY_TYPE_META[type].icon;
  return (
    <Icon
      size={size}
      strokeWidth={1.75}
      className="text-[var(--text-muted)]"
      aria-hidden="true"
    />
  );
}

/** Chip: type icon + type label (muted). Used in rule lists / as category context. */
export function TypeBadge({ type }: { type: CategoryType }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
      <TypeIcon type={type} />
      {CATEGORY_TYPE_META[type].label}
    </span>
  );
}

/** Read-only representation of one category: type icon + name (+ archived suffix). */
export function CategoryChip({
  name,
  type,
  archived = false,
  className,
}: {
  name: string;
  type: CategoryType;
  archived?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2 py-0.5 text-xs font-medium text-[var(--text)]",
        className,
      )}
    >
      <TypeIcon type={type} />
      {name}
      {archived && (
        <span className="text-[var(--text-muted)]"> (diarsipkan)</span>
      )}
    </span>
  );
}

type ReviewStatus = "needs_review" | "auto" | "reviewed";

const REVIEW_CONFIG: Record<
  ReviewStatus,
  { icon: typeof Check; label: string; attention: boolean }
> = {
  needs_review: { icon: AlertCircle, label: "Perlu ditinjau", attention: true },
  auto: { icon: Zap, label: "Otomatis", attention: false },
  reviewed: { icon: Check, label: "Ditinjau", attention: false },
};

/** review_status chip. Yellow icon ONLY for needs_review (the one attention cue). */
export function ReviewStatusChip({ status }: { status: ReviewStatus }) {
  const { icon: Icon, label, attention } = REVIEW_CONFIG[status];
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[var(--border)] px-2 py-0.5 text-xs font-medium text-[var(--text)]">
      <Icon
        size={14}
        strokeWidth={1.75}
        aria-hidden="true"
        className={attention ? "text-[var(--yellow)]" : "text-[var(--text-muted)]"}
      />
      {label}
    </span>
  );
}

/** Source (import/manual) as a quiet muted inline label — not a chip (reduce noise). */
export function SourceLabel({ source }: { source: "import" | "manual" }) {
  const Icon = source === "import" ? FileSpreadsheet : PenLine;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-[var(--text-muted)]">
      <Icon size={14} strokeWidth={1.75} aria-hidden="true" />
      {source === "import" ? "Impor" : "Manual"}
    </span>
  );
}

/** Direction (Masuk/Keluar) — arrow icon + word, muted (colorblind-safe). */
export function DirectionTag({
  direction,
  size = 12,
}: {
  direction: "in" | "out";
  size?: number;
}) {
  const Icon = direction === "in" ? ArrowDownLeft : ArrowUpRight;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-[var(--text-muted)]">
      <Icon size={size} strokeWidth={1.75} aria-hidden="true" />
      {direction === "in" ? "Masuk" : "Keluar"}
    </span>
  );
}

/** Rule match-type pill: "Mengandung" / "Diawali" (muted). */
export function MatchTypeBadge({
  matchType,
}: {
  matchType: "contains" | "prefix";
}) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
      {matchType === "contains" ? "Mengandung" : "Diawali"}
    </span>
  );
}
