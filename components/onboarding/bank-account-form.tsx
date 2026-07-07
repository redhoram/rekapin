"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Check, Trash2 } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RupiahInput } from "@/components/ui/rupiah-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertStrip } from "@/components/ui/alert-strip";
import { FieldError } from "@/components/ui/field-error";
import { BANKS, BANK_VALUES } from "@/lib/constants";
import { formatRupiah } from "@/lib/utils";
import {
  addBankAccount,
  completeOnboarding,
} from "@/actions/onboarding";

const schema = z.object({
  bankCode: z.enum(BANK_VALUES, {
    errorMap: () => ({ message: "Pilih bank." }),
  }),
  label: z
    .string()
    .trim()
    .min(1, "Label tidak boleh kosong.")
    .max(60, "Label terlalu panjang."),
  accountMask: z.string().regex(/^\d{4}$/, "Harus 4 digit angka."),
  // Raw digit string from the Rupiah input; refined to integer ≥ 0.
  openingBalance: z
    .string()
    .min(1, "Saldo harus berupa angka bulat")
    .refine((v) => /^\d+$/.test(v), "Saldo harus berupa angka bulat"),
  openingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pilih tanggal."),
});

type FormValues = z.infer<typeof schema>;

// A staged account is one already persisted via addBankAccount; kept in local
// state only to render the visual "proof" list.
type StagedAccount = {
  bankCode: string;
  label: string;
  accountMask: string;
  openingBalance: number;
};

