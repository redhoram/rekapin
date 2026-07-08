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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertStrip } from "@/components/ui/alert-strip";
import { Segmented } from "@/components/ui/segmented";
import { CategoryChip } from "@/components/categories/visuals";
import { createRuleFromCorrection } from "@/actions/rules";
import type { CategoryDTO } from "@/lib/categories/types";
import type { Role } from "@/lib/constants";

export interface CorrectionTarget {
  description: string;
  category: CategoryDTO;
}

/**
 * Rule offer after a SINGLE inline category edit (design §4). Non-blocking — the
 * category change is already saved; anything here is optional. Copy branches by
 * role: admin creates an active rule directly; staff proposes it to the admin.
 */
export function CorrectionRuleDialog({
  target,
  role,
  onOpenChange,
  onDone,
}: {
  target: CorrectionTarget | null;
  role: Role;
  onOpenChange: (open: boolean) => void;
  onDone: (message: string) => void;
}) {
  const isAdmin = role === "admin";
  const [pattern, setPattern] = React.useState("");
  const [matchType, setMatchType] = React.useState<"contains" | "prefix">(
    "contains",
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset the form whenever a new target opens.
  React.useEffect(() => {
    if (target) {
      setPattern(target.description);
      setMatchType("contains");
      setError(null);
      setSubmitting(false);
    }
  }, [target]);

  if (!target) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await createRuleFromCorrection({
        pattern,
        matchType,
        categoryId: target.category.id,
      });
      if (res.ok) {
        onOpenChange(false);
        onDone(
          isAdmin
            ? "Aturan dibuat. Impor berikutnya otomatis terkategorikan."
            : "Usulan dikirim ke admin.",
        );
      } else {
        setError(res.error);
      }
    } catch {
      setError("Gagal menyimpan aturan. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={target !== null}
      onOpenChange={(o) => {
        if (!submitting) onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogTitle>
          {isAdmin ? "Buat aturan otomatis?" : "Ajukan aturan ke admin?"}
        </DialogTitle>
        <DialogDescription>
          {isAdmin
            ? "Selalu kategorikan transaksi yang cocok pola ini ke kategori tersebut?"
            : "Usulkan agar transaksi yang cocok pola ini selalu masuk kategori ini. Admin akan meninjau usulanmu."}
        </DialogDescription>

        <div className="mt-4 flex flex-col gap-4">
          {error && <AlertStrip>{error}</AlertStrip>}

          <div>
            <Label htmlFor="rule-pattern">Pola</Label>
            <Input
              id="rule-pattern"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div>
            <Label>Cocokkan dengan</Label>
            <Segmented
              ariaLabel="Cara pencocokan pola"
              value={matchType}
              onChange={setMatchType}
              disabled={submitting}
              options={[
                { value: "contains", label: "Mengandung" },
                { value: "prefix", label: "Diawali" },
              ]}
            />
            <p className="mt-1.5 text-xs text-[var(--text-muted)]">
              Mengandung = kata ini ada di bagian mana pun deskripsi. Diawali =
              deskripsi dimulai dengan kata ini.
            </p>
          </div>

          <div>
            <Label>Kategori target</Label>
            <div>
              <CategoryChip
                name={target.category.name}
                type={target.category.type}
                archived={target.category.archivedAt !== null}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Lewati
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 size={16} strokeWidth={1.75} className="animate-spin" />
                Menyimpan…
              </>
            ) : isAdmin ? (
              "Buat aturan"
            ) : (
              "Ajukan ke admin"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
