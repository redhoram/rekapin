"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileSpreadsheet,
  History,
  Landmark,
  Loader2,
  Undo2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertStrip } from "@/components/ui/alert-strip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateShort, formatRupiah } from "@/lib/utils";
import {
  MAX_UPLOAD_SIZE_BYTES,
  ACCEPTED_UPLOAD_EXTENSIONS,
  type Role,
} from "@/lib/constants";
import {
  parseUpload,
  applyMapping,
  commitUpload,
  undoUpload,
  listUploads,
  type ListUploadsResult,
  type UploadHistoryItem,
} from "@/actions/upload";
import type { ColumnMapping, PreviewPayload } from "@/lib/parsing/types";
import { Dropzone } from "./dropzone";
import { MappingWizard, type NeedsMappingData } from "./mapping-wizard";
import { PreviewTable } from "./preview-table";
import { StatCard } from "./stat-card";
import { UploadHistory } from "./upload-history";
import { ConfirmUndoDialog } from "./confirm-dialog";

export interface AccountOption {
  id: string;
  bankCode: string;
  label: string;
  accountMask: string;
}

type View = "landing" | "wizard" | "preview" | "result" | "file_error";

interface ResultData {
  insertedCount: number;
  bankLabel: string;
  uploadId: string;
  fileName: string;
}

interface UndoTarget {
  uploadId: string;
  count: number;
  fileName: string;
}

function clientValidateFile(file: File): string | null {
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return `File terlalu besar (${mb} MB). Maksimal 10 MB.`;
  }
  const lower = file.name.toLowerCase();
  if (!ACCEPTED_UPLOAD_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    return "Format tidak didukung. Unggah file .csv, .xlsx, atau .xls.";
  }
  return null;
}

