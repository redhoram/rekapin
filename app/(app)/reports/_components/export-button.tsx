"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReportTab } from "@/lib/reports/types";

const ENABLED_TITLE = "Unduh laporan ini sebagai file Excel (.xlsx)";
const DISABLED_TITLE = "Belum ada data untuk diunduh di periode ini.";

/**
 * Export the active /reports tab as .xlsx (design §5). A native `<a download>`
 * hitting the GET route — no fetch/blob plumbing. The "generating" feedback is
 * optimistic (a native download can't report completion): the label swaps to a
 * spinner for a fixed 1.8s, then resets. Never preventDefault — the anchor must
 * navigate to trigger the file.
 *
 * When the active tab is empty for the period, renders a visually-disabled
 * non-anchor look-alike (decision #5 — disabled, NOT hidden) with a hint title.
 */
export function ExportButton({
  tab,
  disabled = false,
}: {
  tab: ReportTab;
  disabled?: boolean;
}) {
  const searchParams = useSearchParams();
  const [generating, setGenerating] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (disabled) {
    return (
      <Button
        variant="secondary"
        size="sm"
        disabled
        aria-disabled="true"
        title={DISABLED_TITLE}
      >
        <Download size={14} strokeWidth={1.75} aria-hidden="true" />
        Unduh Excel
      </Button>
    );
  }

  // The export route ignores `tab`/`bkPage`; `accountId` passes through (used by
  // buku-kas, ignored by laba-rugi/arus-kas).
  const params = new URLSearchParams(searchParams.toString());
  params.delete("tab");
  params.delete("bkPage");
  const qs = params.toString();
  const href = `/api/reports/export/${tab}${qs ? `?${qs}` : ""}`;

  const handleClick = () => {
    setGenerating(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setGenerating(false), 1800);
  };

  return (
    <Button variant="secondary" size="sm" asChild onClick={handleClick}>
      <a href={href} download title={ENABLED_TITLE} aria-busy={generating}>
        {generating ? (
          <>
            <Loader2 size={14} strokeWidth={1.75} className="animate-spin" aria-hidden="true" />
            Menyiapkan…
          </>
        ) : (
          <>
            <Download size={14} strokeWidth={1.75} aria-hidden="true" />
            Unduh Excel
          </>
        )}
      </a>
    </Button>
  );
}
