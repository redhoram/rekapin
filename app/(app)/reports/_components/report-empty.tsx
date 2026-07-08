import Link from "next/link";
import { CalendarX, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Two-variant empty state (design §7.3), transactions empty-state markup:
 * - "new": business has zero transactions ever -> point to Upload/Transaksi.
 * - "period": data exists, none in the selected period -> the picker is the fix.
 */
export function ReportEmpty({
  variant,
  periodLabel,
  body,
}: {
  variant: "new" | "period";
  periodLabel?: string;
  /** Optional body override (e.g. Arus Kas's "belum ada rekening aktif"). */
  body?: string;
}) {
  const Icon = variant === "new" ? FileText : CalendarX;
  return (
    <Card className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-md border border-[var(--border)]">
        <Icon
          size={20}
          strokeWidth={1.75}
          className="text-[var(--text-muted)]"
          aria-hidden="true"
        />
      </div>
      <h2 className="font-display text-xl font-bold tracking-tight text-[var(--text)]">
        {variant === "new"
          ? "Belum ada data laporan"
          : `Tidak ada transaksi di ${periodLabel}`}
      </h2>
      <p className="max-w-sm text-sm text-[var(--text-muted)]">
        {body ??
          (variant === "new"
            ? "Unggah mutasi rekening atau tambah transaksi untuk membuat laporan keuangan pertamamu."
            : "Coba pilih periode lain di atas.")}
      </p>
      {variant === "new" && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="primary" size="sm" asChild>
            <Link href="/upload">Ke halaman Upload</Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link href="/transactions">Ke Transaksi</Link>
          </Button>
        </div>
      )}
    </Card>
  );
}
