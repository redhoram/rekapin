import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Coarse first gate ONLY. Redirects unauthenticated users away from protected
 * areas based on session-cookie presence — NO DB round-trip (Neon serverless
 * cannot run in the edge runtime, spec edge case). The fine-grained
 * role/membership check happens in each layout/page/server action via
 * requireRole (the real source of truth per NFR-1).
 */
export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  const isProtected =
    pathname.startsWith("/onboarding") ||
    pathname === "/dashboard" ||
    pathname === "/upload" ||
    pathname === "/transactions" ||
    pathname === "/reports" ||
    pathname === "/settings";

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/verify-email";

  // No session cookie hitting a protected area -> login.
  if (isProtected && !sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Already-authenticated user hitting login/signup -> let "/" route onward.
  if (isAuthPage && sessionCookie && pathname !== "/verify-email") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/onboarding/:path*",
    "/dashboard",
    "/upload",
    "/transactions",
    "/reports",
    "/settings",
    "/login",
    "/signup",
    "/verify-email",
  ],
};
