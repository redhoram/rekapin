import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/wordmark";
import { getCurrentSession } from "@/lib/session";
import { signOutAction } from "@/actions/auth";

// Focused wizard frame (not the app shell, not the bare auth card).
// Guard: must be logged in AND email-verified. State-based redirects to the
// correct step are handled by each page (derived from DB), not here.
export default async function OnboardingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const data = await getCurrentSession();

  if (!data?.user) {
    redirect("/login");
  }
  if (!data.user.emailVerified) {
    redirect("/verify-email");
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-12 max-sm:py-8">
      <div className="mx-auto max-w-[480px]">
        <div className="mb-8 flex items-center justify-between">
          <Wordmark href="/" />
          <div className="flex items-center gap-2">
            <form action={signOutAction}>
              <button
                type="submit"
                className="text-xs text-[var(--text-muted)] underline underline-offset-2 transition-colors hover:text-[var(--text)]"
              >
                Keluar
              </button>
            </form>
            <ThemeToggle />
          </div>
        </div>
        <main>{children}</main>
      </div>
    </div>
  );
}
