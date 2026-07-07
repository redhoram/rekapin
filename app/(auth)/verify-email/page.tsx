import { redirect } from "next/navigation";
import { MailCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Wordmark } from "@/components/wordmark";
import { getCurrentSession } from "@/lib/session";
import { VerifyEmailActions } from "./verify-email-actions";

// Informational "check your inbox" page shown post-signup. If the user is
// already verified with a membership, route onward; if verified without a
// membership, they belong in onboarding.
export default async function VerifyEmailPage() {
  const data = await getCurrentSession();

  if (data?.user?.emailVerified) {
    redirect("/");
  }

  const email = data?.user?.email ?? null;

  return (
    <Card className="p-8 max-sm:p-6">
      <div className="mb-6 text-center">
        <Wordmark />
      </div>

      <div className="flex flex-col items-center gap-4 text-center">
        <MailCheck
          size={40}
          strokeWidth={1.75}
          className="text-[var(--yellow)]"
          aria-hidden="true"
        />
        <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text)]">
          Cek inbox kamu
        </h1>

        {email && (
          <p className="text-sm text-[var(--text)]">
            Terkirim ke <b>{email}</b>
          </p>
        )}

        <p className="max-w-[34ch] text-sm leading-relaxed text-[var(--text-muted)]">
          Kami sudah mengirim tautan verifikasi ke email kamu. Klik tautan itu
          untuk mengaktifkan akun, lalu lanjut menyiapkan bisnismu.
        </p>

        <VerifyEmailActions email={email} />
      </div>
    </Card>
  );
}
