"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { AlertStrip } from "@/components/ui/alert-strip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategorySelect } from "@/components/categories/category-select";
import { createRule, updateRule, type RuleDTO } from "@/actions/rules";
import type { CategoryDTO } from "@/lib/categories/types";

export function RuleFormDialog({
  open,
  mode,
  rule,
  categories,
  defaultPriority,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  mode: "create" | "edit";
  rule: RuleDTO | null;
  categories: CategoryDTO[];
  defaultPriority: number;
  onOpenChange: (open: boolean) => void;
  onDone: (message: string) => void;
}) {
  const [pattern, setPattern] = React.useState("");
  const [matchType, setMatchType] = React.useState<"contains" | "prefix">(
    "contains",
  );
  const [categoryId, setCategoryId] = React.useState("");
  const [priority, setPriority] = React.useState("");
  const [errors, setErrors] = React.useState<{
    pattern?: string;
    categoryId?: string;
    priority?: string;
  }>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setErrors({});
    setFormError(null);
    setSubmitting(false);
    if (mode === "edit" && rule) {
      setPattern(rule.pattern);
      setMatchType(rule.matchType);
      setCategoryId(rule.categoryId);
      setPriority(String(rule.priority));
    } else {
      setPattern("");
      setMatchType("contains");
      setCategoryId("");
      setPriority(String(defaultPriority));
    }
  }, [open, mode, rule, defaultPriority]);

  const handleSubmit = async () => {
    const nextErrors: typeof errors = {};
    if (pattern.trim() === "") nextErrors.pattern = "Pola tidak boleh kosong.";
    if (categoryId === "") nextErrors.categoryId = "Pilih kategori.";
    const priorityNum = Number.parseInt(priority, 10);
    if (!Number.isFinite(priorityNum))
      nextErrors.priority = "Prioritas harus angka.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setFormError(null);
    try {
      const res =
        mode === "edit" && rule
          ? await updateRule(rule.id, {
              pattern,
              matchType,
              categoryId,
              priority: priorityNum,
            })
          : await createRule({ pattern, matchType, categoryId, priority: priorityNum });
      if (res.ok) {
        onOpenChange(false);
        onDone(mode === "edit" ? "Aturan diperbarui." : "Aturan ditambahkan.");
      } else {
        setFormError(res.error);
      }
    } catch {
      setFormError("Gagal menyimpan aturan. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!submitting) onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogTitle>
          {mode === "edit" ? "Edit aturan" : "Tambah aturan"}
        </DialogTitle>

        <div className="mt-4 flex flex-col gap-4">
          {formError && <AlertStrip>{formError}</AlertStrip>}

          <div>
            <Label htmlFor="rule-pattern">Pola</Label>
            <Input
              id="rule-pattern"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="Contoh: GOJEK"
              disabled={submitting}
              invalid={!!errors.pattern}
              aria-invalid={!!errors.pattern}
            />
            {errors.pattern ? (
              <FieldError>{errors.pattern}</FieldError>
            ) : (
              <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                Tidak peka huruf besar/kecil.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="rule-match">Cocokkan dengan</Label>
            <Select
              value={matchType}
              onValueChange={(v) => setMatchType(v as "contains" | "prefix")}
              disabled={submitting}
            >
              <SelectTrigger id="rule-match">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contains">Mengandung</SelectItem>
                <SelectItem value="prefix">Diawali</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-xs text-[var(--text-muted)]">
              Mengandung = kata ada di mana pun. Diawali = deskripsi dimulai
              dengan kata ini.
            </p>
          </div>

          <div>
            <Label htmlFor="rule-category">Kategori</Label>
            <CategorySelect
              id="rule-category"
              mode="assign"
              categories={categories}
              value={categoryId}
              onValueChange={setCategoryId}
              keepCategoryId={rule?.categoryId ?? null}
              disabled={submitting}
              placeholder="Pilih kategori"
              ariaLabel="Kategori target aturan"
              invalid={!!errors.categoryId}
            />
            <FieldError>{errors.categoryId}</FieldError>
          </div>

          <div>
            <Label htmlFor="rule-priority">Prioritas</Label>
            <Input
              id="rule-priority"
              type="number"
              inputMode="numeric"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="tabular-nums"
              disabled={submitting}
              invalid={!!errors.priority}
              aria-invalid={!!errors.priority}
            />
            {errors.priority ? (
              <FieldError>{errors.priority}</FieldError>
            ) : (
              <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                Angka lebih kecil diproses lebih dulu.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Batal
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 size={16} strokeWidth={1.75} className="animate-spin" />
                Menyimpan…
              </>
            ) : (
              "Simpan"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
