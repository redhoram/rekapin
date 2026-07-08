// Pure invitation helpers (expiry math + token generation). Kept DB-free so the
// expiry rules are unit-testable without a database — the server actions in
// actions/members.ts and the reader in lib/queries/invitations.ts consume these.

/** Single-use invitation validity window (FR-1.4). */
export const INVITATION_TTL_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Expiry instant for a freshly-issued invitation: now + 7 days. */
export function invitationExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + INVITATION_TTL_DAYS * DAY_MS);
}

/** True once the invitation window has closed (expiresAt at/before now). */
export function isInvitationExpired(
  expiresAt: Date,
  now: Date = new Date(),
): boolean {
  return expiresAt.getTime() <= now.getTime();
}

/** A pending invitation is one not yet accepted and not yet expired. */
export function isInvitationPending(
  invitation: { acceptedAt: Date | null; expiresAt: Date },
  now: Date = new Date(),
): boolean {
  return (
    invitation.acceptedAt === null &&
    !isInvitationExpired(invitation.expiresAt, now)
  );
}

export type InvitationStatus = "pending" | "expired" | "accepted";

/** Derive the display/logic status of an invitation at `now`. */
export function invitationStatus(
  invitation: { acceptedAt: Date | null; expiresAt: Date },
  now: Date = new Date(),
): InvitationStatus {
  if (invitation.acceptedAt !== null) return "accepted";
  if (isInvitationExpired(invitation.expiresAt, now)) return "expired";
  return "pending";
}

/** Cryptographically-random single-use token for the accept link. */
export function generateInvitationToken(): string {
  return crypto.randomUUID();
}
