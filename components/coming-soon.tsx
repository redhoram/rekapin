import type { LucideIcon } from "lucide-react";

// Shared "Segera hadir" placeholder pattern for every (app)/* stub (design §2.J).
// Status pill is deliberately NOT yellow — yellow stays reserved for actions.
export function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto mt-16 flex max-w-md flex-col items-center gap-3 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg-card)]">
        <Icon
          size={20}
          strokeWidth={1.75}
          className="text-[var(--text-muted)]"
          aria-hidden="true"
        />
      </div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text)] md:text-3xl">
        {title}
      </h1>
      <span className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
        Segera hadir
      </span>
      <p className="max-w-sm text-sm leading-relaxed text-[var(--text-muted)]">
        {description}
      </p>
    </div>
  );
}
