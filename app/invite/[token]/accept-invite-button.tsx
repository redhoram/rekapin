"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertStrip } from "@/components/ui/alert-strip";
import { acceptInvitation } from "@/actions/members";

/**
 * Accepts the invitation for the logged-in, email-matched user. On success the
 * server action redirects (staff → /transactions, admin → /dashboard), so the
 * only rendered outcome here is an error message.
 */
export function AcceptInviteButton({ token }: { token: string }) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onClick = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await acceptInvitation(token);
      // Reached only when the action returns an error (success redirects away).
      if (res && !res.ok) {
        setError(res.error);
        setBusy(false);
      }
    } catch {
      setError("Gagal menerima undangan. Coba lagi.");
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {error && <AlertStrip>{error}</AlertStrip>}
      <Button className="w-full" onClick={onClick} disabled={busy}>
        {busy ? (
          <>
            <Loader2 size={16} strokeWidth={1.75} className="animate-spin" />
            Memproses…
          </>
        ) : (
          "Terima undangan"
        )}
      </Button>
    </div>
  );
}
