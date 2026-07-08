import { AlertCircle } from "lucide-react";

const TITLE =
  "Ada transaksi yang belum ditinjau di periode ini. Angka bisa berubah setelah ditinjau.";

/**
 * "Belum final" chip — ReviewStatusChip grammar exactly (icon shape + label,
 * never hue alone; yellow is THE one attention signal). Rendered once per
 * screen, in the header, when the active report's hasUnreviewed is true.
 */
export function FinalBadge() {
  return (
    <span
      title={TITLE}
      aria-label={TITLE}
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[var(--border)] px-2 py-0.5 text-xs font-medium text-[var(--text)]"
    >
      <AlertCircle
        size={14}
        strokeWidth={1.75}
        aria-hidden="true"
        className="text-[var(--yellow)]"
      />
      Belum final
    </span>
  );
}
