import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "./auth";
import { db } from "./db";
import { bankAccounts, businessMembers } from "./db/schema";
import type { Role } from "./constants";

/**
 * Central session/role helpers. This is the ONE enforcement point every
 * (app)/* layout/page and every server action must go through (FR-9.2, NFR-1).
 * Hiding UI is not protection — the DB-backed role check lives here.
 */

export type SessionData = Awaited<ReturnType<typeof auth.api.getSession>>;

/** Wraps auth.api.getSession with the current request headers. */
export async function getCurrentSession(): Promise<SessionData> {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Resolve the "active business" for the current user.
 *
 * MVP onboarding only ever creates one business per signup, so the active
 * business is simply the user's (single) membership. When multi-business +
 * the invite flow land, this is where a cookie-based switcher plugs in — the
 * business-switcher component was deferred (spec DECISIONS #4).
 *
 * SECURITY: never trusts a client-supplied business_id. It only returns a
 * businessId derived from a verified business_members row for this user.
 */
export async function getActiveBusinessId(): Promise<string | null> {
  const membership = await getActiveMembership();
  return membership?.businessId ?? null;
}

/**
 * Combine session -> active business -> business_members row.
 * Returns null if there is no session or no membership.
 */
export async function getActiveMembership(): Promise<{
  userId: string;
  businessId: string;
  role: Role;
} | null> {
  const data = await getCurrentSession();
  if (!data?.user) return null;

  const memberships = await db
    .select({
      businessId: businessMembers.businessId,
      role: businessMembers.role,
    })
    .from(businessMembers)
    .where(eq(businessMembers.userId, data.user.id))
    .limit(1);

  const membership = memberships[0];
  if (!membership) return null;

  return {
    userId: data.user.id,
    businessId: membership.businessId,
    role: membership.role,
  };
}

/**
 * Enforce that the current request has a session, a membership, a role in
 * `allowed`, and at least one bank account. Redirects (never renders an error
 * page) on failure:
 *  - no session               -> /login
 *  - unverified email         -> /verify-email
 *  - session, no member       -> /onboarding
 *  - member, 0 bank accounts  -> /onboarding/bank-account
 *  - role not allowed          -> /transactions (staff hitting an admin area)
 *
 * Every server action and every protected page/layout calls this — it is the ONE
 * enforcement point, so the 0-bank-account check here protects server actions
 * too (they never pass through app/(app)/layout.tsx).
 */
export async function requireRole(allowed: Role[]): Promise<{
  userId: string;
  businessId: string;
  role: Role;
}> {
  const data = await getCurrentSession();
  if (!data?.user) {
    redirect("/login");
  }
  // Unverified email must not reach the app (FR-1.1).
  if (!data.user.emailVerified) {
    redirect("/verify-email");
  }

  const membership = await getActiveMembership();
  if (!membership) {
    redirect("/onboarding");
  }

  // Root-cause fix for the "0 bank account" onboarding escape (spec §onboarding).
  // A user who abandons onboarding after step 1 has a valid membership but no
  // account — the whole app is broken without one. Applied UNIFORMLY to both
  // roles (spec DECISION #3). NOTE: a staff member in a hypothetical 0-account
  // business would dead-end at /onboarding/bank-account (an admin-only page).
  // That is unreachable today (no invite flow yet); revisit with a "menunggu
  // admin menambahkan rekening" state when invitations ship.
  const [account] = await db
    .select({ id: bankAccounts.id })
    .from(bankAccounts)
    .where(eq(bankAccounts.businessId, membership.businessId))
    .limit(1);
  if (!account) {
    redirect("/onboarding/bank-account");
  }

  if (!allowed.includes(membership.role)) {
    // Staff hitting an admin-only route: silent redirect, not an error page.
    redirect("/transactions");
  }

  return membership;
}
