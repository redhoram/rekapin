import { describe, expect, it } from "vitest";
import { sanitizeCallbackUrl } from "@/lib/callback-url";

describe("sanitizeCallbackUrl", () => {
  it("returns the fallback for empty/nullish input", () => {
    expect(sanitizeCallbackUrl(null)).toBe("/");
    expect(sanitizeCallbackUrl(undefined)).toBe("/");
    expect(sanitizeCallbackUrl("")).toBe("/");
    expect(sanitizeCallbackUrl("   ")).toBe("/");
  });

  it("passes through a legitimate same-origin path", () => {
    expect(sanitizeCallbackUrl("/invite/abc-123")).toBe("/invite/abc-123");
    expect(sanitizeCallbackUrl("/dashboard")).toBe("/dashboard");
    expect(sanitizeCallbackUrl("/transactions?reviewStatus=needs_review")).toBe(
      "/transactions?reviewStatus=needs_review",
    );
  });

  it("rejects absolute URLs to other origins", () => {
    expect(sanitizeCallbackUrl("https://evil.example.com")).toBe("/");
    expect(sanitizeCallbackUrl("http://evil.example.com/invite")).toBe("/");
  });

  it("rejects protocol-relative and backslash open-redirect tricks", () => {
    expect(sanitizeCallbackUrl("//evil.example.com")).toBe("/");
    expect(sanitizeCallbackUrl("/\\evil.example.com")).toBe("/");
    expect(sanitizeCallbackUrl("/%2fevil.example.com")).toBe("/");
    expect(sanitizeCallbackUrl("/%5cevil.example.com")).toBe("/");
    expect(sanitizeCallbackUrl("/%2Fevil.example.com")).toBe("/");
  });

  it("rejects paths that do not start with a slash", () => {
    expect(sanitizeCallbackUrl("dashboard")).toBe("/");
    expect(sanitizeCallbackUrl("javascript:alert(1)")).toBe("/");
  });

  it("honors a custom fallback", () => {
    expect(sanitizeCallbackUrl(null, "/login")).toBe("/login");
    expect(sanitizeCallbackUrl("//evil", "/login")).toBe("/login");
  });
});
