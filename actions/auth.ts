"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Sign out the current session and redirect to /login. Used by the app-shell
 * user menu and the onboarding "Keluar" link.
 */
export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}

/**
 * Sign out and redirect to /signup — used by the verify-email "wrong email"
 * escape hatch so the user can register with a different address.
 */
export async function signOutToSignupAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/signup");
}
