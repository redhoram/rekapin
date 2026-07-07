import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Card-width alert strip for auth-level / form-level errors (design §1.1).
 * --bg fill, 1px --border, left border 3px --yellow, AlertCircle in yellow.
 * No new semantic color — yellow doubles as the "look here" signal.
 */
export function AlertStrip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-md border border-[var(--border)] border-l-[3px] border-l-[var(--yellow)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)]",
        className,
      )}
    >
      <AlertCircle
        size={16}
        strokeWidth={1.75}
        className="mt-0.5 shrink-0 text-[var(--yellow)]"
        aria-hidden="true"
      />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
