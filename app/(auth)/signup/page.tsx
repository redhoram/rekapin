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
import { signUp } from "@/lib/auth-client";
import { AuthShell, OrDivider } from "../_components/auth-shell";
import { GoogleButton } from "../_components/google-button";

const schema = z.object({
  name: z.string().trim().min(1, "Nama tidak boleh kosong."),
  email: z
    .string()
    .min(1, "Masukkan email yang valid.")
    .email("Masukkan email yang valid."),
  password: z.string().min(8, "Password minimal 8 karakter."),
});

type FormValues = z.infer<typeof schema>;

export default function SignupPage() {
  const router = useRouter();
  const [formError, setFormError] = React.useState<React.ReactNode | null>(
    null,
  );

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
    const { error } = await signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
      callbackURL: "/",
    });

    if (error) {
      if (error.status === 422 || error.code === "USER_ALREADY_EXISTS") {
        setFormError(
          <>
            Email ini sudah terdaftar.{" "}
            <Link
              href="/login"
              className="font-medium text-[var(--text)] underline underline-offset-2"
            >
              Coba masuk.
            </Link>
          </>,
        );
      } else {
        setFormError("Gagal mendaftar. Coba lagi sebentar.");
      }
      return;
    }
    // Verification email sent (logged to console in dev) → check-inbox page.
    router.push("/verify-email");
  };

  return (
    <AuthShell
      subtitle="Buat akun untuk mulai merapikan keuangan bisnismu"
      wordmarkHref="/"
    >
      <div className="flex flex-col gap-6">
        {formError && <AlertStrip>{formError}</AlertStrip>}

        <GoogleButton label="Daftar dengan Google" onError={setFormError} />
        <OrDivider />

        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <div>
            <Label htmlFor="name">Nama lengkap</Label>
            <Input
              id="name"
              autoComplete="name"
              placeholder="Nama kamu"
              invalid={!!errors.name}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
              disabled={isSubmitting}
              {...register("name")}
            />
            <FieldError id="name-error">{errors.name?.message}</FieldError>
          </div>

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
              autoComplete="new-password"
              invalid={!!errors.password}
              aria-invalid={!!errors.password}
              aria-describedby={
                errors.password ? "password-error" : "password-helper"
              }
              disabled={isSubmitting}
              {...register("password")}
            />
            {errors.password ? (
              <FieldError id="password-error">
                {errors.password.message}
              </FieldError>
            ) : (
              <p
                id="password-helper"
                className="mt-1.5 text-xs text-[var(--text-muted)]"
              >
                Minimal 8 karakter
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Memproses…" : "Daftar"}
          </Button>
        </form>

        <p className="text-center text-sm text-[var(--text-muted)]">
          Sudah punya akun?{" "}
          <Link
            href="/login"
            className="text-[var(--text)] underline underline-offset-2"
          >
            Masuk
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
