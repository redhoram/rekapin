"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { AlertStrip } from "@/components/ui/alert-strip";
import { authClient } from "@/lib/auth-client";
import { signOutToSignupAction } from "@/actions/auth";

const COOLDOWN_SECONDS = 60;

// Resend (with 60s cooldown) + "wrong email" sign-out escape hatch (design §2.D).
export function VerifyEmailActions({ email }: { email: string | null }) {
  const [cooldown, setCooldown] = React.useState(0);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email || cooldown > 0) return;
    setError(null);
    const { error: resendError } = await authClient.sendVerificationEmail({
      email,
      callbackURL: "/",
    });
    if (resendError) {
      setError("Gagal mengirim ulang. Coba lagi sebentar.");
      return;
    }
    setSent(true);
    setCooldown(COOLDOWN_SECONDS);
  };

  return (
    <div className="mt-2 flex w-full flex-col items-center gap-3">
      {error && <AlertStrip className="w-full">{error}</AlertStrip>}

      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={handleResend}
        disabled={!email || cooldown > 0}
      >
        {cooldown > 0
          ? `Kirim ulang dalam ${cooldown}s`
          : "Kirim ulang tautan"}
      </Button>

      {sent && cooldown > 0 && (
        <p className="text-xs text-[var(--text-muted)]">
          Tautan baru sudah dikirim.
        </p>
      )}

      <form action={signOutToSignupAction}>
        <button
          type="submit"
          className="text-sm text-[var(--text-muted)] underline underline-offset-2 transition-colors hover:text-[var(--text)]"
        >
          Salah email? Keluar &amp; daftar ulang
        </button>
      </form>
    </div>
  );
}
