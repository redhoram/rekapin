"use client";

import * as React from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Info,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertStrip } from "@/components/ui/alert-strip";
import { FieldError } from "@/components/ui/field-error";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatDateShort, formatRupiah } from "@/lib/utils";
import { parseDate, resolveAmountAndDirection } from "@/lib/parsing/fields";
import type {
  AmountMode,
  ColumnMapping,
  DateFormat,
  RawRow,
} from "@/lib/parsing/types";

const NONE = "__none__";

const MODES: { value: AmountMode; title: string; sub?: string }[] = [
  { value: "signed", title: "Satu kolom jumlah bertanda (+/−)" },
  { value: "debit_credit", title: "Dua kolom terpisah: Debit & Kredit" },
  {
    value: "amount_direction",
    title: "Satu kolom jumlah + kolom arah (Masuk/Keluar)",
    sub: "sama seperti template Rekapin",
  },
];

const DATE_FORMATS: { value: DateFormat; label: string }[] = [
  { value: "dd/MM/yyyy", label: "31/07/2026 · Hari/Bulan/Tahun" },
  { value: "yyyy-MM-dd", label: "2026-07-31 · Tahun-Bulan-Hari" },
  { value: "MM/dd/yyyy", label: "07/31/2026 · Bulan/Hari/Tahun" },
];

export interface NeedsMappingData {
  uploadId: string;
  fileName: string;
  bankAccountId: string;
  rawHeaders: string[];
  sampleRows: RawRow[];
}

