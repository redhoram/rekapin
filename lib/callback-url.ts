/**
 * Sanitize a `callbackUrl` query param into a safe, same-origin destination path.
 *
 * Only ever returns a relative path that starts with a single "/" — protocol-
 * relative ("//host"), backslash ("/\\host"), and encoded-slash ("/%2f...")
 * tricks are all rejected so a crafted `?callbackUrl=` can never bounce the user
 * to another origin after login/signup (open-redirect prevention).
 */
export function sanitizeCallbackUrl(
  raw: string | null | undefined,
  fallback = "/",
): string {
  if (!raw) return fallback;
  const value = raw.trim();
  if (value === "" || !value.startsWith("/")) return fallback;

  const lower = value.toLowerCase();
  if (
    value.startsWith("//") ||
    value.startsWith("/\\") ||
    lower.startsWith("/%2f") ||
    lower.startsWith("/%5c")
  ) {
    return fallback;
  }
  return value;
}
