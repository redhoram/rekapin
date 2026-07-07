import { Card } from "@/components/ui/card";
import { Wordmark } from "@/components/wordmark";

// Shared auth card frame: wordmark + subtitle block, then children (the form).
export function AuthShell({
  subtitle,
  wordmarkHref,
  children,
}: {
  subtitle: string;
  wordmarkHref?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-8 max-sm:p-6">
      <div className="mb-6 text-center">
        <Wordmark href={wordmarkHref} />
        <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>
      </div>
      {children}
    </Card>
  );
}

// "atau" divider: 1px lines flanking a muted centered label.
export function OrDivider() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-[var(--border)]" />
      <span className="text-xs text-[var(--text-muted)]">atau</span>
      <div className="h-px flex-1 bg-[var(--border)]" />
    </div>
  );
}
