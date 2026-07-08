"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

/**
 * Generic 2+ option segmented control (design: reuse the FilterTabs look). Active
 * option is raised via bg contrast, NOT yellow — yellow stays on advancing actions
 * + focus rings. Used for direction (Masuk/Keluar) and match type (Mengandung/Diawali).
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  disabled,
  className,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex rounded-md border border-[var(--border)] bg-[var(--bg)] p-0.5",
        className,
      )}
    >
      {options.map((opt) => {
        const isActive = value === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-[6px] px-3 py-1.5 text-sm font-medium outline-none transition-colors",
              "focus-visible:ring-2 focus-visible:ring-[var(--yellow)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg)]",
              "disabled:cursor-not-allowed disabled:opacity-60",
              isActive
                ? "bg-[var(--bg-card)] text-[var(--text)]"
                : "text-[var(--text-muted)] hover:hover-wash",
            )}
          >
            {Icon && <Icon size={16} strokeWidth={1.75} aria-hidden="true" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
