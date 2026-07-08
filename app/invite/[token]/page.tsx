import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { ThemeToggle } from "@/components/theme-toggle";
import { db } from "@/lib/db";
import { businessMembers } from "@/lib/db/schema";
import { getCurrentSession } from "@/lib/session";
import { getInvitationByToken } from "@/lib/queries/invitations";
import { isInvitationExpired } from "@/lib/invitations";
import type { Role } from "@/lib/constants";
import { AcceptInviteButton } from "./accept-invite-button";

const ROLE_LABEL: Record<Role, string> = { admin: "admin", staff: "staff" };
const ROLE_NOTE: Record<Role, string> = {
  staff:
    "Sebagai staff, kamu bisa input & rapikan data, tapi tanpa akses ke laporan.",
  admin:
    "Sebagai admin, kamu punya akses penuh: laporan, dashboard, dan pengaturan.",
};

// Centered, logged-out-reachable frame (this route sits outside the (app)/(auth)
// groups, so it only inherits the root layout's fonts + theme). Mirrors the auth
// card visual language.
function InviteFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--bg)]">
      <div className="fixed right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <main className="mx-4 w-full max-w-[440px]">
        <Card className="p-8 max-sm:p-6">
          <div className="mb-6 text-center">
            <Wordmark />
          </div>
          {children}
        </Card>
      </main>
    </div>
  );
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await getInvitationByToken(token);

  // --- Invalid / expired / already-used ------------------------------------
  if (
    !invitation ||
    invitation.acceptedAt !== null ||
    isInvitationExpired(invitation.expiresAt)
  ) {
    const reason = !invitation
      ? "Tautan undangan tidak ditemukan atau sudah dibatalkan."
      : invitation.acceptedAt !== null
        ? "Undangan ini sudah pernah dipakai."
        : "Undangan ini sudah kedaluwarsa. Minta admin mengirim ulang.";
    return (
      <InviteFrame>
        <div className="flex flex-col gap-4 text-center">
          <h1 className="font-display text-xl font-bold tracking-tight text-[var(--text)]">
            Undangan tidak berlaku
          </h1>
          <p className="text-sm text-[var(--text-muted)]">{reason}</p>
          <Button variant="secondary" className="w-full" asChild>
            <Link href="/login">Ke halaman masuk</Link>
          </Button>
        </div>
      </InviteFrame>
    );
  }

  const roleLabel = ROLE_LABEL[invitation.role];
  const roleNote = ROLE_NOTE[invitation.role];
  const callbackUrl = encodeURIComponent(`/invite/${token}`);

  const session = await getCurrentSession();

  // --- Logged out -> summary + login/signup (carry the callbackUrl) --------
  if (!session?.user) {
    return (
      <InviteFrame>
        <div className="flex flex-col gap-5">
          <div className="text-center">
            <h1 className="font-display text-xl font-bold tracking-tight text-[var(--text)]">
              Kamu diundang bergabung
            </h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Bergabung di{" "}
              <span className="font-semibold text-[var(--text)]">
                {invitation.businessName}
              </span>{" "}
              sebagai {roleLabel}.
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">{roleNote}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button className="w-full" asChild>
              <Link href={`/login?callbackUrl=${callbackUrl}`}>
                Masuk untuk menerima
              </Link>
            </Button>
            <Button variant="secondary" className="w-full" asChild>
              <Link href={`/signup?callbackUrl=${callbackUrl}`}>
                Daftar akun baru
              </Link>
            </Button>
          </div>
          <p className="text-center text-xs text-[var(--text-muted)]">
            Undangan ini untuk {invitation.email}.
          </p>
        </div>
      </InviteFrame>
    );
  }

  // --- Logged in, wrong email (token-forwarding guard) ---------------------
  if (session.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return (
      <InviteFrame>
        <div className="flex flex-col gap-4 text-center">
          <h1 className="font-display text-xl font-bold tracking-tight text-[var(--text)]">
            Undangan untuk email lain
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Undangan ini ditujukan ke{" "}
            <span className="font-medium text-[var(--text)]">
              {invitation.email}
            </span>
            , tapi kamu masuk sebagai{" "}
            <span className="font-medium text-[var(--text)]">
              {session.user.email}
            </span>
            . Keluar dari akun ini, lalu buka tautan undangan lagi dengan akun
            yang benar.
          </p>
          <Button variant="secondary" className="w-full" asChild>
            <Link href="/">Ke aplikasi</Link>
          </Button>
        </div>
      </InviteFrame>
    );
  }

  // --- Logged in, correct email, already a member --------------------------
  const [existing] = await db
    .select({ id: businessMembers.id })
    .from(businessMembers)
    .where(
      and(
        eq(businessMembers.businessId, invitation.businessId),
        eq(businessMembers.userId, session.user.id),
      ),
    )
    .limit(1);
  if (existing) {
    return (
      <InviteFrame>
        <div className="flex flex-col gap-4 text-center">
          <h1 className="font-display text-xl font-bold tracking-tight text-[var(--text)]">
            Kamu sudah jadi anggota
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Kamu sudah tergabung di{" "}
            <span className="font-semibold text-[var(--text)]">
              {invitation.businessName}
            </span>
            .
          </p>
          <Button variant="secondary" className="w-full" asChild>
            <Link href={invitation.role === "admin" ? "/dashboard" : "/transactions"}>
              Ke aplikasi
            </Link>
          </Button>
        </div>
      </InviteFrame>
    );
  }

  // --- Logged in, correct email, ready to accept ---------------------------
  return (
    <InviteFrame>
      <div className="flex flex-col gap-5">
        <div className="text-center">
          <h1 className="font-display text-xl font-bold tracking-tight text-[var(--text)]">
            Terima undangan
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Bergabung di{" "}
            <span className="font-semibold text-[var(--text)]">
              {invitation.businessName}
            </span>{" "}
            sebagai {roleLabel}.
          </p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">{roleNote}</p>
        </div>
        <AcceptInviteButton token={token} />
      </div>
    </InviteFrame>
  );
}
