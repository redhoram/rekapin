"use server";

import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { businesses, businessMembers, invitations, user } from "@/lib/db/schema";
import { requireRole, getCurrentSession } from "@/lib/session";
import { sendEmail, emailLayout } from "@/lib/email";
import {
  invitationExpiry,
  isInvitationExpired,
  isInvitationPending,
  generateInvitationToken,
} from "@/lib/invitations";
import { getInvitationByToken } from "@/lib/queries/invitations";
import type { Role } from "@/lib/constants";

export type ActionResult = { ok: true } | { ok: false; error: string };

// ---------------------------------------------------------------------------
// DTOs (all dates serialized to ISO strings for the client boundary)
// ---------------------------------------------------------------------------

export interface MemberDTO {
  /** business_members row id (the handle for role/remove actions). */
  id: string;
  userId: string;
  name: string;
  email: string;
  role: Role;
  joinedAt: string;
}

export interface InvitationDTO {
  id: string;
  email: string;
  role: Role;
  status: "pending" | "expired";
  createdAt: string;
  expiresAt: string;
}

export interface MembersData {
  currentUserId: string;
  members: MemberDTO[];
  invitations: InvitationDTO[];
  /** Active-admin count — lets the UI pre-disable last-admin actions. */
  adminCount: number;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Masukkan email yang valid.")
  .email("Masukkan email yang valid.");

const roleSchema = z.enum(["admin", "staff"], {
  errorMap: () => ({ message: "Pilih peran yang valid." }),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Base URL for the accept link — prefers the public app URL, then auth URL. */
function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000"
  );
}

/** Minimal HTML escape for values interpolated into the invite email body. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}


/** Look up a business name (for email subject/body). */
async function businessName(businessId: string): Promise<string> {
  const [row] = await db
    .select({ name: businesses.name })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);
  return row?.name ?? "bisnis";
}

/** Send the invite email (best-effort — logs to console in dev, per lib/email). */
async function sendInviteEmail(opts: {
  to: string;
  businessName: string;
  role: Role;
  token: string;
}): Promise<void> {
  const link = `${appBaseUrl()}/invite/${opts.token}`;
  const roleLabel = opts.role === "admin" ? "admin" : "staff";
  const roleNote =
    opts.role === "admin"
      ? "Sebagai admin, kamu punya akses penuh: laporan, dashboard, dan pengaturan."
      : "Sebagai staff, kamu bisa input & rapikan data, tanpa akses ke laporan.";

  await sendEmail({
    to: opts.to,
    subject: `Undangan bergabung di ${opts.businessName} — Rekapin`,
    text: `Kamu diundang bergabung di ${opts.businessName} sebagai ${roleLabel} di Rekapin.\n\n${roleNote}\n\nTerima undangan: ${link}\n\nTautan ini berlaku 7 hari.`,
    html: emailLayout({
      title: `Undangan bergabung di ${escapeHtml(opts.businessName)}`,
      bodyHtml: `Kamu diundang bergabung di <strong>${escapeHtml(
        opts.businessName,
      )}</strong> sebagai <strong>${roleLabel}</strong> di Rekapin.<br><br>${roleNote}<br><br>Klik tombol di bawah untuk menerima undangan.`,
      ctaLabel: "Terima Undangan",
      ctaUrl: link,
      footerNote:
        "Tautan ini berlaku 7 hari. Abaikan email ini kalau kamu tidak mengenal pengirimnya.",
    }),
  });
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/** Members + pending/expired invitations for the active business. admin only. */
export async function listMembersAndInvitations(): Promise<MembersData> {
  const { businessId, userId } = await requireRole(["admin"]);
  const now = new Date();

  const memberRows = await db
    .select({
      id: businessMembers.id,
      userId: businessMembers.userId,
      name: user.name,
      email: user.email,
      role: businessMembers.role,
      joinedAt: businessMembers.joinedAt,
    })
    .from(businessMembers)
    .innerJoin(user, eq(businessMembers.userId, user.id))
    .where(eq(businessMembers.businessId, businessId))
    .orderBy(asc(businessMembers.joinedAt));

  // Only unaccepted invitations surface in the list (accepted ones are members).
  const inviteRows = await db
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      acceptedAt: invitations.acceptedAt,
      expiresAt: invitations.expiresAt,
      createdAt: invitations.createdAt,
    })
    .from(invitations)
    .where(
      and(eq(invitations.businessId, businessId), isNull(invitations.acceptedAt)),
    )
    .orderBy(desc(invitations.createdAt));

  return {
    currentUserId: userId,
    adminCount: memberRows.filter((m) => m.role === "admin").length,
    members: memberRows.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.name,
      email: m.email,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
    })),
    invitations: inviteRows.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      status: isInvitationExpired(i.expiresAt, now)
        ? ("expired" as const)
        : ("pending" as const),
      createdAt: i.createdAt.toISOString(),
      expiresAt: i.expiresAt.toISOString(),
    })),
  };
}

// ---------------------------------------------------------------------------
// Invite
// ---------------------------------------------------------------------------

