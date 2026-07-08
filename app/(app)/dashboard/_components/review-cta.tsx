import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AlertStrip } from "@/components/ui/alert-strip";
import { Button } from "@/components/ui/button";

/**
 * "N transaksi perlu ditinjau" nudge (design §4). Rendered below the KPI grid
 * and above the charts (numbers first, then the "want these final?" prompt) only
 * when needsReviewCount > 0. Reuses AlertStrip (yellow left-border + AlertCircle).
 * Indonesian nouns don't pluralize — "{N} transaksi" reads correctly for every N.
 */
export function ReviewCta({ needsReviewCount }: { needsReviewCount: number }) {
  return (
    <AlertStrip>
      <p className="text-sm text-[var(--text)]">
        <span className="font-semibold">{needsReviewCount} transaksi</span> perlu
        ditinjau di periode ini. Angka di atas bisa berubah setelah ditinjau.
      </p>
      <Button variant="link" size="sm" asChild className="mt-1 h-auto px-0">
        <Link href="/transactions?reviewStatus=needs_review">
          Tinjau transaksi
          <ArrowRight size={14} strokeWidth={1.75} aria-hidden="true" />
        </Link>
      </Button>
    </AlertStrip>
  );
}
