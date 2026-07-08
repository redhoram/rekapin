"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PeriodPreset, ResolvedPeriod } from "@/lib/reports/types";
import type { ParamUpdate } from "./types";

const PRESET_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: "month", label: "Bulan" },
  { value: "quarter", label: "Kuartal" },
  { value: "year", label: "Tahun" },
  { value: "custom", label: "Custom" },
];

const MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/**
 * Shared report toolbar (design §3.1). The RESOLVED period is the source of
 * truth for every control's value — never re-derived client-side. Every change
 * pushes searchParams; changing the preset clears the now-irrelevant params and
 * seeds the new ones from the current period so the jump is predictable.
 */
export function PeriodPicker({
  period,
  currentWibYear,
  onParamChange,
}: {
  period: ResolvedPeriod;
  currentWibYear: number;
  onParamChange: (update: ParamUpdate) => void;
}) {
  const year = Number(period.start.slice(0, 4));
  const month = Number(period.start.slice(5, 7));
  const quarter = Math.floor((month - 1) / 3) + 1;

  // Current WIB year descending ~6 years; always include the selected year so
  // the Select never shows a value that isn't in its list.
  const years = Array.from({ length: 6 }, (_, i) => currentWibYear - i);
  if (!years.includes(year)) years.push(year);
  years.sort((a, b) => b - a);

  const handlePreset = (preset: PeriodPreset) => {
    // Reset everything, then seed the new preset from the current period.
    const update: ParamUpdate = {
      preset,
      year: String(year),
      month: null,
      quarter: null,
      from: null,
      to: null,
    };
    if (preset === "month") update.month = String(month);
    if (preset === "quarter") update.quarter = String(quarter);
    if (preset === "custom") {
      update.year = null;
      update.from = period.start;
      update.to = period.end;
    }
    onParamChange(update);
  };

  // NOTE: callers pass the full responsive class (e.g. "sm:w-[7rem]") so the
  // literal appears in source — Tailwind can't see dynamically-built classes.
  const yearSelect = (width: string) => (
    <Select
      value={String(year)}
      onValueChange={(v) => onParamChange({ year: v })}
    >
      <SelectTrigger aria-label="Tahun" className={`h-9 w-full ${width}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {years.map((y) => (
          <SelectItem key={y} value={String(y)}>
            {y}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <Card className="flex flex-col gap-3 p-3">
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
        <Segmented
          options={PRESET_OPTIONS}
          value={period.preset}
          onChange={handlePreset}
          ariaLabel="Jenis periode"
          className="w-full max-md:[&>button]:flex-1 md:w-auto"
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {period.preset === "month" && (
            <>
              <Select
                value={String(month)}
                onValueChange={(v) => onParamChange({ month: v })}
              >
                <SelectTrigger aria-label="Bulan" className="h-9 w-full sm:w-[10rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS_ID.map((label, i) => (
                    <SelectItem key={label} value={String(i + 1)}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {yearSelect("sm:w-[7rem]")}
            </>
          )}

          {period.preset === "quarter" && (
            <>
              <Select
                value={String(quarter)}
                onValueChange={(v) => onParamChange({ quarter: v })}
              >
                <SelectTrigger aria-label="Kuartal" className="h-9 w-full sm:w-[10rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map((q) => (
                    <SelectItem key={q} value={String(q)}>
                      Kuartal {q}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {yearSelect("sm:w-[7rem]")}
            </>
          )}

          {period.preset === "year" && yearSelect("sm:w-[8rem]")}

          {period.preset === "custom" && (
            <div className="flex items-end gap-2">
              <div className="flex-1 sm:flex-none">
                <Label htmlFor="report-from" className="sr-only">
                  Dari tanggal
                </Label>
                <Input
                  id="report-from"
                  type="date"
                  aria-label="Dari tanggal"
                  className="h-9 w-full sm:w-[9.5rem]"
                  value={period.start}
                  onChange={(e) => onParamChange({ from: e.target.value || null })}
                />
              </div>
              <span className="pb-2 text-xs text-[var(--text-muted)]">–</span>
              <div className="flex-1 sm:flex-none">
                <Label htmlFor="report-to" className="sr-only">
                  Sampai tanggal
                </Label>
                <Input
                  id="report-to"
                  type="date"
                  aria-label="Sampai tanggal"
                  className="h-9 w-full sm:w-[9.5rem]"
                  value={period.end}
                  onChange={(e) => onParamChange({ to: e.target.value || null })}
                />
              </div>
            </div>
          )}
        </div>

        {/* Resolved read-back — single source of truth is period.label. */}
        <p className="text-sm text-[var(--text-muted)] md:ml-auto">{period.label}</p>
      </div>
    </Card>
  );
}
