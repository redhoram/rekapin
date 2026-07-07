"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { formatThousands } from "@/lib/utils";

/**
 * Rupiah input with a non-editable "Rp" prefix and live thousand separators.
 * Keeps raw digits in a controlled `value` (string of digits); the caller does
 * `parseInt(value, 10)` on submit. Caret moves to end on reformat (acceptable
 * for onboarding per design §2.H).
 */
export const RupiahInput = React.forwardRef<
  HTMLInputElement,
  {
    value: string;
    onValueChange: (digits: string) => void;
    invalid?: boolean;
    id?: string;
    disabled?: boolean;
    className?: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
  }
>(function RupiahInput(
  { value, onValueChange, invalid, className, ...props },
  ref,
) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    onValueChange(digits);
  };

  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]"
      >
        Rp
      </span>
      <input
        ref={ref}
        inputMode="numeric"
        value={formatThousands(value)}
        onChange={handleChange}
        data-invalid={invalid ? "" : undefined}
        placeholder="0"
        className={cn(
          "flex h-11 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] pl-9 pr-3 text-sm tabular-nums text-[var(--text)] outline-none transition-colors",
          "placeholder:text-[var(--text-muted)]",
          "hover:border-[var(--text-muted)]",
          "focus-visible:ring-2 focus-visible:ring-[var(--yellow)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
          "disabled:cursor-not-allowed disabled:opacity-60",
          "data-[invalid]:border-[var(--yellow)]",
          className as string,
        )}
        {...props}
      />
    </div>
  );
});
