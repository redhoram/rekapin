"use client";

import * as React from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Loader2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Generic destructive/soft confirmation (design §5.2/§5.3). Radix AlertDialog —
 * default focus lands on the SAFE "Batal" (Cancel = primary), the confirm action
 * is ghost so it never gets the yellow accent. Reused for archive / reject / delete.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmBusyLabel,
  confirmIcon: ConfirmIcon,
  busy,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  confirmBusyLabel: string;
  confirmIcon?: LucideIcon;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
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
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-[var(--text-muted)]">
            {description}
          </AlertDialog.Description>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={onConfirm} disabled={busy}>
              {busy ? (
                <>
                  <Loader2 size={16} strokeWidth={1.75} className="animate-spin" />
                  {confirmBusyLabel}
                </>
              ) : (
                <>
                  {ConfirmIcon && (
                    <ConfirmIcon size={16} strokeWidth={1.75} aria-hidden="true" />
                  )}
                  {confirmLabel}
                </>
              )}
            </Button>
            <AlertDialog.Cancel asChild>
              <Button variant="primary" disabled={busy}>
                Batal
              </Button>
            </AlertDialog.Cancel>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