function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function BankAccountForm() {
  const router = useRouter();
  const [staged, setStaged] = React.useState<StagedAccount[]>([]);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [finishing, setFinishing] = React.useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      bankCode: undefined,
      label: "",
      accountMask: "",
      openingBalance: "",
      openingDate: todayIso(),
    },
  });

  const bankCode = watch("bankCode");
  const hasAtLeastOne = staged.length > 0;

  // Persist one account; on success push it into the staged list and reset.
  const commitCurrent = async (values: FormValues): Promise<boolean> => {
    setFormError(null);
    const balanceInt = parseInt(values.openingBalance, 10);
    const result = await addBankAccount({
      bankCode: values.bankCode,
      label: values.label,
      accountMask: values.accountMask,
      openingBalance: balanceInt,
      openingDate: values.openingDate,
    });
    if (!result.ok) {
      setFormError(result.error);
      return false;
    }
    setStaged((prev) => [
      ...prev,
      {
        bankCode: values.bankCode,
        label: values.label,
        accountMask: values.accountMask,
        openingBalance: balanceInt,
      },
    ]);
    reset({
      bankCode: undefined,
      label: "",
      accountMask: "",
      openingBalance: "",
      openingDate: todayIso(),
    });
    return true;
  };

  // "Tambah rekening lain" — validate + commit, keep the user on this step.
  const onAddAnother = handleSubmit(async (values) => {
    await commitCurrent(values);
  });

  // "Selesai" — commit the current entry if it is filled, then finalize.
  const onFinish = handleSubmit(async (values) => {
    setFinishing(true);
    const ok = await commitCurrent(values);
    if (!ok) {
      setFinishing(false);
      return;
    }
    const result = await completeOnboarding();
    if (!result.ok) {
      setFormError(result.error);
      setFinishing(false);
    }
    // Success redirects server-side.
  });

  // "Selesai" when the current form is empty but ≥1 account is already staged.
  const finishWithStagedOnly = async () => {
    setFinishing(true);
    setFormError(null);
    const result = await completeOnboarding();
    if (!result.ok) {
      setFormError(result.error);
      setFinishing(false);
    } else {
      router.push("/dashboard");
    }
  };

  const removeStaged = (index: number) => {
    // Visual removal only — server rows persist. Full delete UI lands with the
    // settings/bank-management step. For onboarding, removing from the list is
    // a display convenience; the account still counts toward completion.
    setStaged((prev) => prev.filter((_, i) => i !== index));
  };

  const busy = isSubmitting || finishing;

  return (
    <div className="flex flex-col gap-6">
      {formError && <AlertStrip>{formError}</AlertStrip>}

      {staged.length > 0 && (
        <ul className="flex flex-col gap-2">
          {staged.map((acc, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-[var(--text)]">
                  {acc.bankCode} · {acc.label}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  •••• {acc.accountMask} · {formatRupiah(acc.openingBalance)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeStaged(i)}
                aria-label={`Hapus rekening ${acc.label}`}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] outline-none transition-colors hover:hover-wash focus-visible:ring-2 focus-visible:ring-[var(--yellow)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
              >
                <Trash2 size={18} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form noValidate className="flex flex-col gap-4">
        <div>
          <Label htmlFor="bankCode">Bank</Label>
          <Controller
            control={control}
            name="bankCode"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={busy}
              >
                <SelectTrigger
                  id="bankCode"
                  invalid={!!errors.bankCode}
                  aria-invalid={!!errors.bankCode}
                  aria-describedby={
                    errors.bankCode ? "bankCode-error" : undefined
                  }
                >
                  <SelectValue placeholder="Pilih bank" />
                </SelectTrigger>
                <SelectContent>
                  {BANKS.map((b) => (
                    <SelectItem key={b.value} value={b.value}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError id="bankCode-error">{errors.bankCode?.message}</FieldError>
        </div>

        <div>
          <Label htmlFor="label">Label rekening</Label>
          <Input
            id="label"
            placeholder="Contoh: Rekening Utama BCA"
            invalid={!!errors.label}
            aria-invalid={!!errors.label}
            aria-describedby={
              errors.label
                ? "label-error"
                : bankCode === "Lainnya"
                  ? "label-helper"
                  : undefined
            }
            disabled={busy}
            {...register("label")}
          />
          {errors.label ? (
            <FieldError id="label-error">{errors.label.message}</FieldError>
          ) : (
            bankCode === "Lainnya" && (
              <p
                id="label-helper"
                className="mt-1.5 text-xs text-[var(--text-muted)]"
              >
                Tulis nama banknya di sini, misal &quot;Bank Jago&quot;.
              </p>
            )
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <div>
            <Label htmlFor="accountMask">4 digit terakhir rekening</Label>
            <Input
              id="accountMask"
              inputMode="numeric"
              maxLength={4}
              placeholder="1234"
              className="tabular-nums"
              invalid={!!errors.accountMask}
              aria-invalid={!!errors.accountMask}
              aria-describedby={
                errors.accountMask ? "accountMask-error" : undefined
              }
              disabled={busy}
              {...register("accountMask")}
            />
            <FieldError id="accountMask-error">
              {errors.accountMask?.message}
            </FieldError>
          </div>

          <div>
            <Label htmlFor="openingDate">Tanggal saldo awal</Label>
            <Input
              id="openingDate"
              type="date"
              invalid={!!errors.openingDate}
              aria-invalid={!!errors.openingDate}
              aria-describedby={
                errors.openingDate ? "openingDate-error" : undefined
              }
              disabled={busy}
              {...register("openingDate")}
            />
            <FieldError id="openingDate-error">
              {errors.openingDate?.message}
            </FieldError>
          </div>
        </div>

        <div>
          <Label htmlFor="openingBalance">Saldo awal</Label>
          <Controller
            control={control}
            name="openingBalance"
            render={({ field }) => (
              <RupiahInput
                id="openingBalance"
                value={field.value}
                onValueChange={field.onChange}
                invalid={!!errors.openingBalance}
                aria-invalid={!!errors.openingBalance}
                aria-describedby={
                  errors.openingBalance
                    ? "openingBalance-error"
                    : "openingBalance-helper"
                }
                disabled={busy}
              />
            )}
          />
          {errors.openingBalance ? (
            <FieldError id="openingBalance-error">
              {errors.openingBalance.message}
            </FieldError>
          ) : (
            <p
              id="openingBalance-helper"
              className="mt-1.5 text-xs text-[var(--text-muted)]"
            >
              Saldo di rekening pada tanggal mulai pencatatan.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={onAddAnother}
            disabled={busy}
          >
            <Plus size={18} strokeWidth={1.75} />
            Tambah rekening lain
          </Button>

          <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={hasAtLeastOne ? finishWithStagedOnly : onFinish}
              disabled={busy}
            >
              {finishing ? "Menyimpan…" : "Selesai"}
              {!finishing && <Check size={18} strokeWidth={1.75} />}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
