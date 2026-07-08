"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  Check,
  Inbox,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertStrip } from "@/components/ui/alert-strip";
import { Segmented } from "@/components/ui/segmented";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  CategoryChip,
  MatchTypeBadge,
  TypeIcon,
} from "@/components/categories/visuals";
import { groupByType } from "@/lib/categories/meta";
import { cn } from "@/lib/utils";
import {
  archiveCategory,
  unarchiveCategory,
} from "@/actions/categories";
import {
  approveRuleProposal,
  rejectRuleProposal,
  deleteRule,
  type RuleDTO,
  type ProposalDTO,
} from "@/actions/rules";
import type { CategoryDTO } from "@/lib/categories/types";
import type { MembersData } from "@/actions/members";
import { ConfirmDialog } from "./confirm-dialog";
import { CategoryFormDialog } from "./category-form-dialog";
import { RuleFormDialog } from "./rule-form-dialog";
import { MembersPanel } from "./members-panel";

export interface SettingsClientProps {
  categories: CategoryDTO[];
  categoryUsage: Record<string, number>;
  rules: RuleDTO[];
  proposals: ProposalDTO[];
  members: MembersData;
}

type Tab = "kategori" | "aturan" | "anggota";

export function SettingsClient({
  categories,
  categoryUsage,
  rules,
  proposals,
  members,
}: SettingsClientProps) {
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>("kategori");
  const [notice, setNotice] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const done = (message: string) => {
    setNotice(message);
    setError(null);
    router.refresh();
  };
  const fail = (message: string) => {
    setError(message);
    setNotice(null);
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text)] md:text-3xl">
          Pengaturan
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Kelola kategori dan aturan otomatis untuk bisnismu.
        </p>
      </div>

      <Segmented
        ariaLabel="Bagian pengaturan"
        value={tab}
        onChange={setTab}
        options={[
          { value: "kategori", label: "Kategori" },
          { value: "aturan", label: "Aturan" },
          { value: "anggota", label: "Anggota" },
        ]}
      />

      {notice && (
        <p aria-live="polite" className="text-sm text-[var(--text-muted)]">
          {notice}
        </p>
      )}
      {error && <AlertStrip>{error}</AlertStrip>}

      {tab === "kategori" && (
        <CategoryPanel
          categories={categories}
          categoryUsage={categoryUsage}
          onDone={done}
          onError={fail}
        />
      )}
      {tab === "aturan" && (
        <RulesPanel
          rules={rules}
          proposals={proposals}
          categories={categories}
          onDone={done}
          onError={fail}
        />
      )}
      {tab === "anggota" && (
        <MembersPanel data={members} onDone={done} onError={fail} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kategori panel
// ---------------------------------------------------------------------------

function CategoryPanel({
  categories,
  categoryUsage,
  onDone,
  onError,
}: {
  categories: CategoryDTO[];
  categoryUsage: Record<string, number>;
  onDone: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [showArchived, setShowArchived] = React.useState(false);
  const [formState, setFormState] = React.useState<{
    open: boolean;
    mode: "create" | "edit";
    category: CategoryDTO | null;
  }>({ open: false, mode: "create", category: null });
  const [archiveTarget, setArchiveTarget] = React.useState<CategoryDTO | null>(
    null,
  );
  const [busy, setBusy] = React.useState(false);

  // Active first, then archived, both by name — so archived sink to group bottom.
  const visible = React.useMemo(() => {
    const list = showArchived
      ? categories
      : categories.filter((c) => c.archivedAt === null);
    return [...list].sort((a, b) => {
      const aa = a.archivedAt !== null ? 1 : 0;
      const bb = b.archivedAt !== null ? 1 : 0;
      if (aa !== bb) return aa - bb;
      return a.name.localeCompare(b.name);
    });
  }, [categories, showArchived]);

  const groups = groupByType(visible);

  const doArchive = async () => {
    if (!archiveTarget) return;
    setBusy(true);
    try {
      const res = await archiveCategory(archiveTarget.id);
      if (res.ok) {
        setArchiveTarget(null);
        onDone("Kategori diarsipkan.");
      } else {
        setArchiveTarget(null);
        onError(res.error);
      }
    } catch {
      setArchiveTarget(null);
      onError("Gagal mengarsipkan kategori. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const doUnarchive = async (id: string) => {
    try {
      const res = await unarchiveCategory(id);
      if (res.ok) onDone("Kategori dipulihkan.");
      else onError(res.error);
    } catch {
      onError("Gagal memulihkan kategori. Coba lagi.");
    }
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight text-[var(--text)]">
            Kategori
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Kelompokkan transaksi untuk laporanmu.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-[var(--text-muted)]">
            <Checkbox
              checked={showArchived}
              onCheckedChange={setShowArchived}
              aria-label="Tampilkan kategori yang diarsipkan"
            />
            Tampilkan yang diarsipkan
          </label>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              setFormState({ open: true, mode: "create", category: null })
            }
          >
            <Plus size={16} strokeWidth={1.75} />
            Tambah kategori
          </Button>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">Belum ada kategori.</p>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((group) => (
            <div key={group.type} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <TypeIcon type={group.type} size={16} />
                <span className="text-sm font-medium text-[var(--text)]">
                  {group.meta.label}
                </span>
                {group.meta.subLabel && (
                  <span className="text-xs text-[var(--text-muted)]">
                    {group.meta.subLabel}
                  </span>
                )}
                <span className="text-xs tabular-nums text-[var(--text-muted)]">
                  · {group.items.length}
                </span>
              </div>

              <ul className="flex flex-col gap-2">
                {group.items.map((cat) => {
                  const archived = cat.archivedAt !== null;
                  return (
                    <li
                      key={cat.id}
                      className={cn(
                        "flex flex-wrap items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2",
                        archived && "opacity-70",
                      )}
                    >
                      <span className="text-sm text-[var(--text)]">
                        {cat.name}
                      </span>
                      {cat.isDefault && (
                        <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">
                          Default
                        </span>
                      )}
                      {archived && (
                        <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">
                          Diarsipkan
                        </span>
                      )}
                      <div className="ml-auto flex items-center gap-1">
                        {archived ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => doUnarchive(cat.id)}
                            aria-label={`Pulihkan kategori ${cat.name}`}
                          >
                            <ArchiveRestore size={16} strokeWidth={1.75} />
                            Pulihkan
                          </Button>
                        ) : (
                          <>
                            <button
                              type="button"
                              aria-label={`Edit kategori ${cat.name}`}
                              onClick={() =>
                                setFormState({
                                  open: true,
                                  mode: "edit",
                                  category: cat,
                                })
                              }
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-muted)] outline-none transition-colors hover:hover-wash focus-visible:ring-2 focus-visible:ring-[var(--yellow)]"
                            >
                              <Pencil size={16} strokeWidth={1.75} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Arsipkan kategori ${cat.name}`}
                              onClick={() => setArchiveTarget(cat)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-muted)] outline-none transition-colors hover:hover-wash focus-visible:ring-2 focus-visible:ring-[var(--yellow)]"
                            >
                              <Archive size={16} strokeWidth={1.75} aria-hidden="true" />
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      <CategoryFormDialog
        open={formState.open}
        mode={formState.mode}
        category={formState.category}
        inUse={
          formState.category
            ? (categoryUsage[formState.category.id] ?? 0) > 0
            : false
        }
        onOpenChange={(open) => setFormState((s) => ({ ...s, open }))}
        onDone={onDone}
      />

      <ConfirmDialog
        open={archiveTarget !== null}
        title="Arsipkan kategori ini?"
        description={
          archiveTarget && (categoryUsage[archiveTarget.id] ?? 0) > 0 ? (
            <>
              Kategori{" "}
              <span className="font-medium text-[var(--text)]">
                {archiveTarget.name}
              </span>{" "}
              dipakai di transaksi yang sudah ada. Mengarsipkan{" "}
              <span className="font-medium text-[var(--text)]">tidak menghapus</span>{" "}
              data lama — kategori hanya disembunyikan dari pilihan baru. Kamu bisa
              memulihkannya kapan saja.
            </>
          ) : (
            <>
              Kategori{" "}
              <span className="font-medium text-[var(--text)]">
                {archiveTarget?.name}
              </span>{" "}
              akan disembunyikan dari pilihan baru. Kamu bisa memulihkannya kapan saja.
            </>
          )
        }
        confirmLabel="Ya, arsipkan"
        confirmBusyLabel="Mengarsipkan…"
        confirmIcon={Archive}
        busy={busy}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null);
        }}
        onConfirm={doArchive}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Aturan panel
// ---------------------------------------------------------------------------

function RulesPanel({
  rules,
  proposals,
  categories,
  onDone,
  onError,
}: {
  rules: RuleDTO[];
  proposals: ProposalDTO[];
  categories: CategoryDTO[];
  onDone: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [formState, setFormState] = React.useState<{
    open: boolean;
    mode: "create" | "edit";
    rule: RuleDTO | null;
  }>({ open: false, mode: "create", rule: null });
  const [rejectTarget, setRejectTarget] = React.useState<ProposalDTO | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = React.useState<RuleDTO | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [approvingId, setApprovingId] = React.useState<string | null>(null);

  const defaultPriority =
    rules.reduce((max, r) => Math.max(max, r.priority), 0) + 10;

  const approve = async (id: string) => {
    setApprovingId(id);
    try {
      const res = await approveRuleProposal(id);
      if (res.ok) onDone("Usulan disetujui.");
      else onError(res.error);
    } catch {
      onError("Gagal menyetujui usulan. Coba lagi.");
    } finally {
      setApprovingId(null);
    }
  };

  const doReject = async () => {
    if (!rejectTarget) return;
    setBusy(true);
    try {
      const res = await rejectRuleProposal(rejectTarget.id);
      if (res.ok) {
        setRejectTarget(null);
        onDone("Usulan ditolak.");
      } else {
        setRejectTarget(null);
        onError(res.error);
      }
    } catch {
      setRejectTarget(null);
      onError("Gagal menolak usulan. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const res = await deleteRule(deleteTarget.id);
      if (res.ok) {
        setDeleteTarget(null);
        onDone("Aturan dihapus.");
      } else {
        setDeleteTarget(null);
        onError(res.error);
      }
    } catch {
      setDeleteTarget(null);
      onError("Gagal menghapus aturan. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight text-[var(--text)]">
            Aturan otomatis
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Transaksi yang cocok akan dikategorikan otomatis saat impor.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setFormState({ open: true, mode: "create", rule: null })}
        >
          <Plus size={16} strokeWidth={1.75} />
          Tambah aturan
        </Button>
      </div>

      {/* Pending proposals */}
      {proposals.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Inbox
              size={16}
              strokeWidth={1.75}
              className="text-[var(--text-muted)]"
              aria-hidden="true"
            />
            <span className="text-sm font-medium text-[var(--text)]">
              Menunggu persetujuan
            </span>
            <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] tabular-nums text-[var(--text-muted)]">
              {proposals.length}
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {proposals.map((p) => (
              <li
                key={p.id}
                className="flex flex-col gap-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium tracking-tight text-[var(--text)]">
                    {p.pattern}
                  </span>
                  <MatchTypeBadge matchType={p.matchType} />
                  <span aria-hidden="true" className="text-[var(--text-muted)]">
                    →
                  </span>
                  <CategoryChip
                    name={p.categoryName}
                    type={p.categoryType}
                    archived={p.categoryArchived}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-[var(--text-muted)]">
                    Diusulkan oleh{" "}
                    <span className="font-medium text-[var(--text)]">
                      {p.proposedByName ?? "anggota"}
                    </span>
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={approvingId === p.id}
                      onClick={() => approve(p.id)}
                    >
                      <Check size={16} strokeWidth={1.75} />
                      Setujui
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRejectTarget(p)}
                    >
                      <X size={16} strokeWidth={1.75} />
                      Tolak
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Active rules */}
      {rules.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-md border border-[var(--border)]">
            <Wand2
              size={20}
              strokeWidth={1.75}
              className="text-[var(--text-muted)]"
              aria-hidden="true"
            />
          </div>
          <h3 className="font-display text-lg font-bold tracking-tight text-[var(--text)]">
            Belum ada aturan otomatis
          </h3>
          <p className="max-w-sm text-sm text-[var(--text-muted)]">
            Buat aturan agar transaksi berulang (mis. &quot;GOJEK&quot;)
            dikategorikan sendiri saat impor. Aturan juga bisa dibuat saat kamu
            mengoreksi kategori sebuah transaksi.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setFormState({ open: true, mode: "create", rule: null })}
          >
            <Plus size={16} strokeWidth={1.75} />
            Tambah aturan
          </Button>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--text)]">
              Aturan aktif
            </span>
            <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] tabular-nums text-[var(--text-muted)]">
              {rules.length}
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className="flex items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5"
              >
                <span
                  aria-label={`Prioritas ${rule.priority}`}
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[var(--border)] text-xs font-semibold tabular-nums text-[var(--text)]"
                >
                  {rule.priority}
                </span>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium text-[var(--text)]">
                    {rule.pattern}
                  </span>
                  <MatchTypeBadge matchType={rule.matchType} />
                  <span aria-hidden="true" className="text-[var(--text-muted)]">
                    →
                  </span>
                  <CategoryChip
                    name={rule.categoryName}
                    type={rule.categoryType}
                    archived={rule.categoryArchived}
                  />
                </div>
                <div className="ml-auto">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label={`Aksi aturan ${rule.pattern}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-muted)] outline-none transition-colors hover:hover-wash focus-visible:ring-2 focus-visible:ring-[var(--yellow)]"
                      >
                        <MoreHorizontal size={18} strokeWidth={1.75} aria-hidden="true" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <button
                          type="button"
                          className="w-full"
                          onClick={() =>
                            setFormState({ open: true, mode: "edit", rule })
                          }
                        >
                          <Pencil size={16} strokeWidth={1.75} aria-hidden="true" />
                          Edit
                        </button>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <button
                          type="button"
                          className="w-full"
                          onClick={() => setDeleteTarget(rule)}
                        >
                          <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                          Hapus
                        </button>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <RuleFormDialog
        open={formState.open}
        mode={formState.mode}
        rule={formState.rule}
        categories={categories}
        defaultPriority={defaultPriority}
        onOpenChange={(open) => setFormState((s) => ({ ...s, open }))}
        onDone={onDone}
      />

      <ConfirmDialog
        open={rejectTarget !== null}
        title="Tolak usulan aturan ini?"
        description={
          <>
            Usulan{" "}
            <span className="font-medium text-[var(--text)]">
              {rejectTarget?.pattern} → {rejectTarget?.categoryName}
            </span>{" "}
            akan dihapus. Tindakan ini tidak bisa dibatalkan.
          </>
        }
        confirmLabel="Ya, tolak"
        confirmBusyLabel="Menolak…"
        confirmIcon={X}
        busy={busy}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
        onConfirm={doReject}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus aturan ini?"
        description={
          <>
            Aturan{" "}
            <span className="font-medium text-[var(--text)]">
              {deleteTarget?.pattern} → {deleteTarget?.categoryName}
            </span>{" "}
            akan dihapus permanen.
          </>
        }
        confirmLabel="Ya, hapus"
        confirmBusyLabel="Menghapus…"
        confirmIcon={Trash2}
        busy={busy}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={doDelete}
      />
    </section>
  );
}
