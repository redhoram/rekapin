import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { invitations, businesses } from "@/lib/db/schema";
import type { Role } from "@/lib/constants";

/**
 * One invitation row joined with its business name. Shared source of truth for
 * the accept page (server component) and the acceptInvitation server action so
 * the token lookup lives in exactly one place.
 */
export interface InvitationRecord {
  id: string;
  businessId: string;
  businessName: string;
  email: string;
  role: Role;
  token: string;
  invitedBy: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
}

/** Resolve an invitation by its single-use token, or null if unknown. */
export async function getInvitationByToken(
  token: string,
): Promise<InvitationRecord | null> {
  if (!token) return null;
  const [row] = await db
    .select({
      id: invitations.id,
      businessId: invitations.businessId,
      businessName: businesses.name,
      email: invitations.email,
      role: invitations.role,
      token: invitations.token,
      invitedBy: invitations.invitedBy,
      expiresAt: invitations.expiresAt,
      acceptedAt: invitations.acceptedAt,
      createdAt: invitations.createdAt,
    })
    .from(invitations)
    .innerJoin(businesses, eq(invitations.businessId, businesses.id))
    .where(eq(invitations.token, token))
    .limit(1);
  return row ?? null;
}
