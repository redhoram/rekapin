import { redirect } from "next/navigation";
import { getCurrentSession, getActiveMembership } from "@/lib/session";

// Root "/" — route the visitor based on session, onboarding state, and role.
export default async function RootPage() {
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

  redirect(membership.role === "admin" ? "/dashboard" : "/transactions");
}
