"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertStrip } from "@/components/ui/alert-strip";
import { CategorySelect } from "@/components/categories/category-select";
import { bulkUpdateTransactionCategory } from "@/actions/transactions";
import type { CategoryDTO } from "@/lib/categories/types";

/**
 * Bulk-categorize dialog (design §3.10). Applies one category to all selected
 * transactions. Does NOT offer rule creation (bulk spans many descriptions).
 */
export function BulkCategorizeDialog({
  open,
  count,
  ids,
  categories,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  count: number;
  ids: string[];
  categories: CategoryDTO[];
  onOpenChange: (open: boolean) => void;
  onDone: (message: string) => void;
}) {
  const [categoryId, setCategoryId] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setCategoryId("");
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!categoryId) {
      setError("Pilih kategori dulu.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await bulkUpdateTransactionCategory(ids, categoryId);
      if (res.ok) {
        onOpenChange(false);
        onDone(`${res.count} transaksi dikategorikan.`);
      } else {
        setError(res.error);
      }
    } catch {
      setError("Gagal mengategorikan transaksi. Coba lagi.");
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
        <DialogTitle>Kategorikan {count} transaksi</DialogTitle>
        <DialogDescription>
          Semua transaksi terpilih akan dipindah ke kategori ini.
        </DialogDescription>

        <div className="mt-4 flex flex-col gap-4">
          {error && <AlertStrip>{error}</AlertStrip>}
          <div>
            <Label htmlFor="bulk-category">Kategori</Label>
            <CategorySelect
              id="bulk-category"
              mode="assign"
              categories={categories}
              value={categoryId}
              onValueChange={setCategoryId}
              disabled={submitting}
              placeholder="Pilih kategori"
              ariaLabel="Kategori untuk transaksi terpilih"
            />
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
