import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getCurrentSession, getActiveMembership } from "@/lib/session";
import { db } from "@/lib/db";
import { bankAccounts } from "@/lib/db/schema";
import { countNeedsReview } from "@/lib/queries/transactions";
import { AppShell } from "@/components/app-shell";

// App shell layout: resolves session + membership server-side, then renders the
// role-aware chrome. Each page ALSO calls requireRole — this layout gates entry,
// pages gate their own role (defense in depth, FR-9.2).
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const data = await getCurrentSession();
  if (!data?.user) {
    redirect("/login");
  }
  if (!data.user.emailVerified) {
    redirect("/verify-email");
  }

  const membership = await getActiveMembership();
  if (!membership) {
    redirect("/onboarding");
  }

  // Mirror requireRole's 0-bank-account check (spec §onboarding) so the shell
  // chrome doesn't flash-render before a page's own requireRole redirect
  // resolves. Cosmetic — requireRole alone is already sufficient for correctness.
  const [account] = await db
    .select({ id: bankAccounts.id })
    .from(bankAccounts)
    .where(eq(bankAccounts.businessId, membership.businessId))
    .limit(1);
  if (!account) {
    redirect("/onboarding/bank-account");
  }

  const needsReviewCount = await countNeedsReview(membership.businessId);

  return (
    <AppShell
      role={membership.role}
      name={data.user.name}
      email={data.user.email}
      needsReviewCount={needsReviewCount}
    >
      {children}
    </AppShell>
  );
}
