import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db, schema } from "./db";

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
    // STUB (spec DECISIONS #5): no real transactional email provider is wired.
    // The verification link is logged to the server console in dev so the flow
    // is testable locally. Swap for Resend before production.
    sendVerificationEmail: async ({ user, url }) => {
      console.log(`[dev][email-verification] to=${user.email} url=${url}`);
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
