"use client";

import * as React from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { UPLOAD_ACCEPT_ATTR } from "@/lib/constants";

/**
 * File dropzone (design §7.1). A <label> wrapping a visually-hidden file input,
 * so it is click-, keyboard-, and drag-targetable natively. Client-side
 * size/extension pre-checks live in the parent (which owns the AlertStrip); this
 * component just emits the chosen File.
 */
export function Dropzone({
  disabled = false,
  reading = false,
  readingFileName,
  onFile,
}: {
  disabled?: boolean;
  reading?: boolean;
  readingFileName?: string;
  onFile: (file: File) => void;
}) {
  const [dragOver, setDragOver] = React.useState(false);

  const emit = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFile(file);
  };

  const inert = disabled || reading;

  return (
    <label
      onDragOver={(e) => {
        if (inert) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (inert) return;
        e.preventDefault();
        setDragOver(false);
        emit(e.dataTransfer.files);
      }}
      className={cn(
        "relative flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--bg-card)] p-8 text-center transition-colors",
        "focus-within:ring-2 focus-within:ring-[var(--yellow)] focus-within:ring-offset-2 focus-within:ring-offset-[var(--bg)]",
        !inert && "cursor-pointer hover:border-[var(--text-muted)]",
        dragOver && !inert && "border-[var(--yellow)] hover-wash",
        disabled && "cursor-not-allowed opacity-60",
        reading && "pointer-events-none",
      )}
    >
      <input
        type="file"
        accept={UPLOAD_ACCEPT_ATTR}
        disabled={inert}
        aria-busy={reading}
        className="sr-only"
        onChange={(e) => {
          emit(e.target.files);
          e.target.value = "";
        }}
      />

      {reading ? (
        <>
          <Loader2
            size={24}
            strokeWidth={1.75}
            aria-hidden="true"
            className="animate-spin text-[var(--text-muted)]"
          />
          <span className="text-sm font-medium text-[var(--text)]">
            Membaca file…
          </span>
          {readingFileName && (
            <span className="max-w-full truncate text-xs text-[var(--text-muted)]">
              {readingFileName}
            </span>
          )}
        </>
      ) : (
        <>
          <UploadCloud
            size={28}
            strokeWidth={1.75}
            aria-hidden="true"
            className={cn(
              "text-[var(--text-muted)] transition-transform",
              dragOver && !inert && "scale-105",
            )}
          />
          <span className="text-sm font-medium text-[var(--text)]">
            {dragOver && !inert
              ? "Lepas file untuk mengunggah"
              : "Seret file ke sini, atau klik untuk pilih"}
          </span>
          <span className="text-xs text-[var(--text-muted)]">
            {disabled
              ? "Pilih rekening tujuan dulu."
              : "CSV atau Excel · .csv, .xlsx, .xls · maks. 10 MB"}
          </span>
        </>
      )}
    </label>
  );
}
