import { AlertTriangle, Check, Copy } from "lucide-react";
import type { RowStatus } from "@/lib/parsing/types";

// Row-status chip (design §2). Status is encoded by icon shape + text label +
// weight, NEVER by hue — only the "Gagal" icon is yellow (the sanctioned
// attention signal). Verified to read in grayscale.
const CONFIG: Record<
  RowStatus,
  { icon: typeof Check; label: string; attention: boolean }
> = {
  valid: { icon: Check, label: "Valid", attention: false },
  duplicate: { icon: Copy, label: "Duplikat", attention: false },
  failed: { icon: AlertTriangle, label: "Gagal", attention: true },
};

export function StatusChip({
  status,
  subLabel,
}: {
  status: RowStatus;
  subLabel?: string;
}) {
  const { icon: Icon, label, attention } = CONFIG[status];
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2 py-0.5 text-xs font-medium text-[var(--text)]">
      <Icon
        size={14}
        strokeWidth={1.75}
        aria-hidden="true"
        className={attention ? "text-[var(--yellow)]" : "text-[var(--text-muted)]"}
      />
      {label}
      {subLabel && <span className="text-[var(--text-muted)]">· {subLabel}</span>}
    </span>
  );
}
