import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Non-interactive summary stat (design §7.2). `iconAttention` turns the icon
// yellow — used only for "Gagal parse" when the count is > 0 (restrained cue).
export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconAttention = false,
  compact = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  iconAttention?: boolean;
  compact?: boolean;
}) {
  return (
    <Card className="flex flex-col gap-1 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
          {label}
        </span>
        <Icon
          size={16}
          strokeWidth={1.75}
          aria-hidden="true"
          className={iconAttention ? "text-[var(--yellow)]" : "text-[var(--text-muted)]"}
        />
      </div>
      <span
        className={cn(
          "font-display font-bold tabular-nums text-[var(--text)]",
          compact ? "text-xl" : "text-2xl md:text-3xl",
        )}
      >
        {value}
      </span>
      {sub && <span className="text-xs text-[var(--text-muted)]">{sub}</span>}
    </Card>
  );
}
