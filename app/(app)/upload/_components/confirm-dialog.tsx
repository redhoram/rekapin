"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Destructive undo confirmation (design §7.4). Radix AlertDialog gives focus
 * trap + Esc + aria-modal + scroll lock. Default focus lands on the SAFE
 * "Kembali" (Radix focuses Cancel) — deletion never gets the yellow accent.
 */
export function ConfirmUndoDialog({
  open,
  onOpenChange,
  count,
  fileName,
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  fileName: string;
  busy: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!busy) onOpenChange(o);
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-[color-mix(in_srgb,#0A0A0A_50%,transparent)]" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-[var(--text)] shadow-[0_10px_28px_-10px_rgba(10,10,10,0.14)] dark:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.45)]">
          <AlertDialog.Title className="font-display text-lg font-bold tracking-tight">
            Batalkan batch ini?
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-[var(--text-muted)]">
            {count} transaksi dari{" "}
            <span className="italic text-[var(--text)]">{fileName}</span> akan
            dihapus permanen. Tindakan ini tidak bisa dibatalkan.
          </AlertDialog.Description>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={onConfirm} disabled={busy}>
              {busy ? (
                <>
                  <Loader2 size={16} strokeWidth={1.75} className="animate-spin" />
                  Membatalkan…
                </>
              ) : (
                <>
                  <Trash2 size={16} strokeWidth={1.75} />
                  Ya, hapus {count} transaksi
                </>
              )}
            </Button>
            <AlertDialog.Cancel asChild>
              <Button variant="primary" disabled={busy}>
                Kembali
              </Button>
            </AlertDialog.Cancel>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