export function UploadClient({
  accounts,
  initialHistory,
  isAdmin,
}: {
  accounts: AccountOption[];
  initialHistory: ListUploadsResult;
  isAdmin: boolean;
}) {
  const [view, setView] = React.useState<View>("landing");
  const [accountId, setAccountId] = React.useState<string>(
    accounts.length === 1 ? accounts[0].id : "",
  );

  const [history, setHistory] = React.useState(initialHistory.uploads);
  const currentUserId = initialHistory.currentUserId;
  const role: Role = initialHistory.role;

  const [reading, setReading] = React.useState(false);
  const [readingFileName, setReadingFileName] = React.useState<string>();
  const [landingError, setLandingError] = React.useState<string | null>(null);

  const [wizardData, setWizardData] = React.useState<NeedsMappingData | null>(null);
  const [wizardSubmitting, setWizardSubmitting] = React.useState(false);
  const [wizardError, setWizardError] = React.useState<string | null>(null);

  const [preview, setPreview] = React.useState<PreviewPayload | null>(null);
  const [committing, setCommitting] = React.useState(false);
  const [previewError, setPreviewError] = React.useState<string | null>(null);

  const [result, setResult] = React.useState<ResultData | null>(null);
  const [fileErrorMessage, setFileErrorMessage] = React.useState<string | null>(null);

  const [undoTarget, setUndoTarget] = React.useState<UndoTarget | null>(null);
  const [undoBusy, setUndoBusy] = React.useState(false);
  const [undoNotice, setUndoNotice] = React.useState<string | null>(null);
  const [pageError, setPageError] = React.useState<string | null>(null);

  const resultHeadingRef = React.useRef<HTMLHeadingElement>(null);

  React.useEffect(() => {
    if (view === "result") resultHeadingRef.current?.focus();
  }, [view]);

  const accountLabelFor = React.useCallback(
    (id: string | null): string => {
      const acc = accounts.find((a) => a.id === id);
      return acc ? `${acc.bankCode} · ${acc.label}` : "Rekening";
    },
    [accounts],
  );

  const refreshHistory = React.useCallback(async () => {
    try {
      const res = await listUploads();
      setHistory(res.uploads);
    } catch {
      /* non-fatal — history stays as-is */
    }
  }, []);

  // --- Handlers ---

  const handleFile = async (file: File) => {
    setLandingError(null);
    setPageError(null);
    setUndoNotice(null);
    const clientError = clientValidateFile(file);
    if (clientError) {
      setLandingError(clientError);
      return;
    }
    if (!accountId) {
      setLandingError("Pilih rekening tujuan dulu.");
      return;
    }

    setReading(true);
    setReadingFileName(file.name);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("bankAccountId", accountId);

    try {
      const res = await parseUpload(formData);
      if (res.status === "error") {
        setLandingError(res.message);
      } else if (res.status === "file_error") {
        setFileErrorMessage(res.message);
        setView("file_error");
        void refreshHistory();
      } else if (res.status === "needs_mapping") {
        setWizardData(res);
        setWizardError(null);
        setView("wizard");
      } else {
        setPreview(res.preview);
        setPreviewError(null);
        setView("preview");
      }
    } catch {
      setLandingError("Terjadi kesalahan saat memproses file. Coba lagi.");
    } finally {
      setReading(false);
    }
  };

  const handleWizardSubmit = async (mapping: ColumnMapping) => {
    if (!wizardData) return;
    setWizardSubmitting(true);
    setWizardError(null);
    try {
      const res = await applyMapping(
        wizardData.uploadId,
        mapping,
        wizardData.bankAccountId,
      );
      if (res.status === "preview") {
        setPreview(res.preview);
        setPreviewError(null);
        setView("preview");
      } else {
        setWizardError(res.message);
      }
    } catch {
      setWizardError("Gagal memproses pemetaan. Coba lagi.");
    } finally {
      setWizardSubmitting(false);
    }
  };

  const backToLanding = () => {
    setView("landing");
    setPreview(null);
    setWizardData(null);
    setFileErrorMessage(null);
    void refreshHistory();
  };

  const handleCommit = async () => {
    if (!preview) return;
    setCommitting(true);
    setPreviewError(null);
    try {
      const res = await commitUpload(preview.uploadId, preview.bankAccountId);
      if (res.ok) {
        setResult({
          insertedCount: res.insertedCount,
          bankLabel: res.bankLabel,
          uploadId: preview.uploadId,
          fileName: preview.fileName,
        });
        setView("result");
        void refreshHistory();
      } else {
        setPreviewError(res.error);
      }
    } catch {
      setPreviewError("Gagal menyimpan transaksi. Coba lagi.");
    } finally {
      setCommitting(false);
    }
  };

  const handleUploadAgain = () => {
    setResult(null);
    setPreview(null);
    setUndoNotice(null);
    setView("landing");
    void refreshHistory();
  };

  const confirmUndo = async () => {
    if (!undoTarget) return;
    setUndoBusy(true);
    setPageError(null);
    try {
      const res = await undoUpload(undoTarget.uploadId);
      if (res.ok) {
        setUndoTarget(null);
        setUndoNotice(
          `Batch dibatalkan. ${res.deletedCount} transaksi dihapus.`,
        );
        void refreshHistory();
      } else {
        setUndoTarget(null);
        setPageError(`Batch ini tidak bisa dibatalkan. ${res.error}`);
      }
    } catch {
      setUndoTarget(null);
      setPageError("Gagal membatalkan batch. Coba lagi.");
    } finally {
      setUndoBusy(false);
    }
  };

  // ------------------------------------------------------------------
  // WIZARD
  // ------------------------------------------------------------------
  if (view === "wizard" && wizardData) {
    return (
      <>
        <MappingWizard
          data={wizardData}
          accountLabel={accountLabelFor(wizardData.bankAccountId)}
          submitting={wizardSubmitting}
          error={wizardError}
          onSubmit={handleWizardSubmit}
          onCancel={backToLanding}
        />
        <UndoDialog
          target={undoTarget}
          busy={undoBusy}
          onClose={() => setUndoTarget(null)}
          onConfirm={confirmUndo}
        />
      </>
    );
  }

  // ------------------------------------------------------------------
  // PREVIEW
  // ------------------------------------------------------------------
  if (view === "preview" && preview) {
    const allDuplicates =
      preview.validCount === 0 &&
      preview.duplicateCount > 0 &&
      preview.failedCount === 0;
    const allFailed = preview.validCount === 0 && preview.failedCount > 0;
    const dateRangeText = preview.dateRange
      ? preview.dateRange.min === preview.dateRange.max
        ? formatDateShort(preview.dateRange.min)
        : `${formatDateShort(preview.dateRange.min)} – ${formatDateShort(preview.dateRange.max)}`
      : "—";

    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        {/* C1 header */}
        <div>
          <Button variant="ghost" size="sm" className="-ml-3" onClick={backToLanding}>
            ← Batal
          </Button>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-[var(--text)]">
            Cek dulu sebelum disimpan
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--text-muted)]">
            <Landmark size={16} strokeWidth={1.75} aria-hidden="true" />
            <span>
              Menyimpan ke:{" "}
              <span className="font-medium text-[var(--text)]">
                {accountLabelFor(preview.bankAccountId)}
              </span>
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
            <FileSpreadsheet size={14} strokeWidth={1.75} aria-hidden="true" />
            <span className="truncate">{preview.fileName}</span>
            <span className="rounded-full border border-[var(--border)] px-2 py-0.5">
              {preview.presetUsed
                ? `Terdeteksi: ${preview.presetUsed}`
                : preview.usedManualMapping
                  ? "Pemetaan manual"
                  : "Template Rekapin"}
            </span>
          </div>
        </div>

        {/* C6 / soft warnings */}
        {preview.encodingWarning && (
          <AlertStrip>
            Sebagian teks mungkin tampil aneh karena encoding file. Angka &
            tanggal tetap terbaca; perbaiki deskripsi nanti saat kategorisasi.
          </AlertStrip>
        )}
        {allDuplicates && (
          <AlertStrip>
            Semua {preview.rowCount} baris sudah pernah dicatat. Tidak ada
            transaksi baru untuk disimpan.
          </AlertStrip>
        )}
        {allFailed && (
          <AlertStrip>
            Tidak ada baris yang bisa dibaca. Perbaiki file atau cek pemetaan
            kolom, lalu unggah ulang.
          </AlertStrip>
        )}
        {previewError && <AlertStrip>{previewError}</AlertStrip>}

        {/* C2 summary */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <StatCard label="Baris valid" value={preview.validCount} sub="siap disimpan" icon={Check} />
          <StatCard label="Duplikat" value={preview.duplicateCount} sub="dilewati" icon={Copy} />
          <StatCard
            label="Gagal parse"
            value={preview.failedCount}
            sub="perlu dicek"
            icon={AlertTriangle}
            iconAttention={preview.failedCount > 0}
          />
          <StatCard label="Rentang tanggal" value={dateRangeText} sub="periode" icon={Calendar} compact />
          <StatCard label="Total masuk" value={formatRupiah(preview.totalIn)} icon={ArrowDownLeft} compact />
          <StatCard label="Total keluar" value={formatRupiah(preview.totalOut)} icon={ArrowUpRight} compact />
        </div>

        {/* C3 + C4 */}
        <PreviewTable
          rows={preview.rows}
          counts={{
            all: preview.rowCount,
            valid: preview.validCount,
            duplicate: preview.duplicateCount,
            failed: preview.failedCount,
          }}
          totalRowCount={preview.rowCount}
        />

        {/* C5 commit bar */}
        <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--text-muted)]">
            Akan menyimpan{" "}
            <span className="font-medium text-[var(--text)]">
              {preview.validCount}
            </span>{" "}
            transaksi · {preview.duplicateCount} duplikat dilewati ·{" "}
            {preview.failedCount} gagal
            {preview.skippedExampleCount > 0 &&
              ` · ${preview.skippedExampleCount} baris contoh dilewati`}
            .
          </p>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button variant="secondary" onClick={backToLanding} disabled={committing}>
              Batal
            </Button>
            <Button
              onClick={handleCommit}
              disabled={committing || preview.validCount === 0}
              aria-busy={committing}
            >
              {committing ? (
                <>
                  <Loader2 size={18} strokeWidth={1.75} className="animate-spin" />
                  Menyimpan…
                </>
              ) : preview.validCount === 0 ? (
                "Tidak ada transaksi untuk disimpan"
              ) : (
                `Simpan ${preview.validCount} transaksi`
              )}
            </Button>
          </div>
        </div>

        <UndoDialog
          target={undoTarget}
          busy={undoBusy}
          onClose={() => setUndoTarget(null)}
          onConfirm={confirmUndo}
        />
      </div>
    );
  }

  // ------------------------------------------------------------------
  // FILE ERROR
  // ------------------------------------------------------------------
  if (view === "file_error") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-card)]">
          <AlertTriangle
            size={28}
            strokeWidth={1.75}
            aria-hidden="true"
            className="text-[var(--yellow)]"
          />
        </div>
        <h1 className="font-display text-xl font-bold tracking-tight text-[var(--text)]">
          File tidak bisa dibaca
        </h1>
        <p className="text-sm text-[var(--text-muted)]">{fileErrorMessage}</p>
        <Button onClick={backToLanding}>Coba file lain</Button>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // RESULT
  // ------------------------------------------------------------------
  if (view === "result" && result) {
    return (
      <div className="flex flex-col gap-8">
        <div
          aria-live="polite"
          className="mx-auto flex max-w-md flex-col items-center gap-4 py-8 text-center"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-card)]">
            <CheckCircle2
              size={28}
              strokeWidth={1.75}
              aria-hidden="true"
              className="text-[var(--text)]"
            />
          </div>
          <h1
            ref={resultHeadingRef}
            tabIndex={-1}
            className="font-display text-xl font-bold tracking-tight text-[var(--text)] outline-none"
          >
            Berhasil disimpan
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text)]">
              {result.insertedCount} transaksi
            </span>{" "}
            tercatat ke{" "}
            <span className="font-medium text-[var(--text)]">
              {result.bankLabel}
            </span>
            . Langkah berikutnya: kategorikan transaksinya.
          </p>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-center">
            <Button asChild>
              <Link href="/transactions">
                Lihat transaksi
                <ArrowUpRight size={18} strokeWidth={1.75} className="rotate-45" />
              </Link>
            </Button>
            <Button variant="secondary" onClick={handleUploadAgain}>
              Unggah lagi
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-[var(--text-muted)]"
            onClick={() =>
              setUndoTarget({
                uploadId: result.uploadId,
                count: result.insertedCount,
                fileName: result.fileName,
              })
            }
          >
            <Undo2 size={16} strokeWidth={1.75} />
            Batalkan batch ini
          </Button>
        </div>

        {pageError && <AlertStrip>{pageError}</AlertStrip>}
        {undoNotice && (
          <p className="text-center text-sm text-[var(--text-muted)]">
            {undoNotice}
          </p>
        )}

        <HistorySection
          items={history}
          currentUserId={currentUserId}
          role={role}
          onUndo={(item) =>
            setUndoTarget({
              uploadId: item.id,
              count: item.transactionCount,
              fileName: item.originalName,
            })
          }
        />

        <UndoDialog
          target={undoTarget}
          busy={undoBusy}
          onClose={() => setUndoTarget(null)}
          onConfirm={confirmUndo}
        />
      </div>
    );
  }

  // ------------------------------------------------------------------
  // LANDING
  // ------------------------------------------------------------------
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text)] md:text-3xl">
          Upload mutasi
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Unggah file mutasi rekening atau template Excel Rekapin. Transaksi
          dibaca otomatis — kamu cek dulu sebelum disimpan.
        </p>
      </div>

      {pageError && <AlertStrip>{pageError}</AlertStrip>}
      {undoNotice && (
        <p className="text-sm text-[var(--text-muted)]">{undoNotice}</p>
      )}
      {landingError && <AlertStrip>{landingError}</AlertStrip>}

      {/* A2 account selector */}
      <Card className="p-6 max-sm:p-5">
        <Label htmlFor="account-select">Rekening tujuan</Label>
        {accounts.length === 0 ? (
          <div className="text-sm text-[var(--text-muted)]">
            Belum ada rekening.{" "}
            {isAdmin ? (
              <Button variant="link" size="sm" asChild className="h-auto p-0">
                <Link href="/settings">Tambahkan dulu di Pengaturan.</Link>
              </Button>
            ) : (
              <span>Minta admin menambahkannya di Pengaturan.</span>
            )}
          </div>
        ) : (
          <>
            <Select value={accountId || undefined} onValueChange={setAccountId}>
              <SelectTrigger id="account-select">
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
            <p className="mt-1.5 text-xs text-[var(--text-muted)]">
              File akan dicatat ke rekening ini. Pemetaan kolom disimpan per
              rekening.
            </p>
          </>
        )}
      </Card>

      {/* A3 dropzone */}
      <Dropzone
        disabled={accounts.length === 0 || !accountId}
        reading={reading}
        readingFileName={readingFileName}
        onFile={handleFile}
      />

      {/* A4 template link */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Download
          size={16}
          strokeWidth={1.75}
          aria-hidden="true"
          className="text-[var(--text-muted)]"
        />
        <a
          href="/api/upload/template"
          download
          className="text-[var(--text)] underline underline-offset-4 outline-none hover:text-[var(--yellow-hover)] focus-visible:ring-2 focus-visible:ring-[var(--yellow)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
        >
          Unduh template Excel Rekapin
        </a>
        <span className="text-[var(--text-muted)]">
          — isi manual kalau tidak punya file mutasi bank.
        </span>
      </div>

      {/* A5 history */}
      <HistorySection
        items={history}
        currentUserId={currentUserId}
        role={role}
        onUndo={(item) =>
          setUndoTarget({
            uploadId: item.id,
            count: item.transactionCount,
            fileName: item.originalName,
          })
        }
      />

      <UndoDialog
        target={undoTarget}
        busy={undoBusy}
        onClose={() => setUndoTarget(null)}
        onConfirm={confirmUndo}
      />
    </div>
  );
}

function HistorySection({
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
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <History
          size={16}
          strokeWidth={1.75}
          aria-hidden="true"
          className="text-[var(--text-muted)]"
        />
        <h2 className="font-display text-lg font-bold tracking-tight text-[var(--text)]">
          Riwayat upload
        </h2>
      </div>
      <UploadHistory
        items={items}
        currentUserId={currentUserId}
        role={role}
        onUndo={onUndo}
      />
    </section>
  );
}

function UndoDialog({
  target,
  busy,
  onClose,
  onConfirm,
}: {
  target: UndoTarget | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmUndoDialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      count={target?.count ?? 0}
      fileName={target?.fileName ?? ""}
      busy={busy}
      onConfirm={onConfirm}
    />
  );
}
