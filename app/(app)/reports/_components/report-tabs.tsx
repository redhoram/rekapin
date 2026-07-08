"use client";

import { Segmented } from "@/components/ui/segmented";
import type { ReportTab } from "@/lib/reports/types";

const TAB_OPTIONS: { value: ReportTab; label: string }[] = [
  { value: "laba-rugi", label: "Laba Rugi" },
  { value: "arus-kas", label: "Arus Kas" },
  { value: "buku-kas", label: "Buku Kas" },
];

/**
 * Text-only tab bar over ?tab= (design §3). Switching preserves the period
 * params — the caller's pushParams only touches the `tab` key.
 */
export function ReportTabs({
  tab,
  onChange,
}: {
  tab: ReportTab;
  onChange: (tab: ReportTab) => void;
}) {
  return (
    <Segmented
      options={TAB_OPTIONS}
      value={tab}
      onChange={onChange}
      ariaLabel="Jenis laporan"
      // Equal-width, full-width on mobile; inline auto-width from md up.
      className="w-full max-md:[&>button]:flex-1 md:w-auto"
    />
  );
}