/** Create + email a single-use invitation. admin only. */
export async function inviteMember(input: {
  email: string;
  role: string;
}): Promise<ActionResult> {
  const { businessId, userId } = await requireRole(["admin"]);

  const email = emailSchema.safeParse(input.email);
  if (!email.success) return { ok: false, error: email.error.errors[0].message };
  const role = roleSchema.safeParse(input.role);
  if (!role.success) return { ok: false, error: role.error.errors[0].message };

  // Guard 1 — already an active member of this business (case-insensitive).
  const existingMember = await db
    .select({ id: businessMembers.id })
    .from(businessMembers)
    .innerJoin(user, eq(businessMembers.userId, user.id))
    .where(
      and(
        eq(businessMembers.businessId, businessId),
        sql`lower(${user.email}) = ${email.data}`,
      ),
    )
    .limit(1);
  if (existingMember.length > 0) {
    return { ok: false, error: "Orang ini sudah jadi anggota bisnismu." };
  }

  // Guard 2 — a still-active (unexpired, unaccepted) invitation already exists.
  const now = new Date();
  const pending = await db
    .select({
      acceptedAt: invitations.acceptedAt,
      expiresAt: invitations.expiresAt,
    })
    .from(invitations)
    .where(
      and(
        eq(invitations.businessId, businessId),
        sql`lower(${invitations.email}) = ${email.data}`,
        isNull(invitations.acceptedAt),
      ),
    );
  if (pending.some((p) => isInvitationPending(p, now))) {
    return { ok: false, error: "Undangan untuk email ini masih aktif." };
  }

  // Guard 2 already rejected any active invite — clear stale (expired) rows so
  // the list never accumulates duplicates for the same email.
  await db
    .delete(invitations)
    .where(
      and(
        eq(invitations.businessId, businessId),
        sql`lower(${invitations.email}) = ${email.data}`,
        isNull(invitations.acceptedAt),
      ),
    );

  const token = generateInvitationToken();
  await db.insert(invitations).values({
    businessId,
    email: email.data,
    role: role.data,
    token,
    invitedBy: userId,
    expiresAt: invitationExpiry(now),
  });

  await sendInviteEmail({
    to: email.data,
    businessName: await businessName(businessId),
    role: role.data,
    token,
  });

  return { ok: true };
}

/** Cancel a pending invitation (hard delete). admin only. */
export async function revokeInvitation(id: string): Promise<ActionResult> {
  const { businessId } = await requireRole(["admin"]);
  const deleted = await db
    .delete(invitations)
    .where(and(eq(invitations.id, id), eq(invitations.businessId, businessId)))
    .returning({ id: invitations.id });
  if (deleted.length === 0) {
    return { ok: false, error: "Undangan tidak ditemukan." };
  }
  return { ok: true };
}

/**
 * Re-issue an invitation: new token + reset expiry, then re-send the email
 * (revoke + create collapsed into one action). admin only. The previous link
 * is invalidated because the row's token is replaced.
 */
export async function resendInvitation(id: string): Promise<ActionResult> {
  const { businessId } = await requireRole(["admin"]);

  const [inv] = await db
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      acceptedAt: invitations.acceptedAt,
    })
    .from(invitations)
    .where(and(eq(invitations.id, id), eq(invitations.businessId, businessId)))
    .limit(1);
  if (!inv) return { ok: false, error: "Undangan tidak ditemukan." };
  if (inv.acceptedAt) {
    return { ok: false, error: "Undangan ini sudah diterima." };
  }

  const now = new Date();
  const token = generateInvitationToken();
  await db
    .update(invitations)
    .set({ token, expiresAt: invitationExpiry(now), createdAt: now })
    .where(and(eq(invitations.id, id), eq(invitations.businessId, businessId)));

  await sendInviteEmail({
    to: inv.email,
    businessName: await businessName(businessId),
    role: inv.role,
    token,
  });

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Member management
// ---------------------------------------------------------------------------

/** Change a member's role (admin ↔ staff). admin only. Last-admin guard (FR-9.4). */
export async function updateMemberRole(
  memberId: string,
  role: string,
): Promise<ActionResult> {
  const { businessId } = await requireRole(["admin"]);

  const parsed = roleSchema.safeParse(role);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }

  const [target] = await db
    .select({ id: businessMembers.id, role: businessMembers.role })
    .from(businessMembers)
    .where(
      and(
        eq(businessMembers.id, memberId),
        eq(businessMembers.businessId, businessId),
      ),
    )
    .limit(1);
  if (!target) return { ok: false, error: "Anggota tidak ditemukan." };
  if (target.role === parsed.data) return { ok: true }; // no-op

  // Last-admin guard (FR-9.4) lives INSIDE the statement's WHERE so the count
  // and the write share one snapshot — a request-level check-then-act window
  // would let two parallel demotes strand the business with zero admins.
  const demoted = await db.execute(sql`
    UPDATE ${businessMembers}
    SET role = ${parsed.data}
    WHERE ${businessMembers.id} = ${memberId}
      AND ${businessMembers.businessId} = ${businessId}
      AND (
        ${businessMembers.role} <> 'admin'
        OR ${parsed.data} = 'admin'
        OR (
          SELECT count(*) FROM ${businessMembers} bm
          WHERE bm.business_id = ${businessId} AND bm.role = 'admin'
        ) > 1
      )
    RETURNING id
  `);
  if (demoted.rows.length === 0) {
    return {
      ok: false,
      error: "Harus ada minimal satu admin. Angkat admin lain dulu.",
    };
  }
  return { ok: true };
}

