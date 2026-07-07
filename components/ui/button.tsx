import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Remapped to project tokens (spec DECISIONS #6) — no parallel
// --background/--foreground layer. Focus ring is always yellow.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--yellow)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:pointer-events-none disabled:opacity-60 aria-disabled:pointer-events-none aria-disabled:opacity-60 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // The one advancing action per screen.
        primary:
          "bg-[var(--yellow)] text-[#0A0A0A] hover:bg-[var(--yellow-hover)] active:translate-y-[0.5px]",
        // Google buttons, "Kirim ulang", "Tambah rekening lain".
        secondary:
          "border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text)] hover:hover-wash",
        // Icon buttons, menu items.
        ghost:
          "text-[var(--text)] hover:hover-wash",
        // Footer nav links.
        link: "text-[var(--text)] underline underline-offset-4 hover:text-[var(--yellow-hover)]",
      },
      size: {
        // Auth/onboarding — tap-friendly 44px.
        default: "h-11 px-4",
        // Dense app chrome.
        sm: "h-9 px-3",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
