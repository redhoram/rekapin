"use client";

import * as React from "react";
import { ArrowDownLeft, ArrowUpRight, Loader2 } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RupiahInput } from "@/components/ui/rupiah-input";
import { FieldError } from "@/components/ui/field-error";
import { AlertStrip } from "@/components/ui/alert-strip";
import { Segmented } from "@/components/ui/segmented";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CategorySelect,
  CATEGORY_NONE,
} from "@/components/categories/category-select";
import {
  createManualTransaction,
  updateManualTransaction,
  updateTransactionCategory,
} from "@/actions/transactions";
import type { CategoryDTO } from "@/lib/categories/types";
import type { AccountOption } from "./types";
import type { TransactionRow } from "@/lib/queries/transactions";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pilih tanggal."),
  description: z.string().trim().min(1, "Deskripsi tidak boleh kosong."),
  amount: z
    .string()
    .min(1, "Jumlah harus lebih dari 0.")
    .refine((v) => /^\d+$/.test(v) && parseInt(v, 10) > 0, "Jumlah harus lebih dari 0."),
  direction: z.enum(["in", "out"], {
    errorMap: () => ({ message: "Pilih arah." }),
  }),
  bankAccountId: z.string().min(1, "Pilih rekening."),
  categoryId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Add / edit manual transaction (design §3.11). For an imported row (edit),
 * fields 1–5 are disabled with one calm AlertStrip (DECISION #1) and only the
 * category is submitted (via updateTransactionCategory). Rule offer is NOT
 * triggered from here — only inline chip edits do that.
 */
export function ManualTransactionDialog({
  open,
  mode,
  transaction,
  accounts,
  categories,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  mode: "create" | "edit";
  transaction: TransactionRow | null;
  accounts: AccountOption[];
  categories: CategoryDTO[];
  onOpenChange: (open: boolean) => void;
  onDone: (message: string) => void;
}) {
  const isImport = mode === "edit" && transaction?.source === "import";
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
  });

  React.useEffect(() => {
    if (!open) return;
    setFormError(null);
    if (mode === "edit" && transaction) {
      reset({
        date: transaction.date,
        description: transaction.description,
        amount: String(transaction.amount),
        direction: transaction.direction,
        bankAccountId: transaction.bankAccountId,
        categoryId:
          transaction.categoryId ??
          (transaction.source === "manual" ? CATEGORY_NONE : ""),
      });
    } else {
      reset({
        date: todayIso(),
        description: "",
        amount: "",
        direction: "out",
        bankAccountId: accounts.length === 1 ? accounts[0].id : "",
        categoryId: CATEGORY_NONE,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, transaction]);

  const resolveCategoryId = (raw?: string): string | null =>
    raw && raw !== CATEGORY_NONE ? raw : null;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const categoryId = resolveCategoryId(values.categoryId);

    try {
      // Imported row: category-only edit path.
      if (isImport && transaction) {
        if (!categoryId) {
          setFormError("Pilih kategori dulu.");
          return;
        }
        const res = await updateTransactionCategory(transaction.id, categoryId);
        if (!res.ok) {
          setFormError(res.error);
          return;
        }
        onOpenChange(false);
        onDone("Kategori transaksi diperbarui.");
        return;
      }

      const payload = {
        date: values.date,
        description: values.description,
        amount: parseInt(values.amount, 10),
        direction: values.direction,
        bankAccountId: values.bankAccountId,
        categoryId,
      };

      const res =
        mode === "edit" && transaction
          ? await updateManualTransaction(transaction.id, payload)
          : await createManualTransaction(payload);

      if (!res.ok) {
        setFormError(res.error);
        return;
      }
      onOpenChange(false);
      onDone(mode === "edit" ? "Transaksi diperbarui." : "Transaksi ditambahkan.");
    } catch {
      setFormError("Gagal menyimpan transaksi. Coba lagi.");
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!isSubmitting) onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogTitle>
          {mode === "edit" ? "Edit transaksi" : "Tambah transaksi"}
        </DialogTitle>

        <form noValidate onSubmit={onSubmit} className="mt-4 flex flex-col gap-4">
          {formError && <AlertStrip>{formError}</AlertStrip>}
          {isImport && (
            <AlertStrip>
              Data dari mutasi bank tidak bisa diubah. Kamu tetap bisa mengganti
              kategorinya.
            </AlertStrip>
          )}

          <div>
            <Label htmlFor="tx-date">Tanggal</Label>
            <Input
              id="tx-date"
              type="date"
              disabled={isImport || isSubmitting}
              invalid={!!errors.date}
              aria-invalid={!!errors.date}
              {...register("date")}
            />
            <FieldError>{errors.date?.message}</FieldError>
          </div>

          <div>
            <Label htmlFor="tx-desc">Deskripsi</Label>
            <Input
              id="tx-desc"
              placeholder="Contoh: Bayar listrik PLN"
              disabled={isImport || isSubmitting}
              invalid={!!errors.description}
              aria-invalid={!!errors.description}
              {...register("description")}
            />
            <FieldError>{errors.description?.message}</FieldError>
          </div>

          <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <div>
              <Label htmlFor="tx-amount">Jumlah</Label>
              <Controller
                control={control}
                name="amount"
                render={({ field }) => (
                  <RupiahInput
                    id="tx-amount"
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    disabled={isImport || isSubmitting}
                    invalid={!!errors.amount}
                    aria-invalid={!!errors.amount}
                  />
                )}
              />
              <FieldError>{errors.amount?.message}</FieldError>
            </div>

            <div>
              <Label>Arah</Label>
              <Controller
                control={control}
                name="direction"
                render={({ field }) => (
                  <Segmented
                    ariaLabel="Arah transaksi"
                    value={field.value ?? "out"}
                    onChange={field.onChange}
                    disabled={isImport || isSubmitting}
                    className="w-full"
                    options={[
                      { value: "in", label: "Masuk", icon: ArrowDownLeft },
                      { value: "out", label: "Keluar", icon: ArrowUpRight },
                    ]}
                  />
                )}
              />
              <FieldError>{errors.direction?.message}</FieldError>
            </div>
          </div>

          <div>
            <Label htmlFor="tx-account">Rekening</Label>
            <Controller
              control={control}
              name="bankAccountId"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  disabled={isImport || isSubmitting}
                >
                  <SelectTrigger id="tx-account" invalid={!!errors.bankAccountId}>
                    <SelectValue placeholder="Pilih rekening" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.bankCode} · {a.label} ·{" "}
                        <span className="text-[var(--text-muted)]">
                          •••• {a.accountMask}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError>{errors.bankAccountId?.message}</FieldError>
          </div>

          <div>
            <Label htmlFor="tx-category">
              {isImport ? "Kategori" : "Kategori (opsional)"}
            </Label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <CategorySelect
                  id="tx-category"
                  mode="assign"
                  categories={categories}
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  keepCategoryId={transaction?.categoryId ?? null}
                  disabled={isSubmitting}
                  placeholder="Pilih kategori"
                  ariaLabel="Kategori transaksi"
                  leadingItem={
                    isImport
                      ? undefined
                      : { value: CATEGORY_NONE, label: "— Tanpa kategori —" }
                  }
                />
              )}
            />
            {!isImport && (
              <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                Kalau kosong, transaksi masuk &quot;Perlu ditinjau&quot;.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 size={16} strokeWidth={1.75} className="animate-spin" />
                  Menyimpan…
                </>
              ) : (
                "Simpan"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
