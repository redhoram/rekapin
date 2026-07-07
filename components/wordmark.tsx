import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * The "Rekapin" wordmark — text only (Space Grotesk 700, --yellow). The one
 * place the brand color is decorative (design §1.2). Renders as a link when
 * `href` is given, otherwise static text.
 */
export function Wordmark({
  href,
  className,
}: {
  href?: string;
  className?: string;
}) {
  const classes = cn(
    "font-display text-lg font-bold tracking-tight text-[var(--yellow)]",
    href && "transition-colors hover:text-[var(--yellow-hover)]",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        Rekapin
      </Link>
    );
  }
  return <span className={classes}>Rekapin</span>;
}