/** Remove a member from the business. admin only. Last-admin guard (FR-9.4). */
export async function removeMember(memberId: string): Promise<ActionResult> {
  const { businessId } = await requireRole(["admin"]);

  const [target] = await db
    .select({ id: businessMembers.id, role: businessMembers.role })
    .from(businessMembers)
    .where(
      and(
        eq(businessMembers.id, memberId),
        eq(businessMembers.businessId, businessId),
      ),
    )
    .limit(1);
  if (!target) return { ok: false, error: "Anggota tidak ditemukan." };

  // Last-admin guard in-statement (same rationale as updateMemberRole). Also
  // covers "admin removing themselves while sole admin".
  const removed = await db.execute(sql`
    DELETE FROM ${businessMembers}
    WHERE ${businessMembers.id} = ${memberId}
      AND ${businessMembers.businessId} = ${businessId}
      AND (
        ${businessMembers.role} <> 'admin'
        OR (
          SELECT count(*) FROM ${businessMembers} bm
          WHERE bm.business_id = ${businessId} AND bm.role = 'admin'
        ) > 1
      )
    RETURNING id
  `);
  if (removed.rows.length === 0) {
    return { ok: false, error: "Tidak bisa menghapus admin terakhir." };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Accept
// ---------------------------------------------------------------------------

/**
 * Accept an invitation as the logged-in user. Requires a verified session (NOT
 * an admin role). Validates the token, enforces email match, adds a membership
 * (never replaces existing ones — multi-business is allowed), then redirects to
 * the role's landing page.
 */
export async function acceptInvitation(token: string): Promise<ActionResult> {
  const session = await getCurrentSession();
  if (!session?.user) {
    return { ok: false, error: "Kamu harus masuk dulu untuk menerima undangan." };
  }
  if (!session.user.emailVerified) {
    return { ok: false, error: "Verifikasi email kamu dulu, lalu buka tautan lagi." };
  }

  const inv = await getInvitationByToken(token);
  if (!inv) return { ok: false, error: "Undangan tidak ditemukan." };
  if (inv.acceptedAt) {
    return { ok: false, error: "Undangan ini sudah pernah dipakai." };
  }
  if (isInvitationExpired(inv.expiresAt)) {
    return { ok: false, error: "Undangan ini sudah kedaluwarsa." };
  }

  // Token-forwarding guard: the accepting account's email must match the invite.
  if (inv.email.toLowerCase() !== session.user.email.toLowerCase()) {
    return { ok: false, error: "Undangan ini untuk alamat email lain." };
  }

  const landing = inv.role === "admin" ? "/dashboard" : "/transactions";

  // Already a member of THIS business — just close the invitation and route in.
  const existing = await db
    .select({ id: businessMembers.id })
    .from(businessMembers)
    .where(
      and(
        eq(businessMembers.businessId, inv.businessId),
        eq(businessMembers.userId, session.user.id),
      ),
    )
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(invitations)
      .set({ acceptedAt: new Date() })
      .where(eq(invitations.id, inv.id));
    redirect(landing);
  }

  // Single-statement claim: mark the invitation accepted AND insert the
  // membership atomically (CTE). Closes the accept-vs-revoke race — a revoked
  // (deleted) or concurrently-claimed invitation matches 0 rows in the UPDATE,
  // so no membership is ever inserted from a dead invite. ON CONFLICT covers
  // the parallel-accept race on the membership unique constraint.
  const claimed = await db.execute(sql`
    WITH claimed AS (
      UPDATE ${invitations}
      SET accepted_at = now()
      WHERE ${invitations.id} = ${inv.id}
        AND accepted_at IS NULL
        AND expires_at > now()
      RETURNING business_id, role, invited_by
    )
    INSERT INTO ${businessMembers} (id, business_id, user_id, role, invited_by)
    SELECT gen_random_uuid()::text, business_id, ${session.user.id}, role, invited_by
    FROM claimed
    ON CONFLICT ON CONSTRAINT business_members_business_user_unique DO NOTHING
    RETURNING id
  `);

  if (claimed.rows.length === 0) {
    // Either the invitation vanished mid-flight (revoked/claimed) or the
    // membership already existed (conflict). Re-check which one it was.
    const [member] = await db
      .select({ id: businessMembers.id })
      .from(businessMembers)
      .where(
        and(
          eq(businessMembers.businessId, inv.businessId),
          eq(businessMembers.userId, session.user.id),
        ),
      )
      .limit(1);
    if (!member) {
      return { ok: false, error: "Undangan ini sudah tidak berlaku." };
    }
  }

  redirect(landing);
}
