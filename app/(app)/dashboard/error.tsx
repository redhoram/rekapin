"use client";

import { AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** Error boundary for /dashboard (design §7.5) — mirrors /reports' error.tsx. */
export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-md border border-[var(--border)]">
        <AlertCircle
          size={20}
          strokeWidth={1.75}
          className="text-[var(--yellow)]"
          aria-hidden="true"
        />
      </div>
      <h2 className="font-display text-xl font-bold tracking-tight text-[var(--text)]">
        Gagal memuat dashboard
      </h2>
      <p className="max-w-sm text-sm text-[var(--text-muted)]">
        Terjadi kesalahan saat memuat ringkasan bisnismu. Coba muat ulang.
      </p>
      <Button variant="secondary" size="sm" onClick={reset}>
        Coba lagi
      </Button>
    </Card>
  );
}
