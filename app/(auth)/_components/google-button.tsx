"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/google-icon";
import { signIn } from "@/lib/auth-client";

// Secondary full-width Google OAuth button. New Google users route into
// onboarding via "/" (callbackURL) after Better Auth completes the flow.
export function GoogleButton({
  label,
  onError,
}: {
  label: string;
  onError?: (message: string) => void;
}) {
  const [loading, setLoading] = React.useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await signIn.social({ provider: "google", callbackURL: "/" });
    } catch {
      onError?.("Gagal masuk dengan Google. Coba lagi.");
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="secondary"
      className="w-full"
      onClick={handleClick}
      disabled={loading}
    >
      <GoogleIcon />
      {label}
    </Button>
  );
}
