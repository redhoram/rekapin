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
import { TypeIcon } from "@/components/categories/visuals";
import {
  CATEGORY_TYPES_ORDERED,
  CATEGORY_TYPE_META,
} from "@/lib/categories/meta";
import { createCategory, updateCategory } from "@/actions/categories";
import type { CategoryDTO } from "@/lib/categories/types";

export function CategoryFormDialog({
  open,
  mode,
  category,
  inUse,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  mode: "create" | "edit";
  category: CategoryDTO | null;
  inUse: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: (message: string) => void;
}) {
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<string>("");
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [typeError, setTypeError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setNameError(null);
    setTypeError(null);
    setFormError(null);
    setSubmitting(false);
    if (mode === "edit" && category) {
      setName(category.name);
      setType(category.type);
    } else {
      setName("");
      setType("");
    }
  }, [open, mode, category]);

  const handleSubmit = async () => {
    setNameError(null);
    setTypeError(null);
    setFormError(null);
    if (name.trim() === "") {
      setNameError("Nama tidak boleh kosong.");
      return;
    }
    if (type === "") {
      setTypeError("Pilih tipe.");
      return;
    }
    setSubmitting(true);
    try {
      const res =
        mode === "edit" && category
          ? await updateCategory(category.id, { name, type })
          : await createCategory({ name, type });
      if (res.ok) {
        onOpenChange(false);
        onDone(mode === "edit" ? "Kategori diperbarui." : "Kategori ditambahkan.");
      } else {
        setFormError(res.error);
      }
    } catch {
      setFormError("Gagal menyimpan kategori. Coba lagi.");
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
          {mode === "edit" ? "Edit kategori" : "Tambah kategori"}
        </DialogTitle>

        <div className="mt-4 flex flex-col gap-4">
          {formError && <AlertStrip>{formError}</AlertStrip>}

          <div>
            <Label htmlFor="cat-name">Nama kategori</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Biaya Kemasan"
              disabled={submitting}
              invalid={!!nameError}
              aria-invalid={!!nameError}
            />
            <FieldError>{nameError}</FieldError>
          </div>

          <div>
            <Label htmlFor="cat-type">Tipe</Label>
            <Select value={type} onValueChange={setType} disabled={submitting}>
              <SelectTrigger id="cat-type" invalid={!!typeError}>
                <SelectValue placeholder="Pilih tipe" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_TYPES_ORDERED.map((t) => {
                  const meta = CATEGORY_TYPE_META[t];
                  return (
                    <SelectItem key={t} value={t}>
                      <span className="inline-flex items-center gap-1.5">
                        <TypeIcon type={t} />
                        {meta.label}
                        {meta.subLabel && (
                          <span className="text-[var(--text-muted)]">
                            · {meta.subLabel}
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <FieldError>{typeError}</FieldError>
            {mode === "edit" && inUse && !typeError && (
              <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                Mengubah tipe akan memengaruhi penempatan di laporan ke depan.
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
