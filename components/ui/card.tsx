import * as React from "react";
import { cn } from "@/lib/utils";

// Cards sit on the page with a 1px border, not a drop shadow (design §1.3).
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border border-[var(--border)] bg-[var(--bg-card)]",
      className,
    )}
    {...props}
  />
));
Card.displayName = "Card";

export { Card };
