import { describe, expect, it } from "vitest";
import {
  INVITATION_TTL_DAYS,
  invitationExpiry,
  isInvitationExpired,
  isInvitationPending,
  invitationStatus,
  generateInvitationToken,
} from "@/lib/invitations";

const NOW = new Date("2026-07-08T10:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

describe("invitationExpiry", () => {
  it("returns now + 7 days", () => {
    const expiry = invitationExpiry(NOW);
    expect(expiry.getTime()).toBe(NOW.getTime() + INVITATION_TTL_DAYS * DAY_MS);
  });
});

describe("isInvitationExpired", () => {
  it("is false before the window closes", () => {
    const expiresAt = new Date(NOW.getTime() + DAY_MS);
    expect(isInvitationExpired(expiresAt, NOW)).toBe(false);
  });

  it("is true at or after the expiry instant", () => {
    expect(isInvitationExpired(new Date(NOW.getTime()), NOW)).toBe(true);
    expect(isInvitationExpired(new Date(NOW.getTime() - 1), NOW)).toBe(true);
  });
});

describe("isInvitationPending", () => {
  it("is true when unaccepted and unexpired", () => {
    expect(
      isInvitationPending(
        { acceptedAt: null, expiresAt: new Date(NOW.getTime() + DAY_MS) },
        NOW,
      ),
    ).toBe(true);
  });

  it("is false when already accepted", () => {
    expect(
      isInvitationPending(
        {
          acceptedAt: new Date(NOW.getTime() - DAY_MS),
          expiresAt: new Date(NOW.getTime() + DAY_MS),
        },
        NOW,
      ),
    ).toBe(false);
  });

  it("is false when expired", () => {
    expect(
      isInvitationPending(
        { acceptedAt: null, expiresAt: new Date(NOW.getTime() - DAY_MS) },
        NOW,
      ),
    ).toBe(false);
  });
});

describe("invitationStatus", () => {
  it("classifies accepted first, regardless of expiry", () => {
    expect(
      invitationStatus(
        {
          acceptedAt: new Date(NOW.getTime() - DAY_MS),
          expiresAt: new Date(NOW.getTime() - DAY_MS),
        },
        NOW,
      ),
    ).toBe("accepted");
  });

  it("classifies expired when unaccepted past the window", () => {
    expect(
      invitationStatus(
        { acceptedAt: null, expiresAt: new Date(NOW.getTime() - 1) },
        NOW,
      ),
    ).toBe("expired");
  });

  it("classifies pending otherwise", () => {
    expect(
      invitationStatus(
        { acceptedAt: null, expiresAt: new Date(NOW.getTime() + DAY_MS) },
        NOW,
      ),
    ).toBe("pending");
  });
});

describe("generateInvitationToken", () => {
  it("returns a non-empty, unique-looking token", () => {
    const a = generateInvitationToken();
    const b = generateInvitationToken();
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(16);
  });
});
