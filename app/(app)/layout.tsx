import { getCurrentSession, getActiveMembership } from "@/lib/session";
import { redirect } from "next/navigation";
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

  return (
    <AppShell
      role={membership.role}
      name={data.user.name}
      email={data.user.email}
    >
      {children}
    </AppShell>
  );
}
