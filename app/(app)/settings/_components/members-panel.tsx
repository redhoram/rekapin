"use client";

import * as React from "react";
import {
  Clock,
  MoreHorizontal,
  Send,
  Shield,
  ShieldCheck,
  Trash2,
  User,
  UserCog,
  UserPlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { formatDateShort } from "@/lib/utils";
import {
  removeMember,
  resendInvitation,
  revokeInvitation,
  updateMemberRole,
  type MemberDTO,
  type InvitationDTO,
  type MembersData,
} from "@/actions/members";
import type { Role } from "@/lib/constants";
import { ConfirmDialog } from "./confirm-dialog";
import { InviteMemberDialog } from "./invite-member-dialog";

/** Role chip: admin = yellow-accent outline (the one accent), staff = neutral. */
function RoleChip({ role }: { role: Role }) {
  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--yellow)] px-2 py-0.5 text-xs font-medium text-[var(--text)]">
        <ShieldCheck
          size={13}
          strokeWidth={1.75}
          className="text-[var(--yellow)]"
          aria-hidden="true"
        />
        Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2 py-0.5 text-xs font-medium text-[var(--text-muted)]">
      <User size={13} strokeWidth={1.75} aria-hidden="true" />
      Staff
    </span>
  );
}

/** Invitation status pill — kedaluwarsa carries the yellow attention cue. */
function InviteStatusChip({ status }: { status: "pending" | "expired" }) {
  if (status === "expired") {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[var(--border)] px-2 py-0.5 text-xs font-medium text-[var(--text)]">
        <Clock
          size={13}
          strokeWidth={1.75}
          className="text-[var(--yellow)]"
          aria-hidden="true"
        />
        Kedaluwarsa
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
      <Clock size={13} strokeWidth={1.75} aria-hidden="true" />
      Menunggu
    </span>
  );
}

