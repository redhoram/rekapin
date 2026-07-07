"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { AlertStrip } from "@/components/ui/alert-strip";
import { FieldError } from "@/components/ui/field-error";
import { signIn, authClient } from "@/lib/auth-client";
import { AuthShell, OrDivider } from "../_components/auth-shell";
import { GoogleButton } from "../_components/google-button";

const schema = z.object({
  email: z.string().min(1, "Masukkan email yang valid.").email("Masukkan email yang valid."),
  password: z.string().min(1, "Password minimal 8 karakter."),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = React.useState<string | null>(
    null,
  );
  const [resent, setResent] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
  });

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    setUnverifiedEmail(null);
    const { error } = await signIn.email({
      email: values.email,
      password: values.password,
      callbackURL: "/",
    });

    if (error) {
      // Better Auth returns a 403 when the email is unverified.
      if (error.status === 403) {
        setUnverifiedEmail(values.email);
      } else {
        setFormError("Email atau password salah.");
      }
      return;
    }
    router.push("/");
  };

  const handleResend = async () => {
    if (!unverifiedEmail) return;
    await authClient.sendVerificationEmail({
      email: unverifiedEmail,
      callbackURL: "/",
    });
    setResent(true);
  };

  return (
    <AuthShell subtitle="Masuk untuk melanjutkan" wordmarkHref="/">
      <div className="flex flex-col gap-6">
        {formError && <AlertStrip>{formError}</AlertStrip>}
        {unverifiedEmail && (
          <AlertStrip>
            Email kamu belum diverifikasi. Cek inbox untuk tautan verifikasi.{" "}
            {resent ? (
              <span className="text-[var(--text-muted)]">
                Tautan baru sudah dikirim.
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="font-medium text-[var(--text)] underline underline-offset-2"
              >
                Kirim ulang
              </button>
            )}
          </AlertStrip>
        )}

        <GoogleButton
          label="Lanjutkan dengan Google"
          onError={setFormError}
        />
        <OrDivider />

        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="nama@bisnis.com"
              invalid={!!errors.email}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              disabled={isSubmitting}
              {...register("email")}
            />
            <FieldError id="email-error">{errors.email?.message}</FieldError>
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              invalid={!!errors.password}
              aria-invalid={!!errors.password}
              aria-describedby={
                errors.password ? "password-error" : undefined
              }
              disabled={isSubmitting}
              {...register("password")}
            />
            <FieldError id="password-error">
              {errors.password?.message}
            </FieldError>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Memproses…" : "Masuk"}
          </Button>
        </form>

        <p className="text-center text-sm text-[var(--text-muted)]">
          Belum punya akun?{" "}
          <Link
            href="/signup"
            className="text-[var(--text)] underline underline-offset-2"
          >
            Daftar
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
