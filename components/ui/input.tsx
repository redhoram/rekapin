import * as React from "react";
import { cn } from "@/lib/utils";

// Remapped to project tokens (spec DECISIONS #6). `data-invalid` recolors the
// border to yellow (the app's single "look here" signal — no red token).
const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => {
  return (
    <input
      ref={ref}
      data-invalid={invalid ? "" : undefined}
      className={cn(
        "flex h-11 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 text-sm text-[var(--text)] outline-none transition-colors",
        "placeholder:text-[var(--text-muted)]",
        "hover:border-[var(--text-muted)]",
        "focus-visible:ring-2 focus-visible:ring-[var(--yellow)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "data-[invalid]:border-[var(--yellow)]",
        className,
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
