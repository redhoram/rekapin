"use client";

import * as React from "react";
import {
  AlertTriangle,
  Check,
  Clock,
  FileSpreadsheet,
  Loader2,
  Undo2,
  Wand2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatDateShort } from "@/lib/utils";
import type { Role } from "@/lib/constants";
import type { UploadHistoryItem } from "@/actions/upload";

type UploadStatus = UploadHistoryItem["status"];

const STATUS_CONFIG: Record<
  UploadStatus,
  { label: string; icon: typeof Check; attention: boolean; spin?: boolean }
> = {
  committed: { label: "Tersimpan", icon: Check, attention: false },
  parsed: { label: "Belum disimpan", icon: Clock, attention: false },
  undone: { label: "Dibatalkan", icon: Undo2, attention: false },
  failed: { label: "Gagal", icon: AlertTriangle, attention: true },
  pending: { label: "Menunggu", icon: Loader2, attention: false, spin: true },
};

function StatusChip({ status }: { status: UploadStatus }) {
  const { label, icon: Icon, attention, spin } = STATUS_CONFIG[status];
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[var(--border)] px-2 py-0.5 text-xs font-medium text-[var(--text)]">
      <Icon
        size={14}
        strokeWidth={1.75}
        aria-hidden="true"
        className={cn(
          attention ? "text-[var(--yellow)]" : "text-[var(--text-muted)]",
          spin && "animate-spin",
        )}
      />
      {label}
    </span>
  );
}

/** Shown when a per-account saved mapping was reused (no wizard, no preset). */
function SavedMappingChip() {
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[var(--border)] px-2 py-0.5 text-xs font-medium text-[var(--text-muted)]"
      title="Pemetaan kolom tersimpan untuk rekening ini dipakai ulang."
    >
      <Wand2 size={14} strokeWidth={1.75} aria-hidden="true" />
      Mapping tersimpan
    </span>
  );
}

function EmptyState() {
  return (
    <Card className="flex flex-col items-center gap-3 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-md border border-[var(--border)]">
        <FileSpreadsheet
          size={20}
          strokeWidth={1.75}
          aria-hidden="true"
          className="text-[var(--text-muted)]"
        />
      </div>
      <p className="text-sm text-[var(--text-muted)]">
        Belum ada upload. File yang kamu unggah akan muncul di sini.
      </p>
    </Card>
  );
}

export function UploadHistory({
  items,
  currentUserId,
  role,
  onUndo,
}: {
  items: UploadHistoryItem[];
  currentUserId: string;
  role: Role;
  onUndo: (item: UploadHistoryItem) => void;
}) {
  if (items.length === 0) return <EmptyState />;

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => {
        const bank =
          item.bankCode && item.bankLabel
            ? `${item.bankCode} · ${item.bankLabel}`
            : "Rekening dihapus";
        const count =
          item.status === "committed" ? item.transactionCount : item.rowCount;

        const canUndo =
          item.status === "committed" &&
          (role === "admin" || item.uploadedBy === currentUserId);
        const undoBlocked = item.hasEditedRows;
        const helperId = `undo-help-${item.id}`;

        return (
          <li
            key={item.id}
            className={cn(
              "flex flex-col gap-3 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-3 sm:flex-row sm:items-center",
              item.status === "undone" && "text-[var(--text-muted)]",
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--border)]">
              <FileSpreadsheet
                size={18}
                strokeWidth={1.75}
                aria-hidden="true"
                className="text-[var(--text-muted)]"
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-[var(--text)]">
                {item.originalName}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {bank} · {count} transaksi · {formatDateShort(item.createdAt)}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {item.mappingSource === "saved" && <SavedMappingChip />}
              <StatusChip status={item.status} />
              {canUndo && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={undoBlocked}
                    aria-describedby={undoBlocked ? helperId : undefined}
                    title={
                      undoBlocked
                        ? "Ada transaksi yang sudah diedit — tidak bisa dibatalkan."
                        : undefined
                    }
                    onClick={() => onUndo(item)}
                  >
                    <Undo2 size={16} strokeWidth={1.75} />
                    Batalkan
                  </Button>
                  {undoBlocked && (
                    <span id={helperId} className="sr-only">
                      Ada transaksi yang sudah diedit — tidak bisa dibatalkan.
                    </span>
                  )}
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
