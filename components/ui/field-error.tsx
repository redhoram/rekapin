import * as React from "react";

/**
 * Inline per-field validation message (design §1.1/§3.1). Full-opacity --text
 * so it reads as "attention", paired with the yellow input border. Wired to the
 * input via aria-describedby by the caller.
 */
export function FieldError({
  id,
  children,
}: {
  id?: string;
  children?: React.ReactNode;
}) {
  if (!children) return null;
  return (
    <p
      id={id}
      role="alert"
      className="mt-1.5 text-xs font-medium text-[var(--text)]"
    >
      {children}
    </p>
  );
}
