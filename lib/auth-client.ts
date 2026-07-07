"use client";

import { createAuthClient } from "better-auth/react";

// Client-side Better Auth hooks for Client Components (login/signup forms,
// sign-out button, resend verification).
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
});

export const { signIn, signUp, signOut, useSession } = authClient;
