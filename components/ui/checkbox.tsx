"use client";

import * as React from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Checkbox (design §1.1) — NO new dependency: a native <input type="checkbox">
 * visually replaced by a styled box. Checked = yellow fill + Check (a sanctioned
 * yellow "active marker"); indeterminate = yellow fill + Minus. The native input
 * stays in the DOM (screen-reader + keyboard native), visually hidden over the box.
 */
export interface CheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  "aria-label": string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox(
    { checked, indeterminate = false, onCheckedChange, disabled, className, ...props },
    forwardedRef,
  ) {
    const innerRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(forwardedRef, () => innerRef.current!, []);

    // indeterminate is a DOM property, not an attribute — set it via effect.
    React.useEffect(() => {
      if (innerRef.current) innerRef.current.indeterminate = indeterminate;
    }, [indeterminate]);

    const active = checked || indeterminate;

    return (
      <span
        className={cn(
          "relative inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
          active
            ? "border-[var(--yellow)] bg-[var(--yellow)]"
            : "border-[var(--border)] bg-[var(--bg)]",
          disabled && "opacity-60",
          className,
        )}
      >
        <input
          ref={innerRef}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="absolute inset-0 z-10 m-0 cursor-pointer appearance-none rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--yellow)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:cursor-not-allowed"
          {...props}
        />
        {indeterminate ? (
          <Minus
            size={12}
            strokeWidth={2.5}
            className="pointer-events-none text-[#0A0A0A]"
            aria-hidden="true"
          />
        ) : checked ? (
          <Check
            size={12}
            strokeWidth={2.5}
            className="pointer-events-none text-[#0A0A0A]"
            aria-hidden="true"
          />
        ) : null}
      </span>
    );
  },
);