export function MembersPanel({
  data,
  onDone,
  onError,
}: {
  data: MembersData;
  onDone: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [actingId, setActingId] = React.useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = React.useState<MemberDTO | null>(null);
  const [cancelTarget, setCancelTarget] = React.useState<InvitationDTO | null>(
    null,
  );
  const [busy, setBusy] = React.useState(false);

  const soleAdmin = data.adminCount <= 1;

  const changeRole = async (member: MemberDTO, role: Role) => {
    setActingId(member.id);
    try {
      const res = await updateMemberRole(member.id, role);
      if (res.ok) {
        onDone(
          role === "admin"
            ? `${member.name} sekarang admin.`
            : `${member.name} sekarang staff.`,
        );
      } else {
        onError(res.error);
      }
    } catch {
      onError("Gagal mengubah peran. Coba lagi.");
    } finally {
      setActingId(null);
    }
  };

  const resend = async (inv: InvitationDTO) => {
    setActingId(inv.id);
    try {
      const res = await resendInvitation(inv.id);
      if (res.ok) onDone("Undangan dikirim ulang.");
      else onError(res.error);
    } catch {
      onError("Gagal mengirim ulang undangan. Coba lagi.");
    } finally {
      setActingId(null);
    }
  };

  const doRemove = async () => {
    if (!removeTarget) return;
    setBusy(true);
    try {
      const res = await removeMember(removeTarget.id);
      if (res.ok) {
        setRemoveTarget(null);
        onDone("Anggota dihapus.");
      } else {
        setRemoveTarget(null);
        onError(res.error);
      }
    } catch {
      setRemoveTarget(null);
      onError("Gagal menghapus anggota. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const doCancel = async () => {
    if (!cancelTarget) return;
    setBusy(true);
    try {
      const res = await revokeInvitation(cancelTarget.id);
      if (res.ok) {
        setCancelTarget(null);
        onDone("Undangan dibatalkan.");
      } else {
        setCancelTarget(null);
        onError(res.error);
      }
    } catch {
      setCancelTarget(null);
      onError("Gagal membatalkan undangan. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight text-[var(--text)]">
            Anggota
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Undang tim untuk bantu input data. Staff tidak bisa lihat laporan.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setInviteOpen(true)}
        >
          <UserPlus size={16} strokeWidth={1.75} />
          Undang anggota
        </Button>
      </div>

      {/* Members */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--text)]">
            Anggota aktif
          </span>
          <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] tabular-nums text-[var(--text-muted)]">
            {data.members.length}
          </span>
        </div>
        <ul className="flex flex-col gap-2">
          {data.members.map((member) => {
            const isSelf = member.userId === data.currentUserId;
            const lockAdmin = member.role === "admin" && soleAdmin;
            return (
              <li
                key={member.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--text)]">
                    <span className="truncate">{member.name}</span>
                    {isSelf && (
                      <span className="text-xs font-normal text-[var(--text-muted)]">
                        (kamu)
                      </span>
                    )}
                  </span>
                  <span className="truncate text-xs text-[var(--text-muted)]">
                    {member.email}
                  </span>
                </div>
                <RoleChip role={member.role} />
                <span className="text-xs text-[var(--text-muted)]">
                  Gabung {formatDateShort(member.joinedAt)}
                </span>
                <div className="ml-auto">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label={`Aksi anggota ${member.name}`}
                        disabled={actingId === member.id}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-muted)] outline-none transition-colors hover:hover-wash focus-visible:ring-2 focus-visible:ring-[var(--yellow)] disabled:opacity-60"
                      >
                        <MoreHorizontal
                          size={18}
                          strokeWidth={1.75}
                          aria-hidden="true"
                        />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {member.role === "staff" ? (
                        <DropdownMenuItem asChild>
                          <button
                            type="button"
                            className="w-full"
                            onClick={() => changeRole(member, "admin")}
                          >
                            <Shield
                              size={16}
                              strokeWidth={1.75}
                              aria-hidden="true"
                            />
                            Jadikan admin
                          </button>
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          disabled={lockAdmin}
                          onSelect={(e) => {
                            if (lockAdmin) {
                              e.preventDefault();
                              return;
                            }
                            changeRole(member, "staff");
                          }}
                        >
                          <UserCog
                            size={16}
                            strokeWidth={1.75}
                            aria-hidden="true"
                          />
                          Jadikan staff
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled={lockAdmin}
                        onSelect={(e) => {
                          if (lockAdmin) {
                            e.preventDefault();
                            return;
                          }
                          setRemoveTarget(member);
                        }}
                      >
                        <Trash2
                          size={16}
                          strokeWidth={1.75}
                          aria-hidden="true"
                        />
                        {isSelf ? "Keluar dari bisnis" : "Hapus anggota"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {lockAdmin && (
                  <p className="basis-full text-xs text-[var(--text-muted)]">
                    Admin terakhir tidak bisa diturunkan atau dihapus. Angkat
                    admin lain dulu.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Pending invitations */}
      {data.invitations.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Send
              size={16}
              strokeWidth={1.75}
              className="text-[var(--text-muted)]"
              aria-hidden="true"
            />
            <span className="text-sm font-medium text-[var(--text)]">
              Undangan terkirim
            </span>
            <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] tabular-nums text-[var(--text-muted)]">
              {data.invitations.length}
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {data.invitations.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5"
              >
                <span className="min-w-0 truncate text-sm font-medium text-[var(--text)]">
                  {inv.email}
                </span>
                <RoleChip role={inv.role} />
                <InviteStatusChip status={inv.status} />
                <span className="text-xs text-[var(--text-muted)]">
                  Dikirim {formatDateShort(inv.createdAt)}
                </span>
                <div className="ml-auto flex items-center gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={actingId === inv.id}
                    onClick={() => resend(inv)}
                  >
                    <Send size={16} strokeWidth={1.75} />
                    Kirim ulang
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCancelTarget(inv)}
                  >
                    <X size={16} strokeWidth={1.75} />
                    Batalkan
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onDone={onDone}
      />

      <ConfirmDialog
        open={removeTarget !== null}
        title={
          removeTarget?.userId === data.currentUserId
            ? "Keluar dari bisnis ini?"
            : "Hapus anggota ini?"
        }
        description={
          removeTarget?.userId === data.currentUserId ? (
            <>
              Kamu akan keluar dari bisnis ini dan kehilangan akses. Tindakan ini
              tidak bisa dibatalkan.
            </>
          ) : (
            <>
              <span className="font-medium text-[var(--text)]">
                {removeTarget?.name}
              </span>{" "}
              akan kehilangan akses ke bisnis ini. Data yang sudah mereka input
              tetap ada.
            </>
          )
        }
        confirmLabel="Ya, hapus"
        confirmBusyLabel="Menghapus…"
        confirmIcon={Trash2}
        busy={busy}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
        onConfirm={doRemove}
      />

      <ConfirmDialog
        open={cancelTarget !== null}
        title="Batalkan undangan ini?"
        description={
          <>
            Undangan untuk{" "}
            <span className="font-medium text-[var(--text)]">
              {cancelTarget?.email}
            </span>{" "}
            akan dibatalkan dan tautannya tidak lagi berlaku.
          </>
        }
        confirmLabel="Ya, batalkan"
        confirmBusyLabel="Membatalkan…"
        confirmIcon={X}
        busy={busy}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
        onConfirm={doCancel}
      />
    </section>
  );
}