function ColumnSelect({
  id,
  label,
  value,
  onChange,
  headers,
  invalid,
  helper,
  includeNone,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  headers: string[];
  invalid?: boolean;
  helper?: string;
  includeNone?: boolean;
}) {
  const errorId = `${id}-error`;
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger
          id={id}
          invalid={invalid}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
        >
          <SelectValue placeholder="Pilih kolom" />
        </SelectTrigger>
        <SelectContent>
          {includeNone && <SelectItem value={NONE}>— Tidak ada —</SelectItem>}
          {headers.map((h, i) => (
            <SelectItem key={`${h}-${i}`} value={h}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {invalid ? (
        <FieldError id={errorId}>{`Pilih kolom untuk ${label}.`}</FieldError>
      ) : (
        helper && (
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">{helper}</p>
        )
      )}
    </div>
  );
}

function SampleArah({ direction }: { direction: "in" | "out" | null }) {
  if (!direction) return <span className="text-[var(--text-muted)]">—</span>;
  const Icon = direction === "in" ? ArrowDownLeft : ArrowUpRight;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <Icon
        size={14}
        strokeWidth={1.75}
        aria-hidden="true"
        className="text-[var(--text-muted)]"
      />
      {direction === "in" ? "Masuk" : "Keluar"}
    </span>
  );
}

export function MappingWizard({
  data,
  accountLabel,
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  data: NeedsMappingData;
  accountLabel: string;
  submitting: boolean;
  error: string | null;
  onSubmit: (mapping: ColumnMapping) => void;
  onCancel: () => void;
}) {
  const headers = React.useMemo(() => {
    const seen = new Set<string>();
    return data.rawHeaders.filter((h) => {
      const t = h.trim();
      if (t === "" || seen.has(t)) return false;
      seen.add(t);
      return true;
    });
  }, [data.rawHeaders]);

  const [amountMode, setAmountMode] = React.useState<AmountMode>("signed");
  const [dateColumn, setDateColumn] = React.useState("");
  const [descriptionColumn, setDescriptionColumn] = React.useState("");
  const [amountColumn, setAmountColumn] = React.useState("");
  const [debitColumn, setDebitColumn] = React.useState("");
  const [creditColumn, setCreditColumn] = React.useState("");
  const [directionColumn, setDirectionColumn] = React.useState("");
  const [balanceColumn, setBalanceColumn] = React.useState(NONE);
  const [dateFormat, setDateFormat] = React.useState<DateFormat>("dd/MM/yyyy");
  const [invalid, setInvalid] = React.useState<Set<string>>(new Set());

  const buildMapping = React.useCallback((): ColumnMapping => {
    const base: ColumnMapping = {
      amountMode,
      dateFormat,
      dateColumn,
      descriptionColumn,
      balanceColumn: balanceColumn === NONE ? null : balanceColumn,
    };
    if (amountMode === "signed") base.amountColumn = amountColumn;
    if (amountMode === "amount_direction") {
      base.amountColumn = amountColumn;
      base.directionColumn = directionColumn;
    }
    if (amountMode === "debit_credit") {
      base.debitColumn = debitColumn;
      base.creditColumn = creditColumn;
    }
    return base;
  }, [
    amountMode,
    dateFormat,
    dateColumn,
    descriptionColumn,
    balanceColumn,
    amountColumn,
    directionColumn,
    debitColumn,
    creditColumn,
  ]);

  const sample = React.useMemo(() => {
    const mapping = buildMapping();
    return data.sampleRows.map((raw) => {
      const d = parseDate(raw[dateColumn] ?? "", dateFormat);
      const ad = resolveAmountAndDirection(raw, mapping);
      return {
        date: d.ok ? d.value : null,
        description: (raw[descriptionColumn] ?? "").trim(),
        amount: ad.ok ? ad.value.amount : null,
        direction: ad.ok ? ad.value.direction : null,
      };
    });
  }, [buildMapping, data.sampleRows, dateColumn, descriptionColumn, dateFormat]);

  const handleSubmit = () => {
    const missing = new Set<string>();
    if (!dateColumn) missing.add("dateColumn");
    if (!descriptionColumn) missing.add("descriptionColumn");
    if (amountMode === "signed" && !amountColumn) missing.add("amountColumn");
    if (amountMode === "amount_direction") {
      if (!amountColumn) missing.add("amountColumn");
      if (!directionColumn) missing.add("directionColumn");
    }
    if (amountMode === "debit_credit") {
      if (!debitColumn) missing.add("debitColumn");
      if (!creditColumn) missing.add("creditColumn");
    }
    setInvalid(missing);
    if (missing.size > 0) return;
    onSubmit(buildMapping());
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
          Format belum dikenali
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-[var(--text)]">
          Petakan kolom file
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          File ini bukan format bank yang Rekapin kenal. Cocokkan kolomnya sekali
          — pemetaan disimpan untuk rekening ini, jadi upload berikutnya otomatis.
        </p>
      </div>

      <Card className="flex flex-col gap-6 p-6 max-sm:p-5">
        {error && <AlertStrip>{error}</AlertStrip>}

        {/* B2 — detected headers */}
        <div>
          <p className="text-xs text-[var(--text-muted)]">
            Kolom terdeteksi di file:
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {headers.map((h, i) => (
              <span
                key={`${h}-${i}`}
                className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-2.5 py-0.5 text-xs text-[var(--text-muted)]"
              >
                {h}
              </span>
            ))}
          </div>
        </div>

        {/* B3 — amount mode */}
        <fieldset>
          <legend className="mb-1.5 block text-xs font-medium tracking-[0.01em] text-[var(--text-muted)]">
            Bentuk kolom jumlah
          </legend>
          <div role="radiogroup" className="flex flex-col gap-2">
            {MODES.map((mode) => {
              const selected = amountMode === mode.value;
              return (
                <label
                  key={mode.value}
                  className={cn(
                    "flex cursor-pointer items-start justify-between gap-3 rounded-md border p-3 transition-colors",
                    "focus-within:ring-2 focus-within:ring-[var(--yellow)] focus-within:ring-offset-2 focus-within:ring-offset-[var(--bg-card)]",
                    selected
                      ? "border-[var(--yellow)]"
                      : "border-[var(--border)] hover:border-[var(--text-muted)]",
                  )}
                >
                  <span>
                    <input
                      type="radio"
                      name="amountMode"
                      value={mode.value}
                      checked={selected}
                      onChange={() => setAmountMode(mode.value)}
                      className="sr-only"
                      disabled={submitting}
                    />
                    <span className="block text-sm text-[var(--text)]">
                      {mode.title}
                    </span>
                    {mode.sub && (
                      <span className="block text-xs text-[var(--text-muted)]">
                        {mode.sub}
                      </span>
                    )}
                  </span>
                  {selected && (
                    <Check
                      size={16}
                      strokeWidth={1.75}
                      aria-hidden="true"
                      className="mt-0.5 shrink-0 text-[var(--yellow)]"
                    />
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* B4 — column selects */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ColumnSelect
            id="map-date"
            label="Tanggal"
            value={dateColumn}
            onChange={setDateColumn}
            headers={headers}
            invalid={invalid.has("dateColumn")}
          />
          <ColumnSelect
            id="map-desc"
            label="Deskripsi"
            value={descriptionColumn}
            onChange={setDescriptionColumn}
            headers={headers}
            invalid={invalid.has("descriptionColumn")}
          />

          {amountMode === "signed" && (
            <ColumnSelect
              id="map-amount"
              label="Jumlah (bertanda)"
              value={amountColumn}
              onChange={setAmountColumn}
              headers={headers}
              invalid={invalid.has("amountColumn")}
            />
          )}
          {amountMode === "amount_direction" && (
            <>
              <ColumnSelect
                id="map-amount"
                label="Jumlah"
                value={amountColumn}
                onChange={setAmountColumn}
                headers={headers}
                invalid={invalid.has("amountColumn")}
              />
              <ColumnSelect
                id="map-direction"
                label="Kolom arah"
                value={directionColumn}
                onChange={setDirectionColumn}
                headers={headers}
                invalid={invalid.has("directionColumn")}
              />
            </>
          )}
          {amountMode === "debit_credit" && (
            <>
              <ColumnSelect
                id="map-debit"
                label="Kolom Debit"
                value={debitColumn}
                onChange={setDebitColumn}
                headers={headers}
                invalid={invalid.has("debitColumn")}
              />
              <ColumnSelect
                id="map-credit"
                label="Kolom Kredit"
                value={creditColumn}
                onChange={setCreditColumn}
                headers={headers}
                invalid={invalid.has("creditColumn")}
              />
            </>
          )}

          <div className="sm:col-span-2">
            <ColumnSelect
              id="map-balance"
              label="Saldo (opsional)"
              value={balanceColumn}
              onChange={setBalanceColumn}
              headers={headers}
              includeNone
              helper="Diabaikan — hanya untuk referensi."
            />
          </div>
        </div>

        {/* B5 — date format */}
        <div className="sm:max-w-sm">
          <Label htmlFor="map-date-format">Format tanggal</Label>
          <Select
            value={dateFormat}
            onValueChange={(v) => setDateFormat(v as DateFormat)}
          >
            <SelectTrigger id="map-date-format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_FORMATS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* B6 — live sample */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Pratinjau 5 baris pertama
          </p>
          <Card className="mt-2 overflow-x-auto p-4">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  <th scope="col" className="py-1.5 pr-3 font-semibold">
                    Tanggal
                  </th>
                  <th scope="col" className="py-1.5 pr-3 font-semibold">
                    Deskripsi
                  </th>
                  <th scope="col" className="py-1.5 pr-3 text-right font-semibold">
                    Jumlah
                  </th>
                  <th scope="col" className="py-1.5 font-semibold">
                    Arah
                  </th>
                </tr>
              </thead>
              <tbody>
                {sample.map((row, i) => (
                  <tr key={i} className="border-b border-[var(--border)]">
                    <td className="whitespace-nowrap py-1.5 pr-3 tabular-nums">
                      {row.date ? (
                        formatDateShort(row.date)
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="max-w-[220px] py-1.5 pr-3">
                      <span className="block truncate">
                        {row.description || (
                          <span className="text-[var(--text-muted)]">—</span>
                        )}
                      </span>
                    </td>
                    <td className="whitespace-nowrap py-1.5 pr-3 text-right tabular-nums">
                      {row.amount !== null ? (
                        formatRupiah(row.amount)
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="py-1.5">
                      <SampleArah direction={row.direction} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">
            Contoh tampilan — hasil final dihitung ulang di server saat kamu lanjut.
          </p>
        </div>

        {/* B7 — saved-mapping notice */}
        <div className="flex items-start gap-2 text-xs text-[var(--text-muted)]">
          <Info
            size={16}
            strokeWidth={1.75}
            aria-hidden="true"
            className="mt-0.5 shrink-0"
          />
          <p>
            Pemetaan ini disimpan untuk rekening{" "}
            <span className="font-medium text-[var(--text)]">{accountLabel}</span>
            . Upload berikutnya untuk rekening ini otomatis dipetakan.
          </p>
        </div>

        {/* B8 — actions */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={submitting}
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={18} strokeWidth={1.75} className="animate-spin" />
                Memproses…
              </>
            ) : (
              <>
                Lihat pratinjau
                <ArrowRight size={18} strokeWidth={1.75} />
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
