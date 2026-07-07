"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

// Input with a show/hide toggle inside the field, right-aligned (design §2.B).
export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
    invalid?: boolean;
  }
>(({ className, invalid, ...props }, ref) => {
  const [show, setShow] = React.useState(false);

  return (
    <div className="relative">
      <input
        ref={ref}
        type={show ? "text" : "password"}
        data-invalid={invalid ? "" : undefined}
        className={cn(
          "flex h-11 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] pl-3 pr-11 text-sm text-[var(--text)] outline-none transition-colors",
          "placeholder:text-[var(--text-muted)]",
          "hover:border-[var(--text-muted)]",
          "focus-visible:ring-2 focus-visible:ring-[var(--yellow)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
          "disabled:cursor-not-allowed disabled:opacity-60",
          "data-[invalid]:border-[var(--yellow)]",
          className,
        )}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
        tabIndex={0}
        className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--text-muted)] outline-none transition-colors hover:hover-wash focus-visible:ring-2 focus-visible:ring-[var(--yellow)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg)]"
      >
        {show ? (
          <EyeOff size={18} strokeWidth={1.75} aria-hidden="true" />
        ) : (
          <Eye size={18} strokeWidth={1.75} aria-hidden="true" />
        )}
      </button>
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";
