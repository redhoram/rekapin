import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db, schema } from "./db";
import { sendEmail, emailLayout } from "./email";

// Env is read lazily via process.env with fallbacks so `next build` succeeds
// without real secrets. Better Auth only needs these values at request time.
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),

  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",

  emailAndPassword: {
    enabled: true,
    // FR-1.1: users must verify their email before entering onboarding/app.
    requireEmailVerification: true,
    minPasswordLength: 8,
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    // Sent via Resend when RESEND_API_KEY is set; logged to the console
    // otherwise (lib/email.ts fallback keeps local dev fully testable).
    sendVerificationEmail: async ({ user, url }) => {
      const firstName = user.name?.split(" ")[0] || "";
      await sendEmail({
        to: user.email,
        subject: "Verifikasi email kamu — Rekapin",
        text: `Halo${firstName ? ` ${firstName}` : ""},\n\nSatu langkah lagi: verifikasi email untuk mulai pakai Rekapin.\n\n${url}\n\nAbaikan email ini kalau kamu tidak merasa mendaftar.`,
        html: emailLayout({
          title: "Verifikasi email kamu",
          bodyHtml: `Halo${firstName ? ` <strong>${firstName}</strong>` : ""},<br><br>Satu langkah lagi: klik tombol di bawah untuk verifikasi email dan mulai pakai Rekapin.`,
          ctaLabel: "Verifikasi Email",
          ctaUrl: url,
          footerNote: "Abaikan email ini kalau kamu tidak merasa mendaftar di Rekapin.",
        }),
      });
    },
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },

  // Ensures Set-Cookie headers from server actions are applied (Better Auth
  // Next.js integration). Session cookie stays httpOnly (default) per NFR-1.
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
