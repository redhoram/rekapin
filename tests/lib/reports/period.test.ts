import { describe, expect, it } from "vitest";
import {
  computeChangePct,
  previousPeriod,
  resolvePeriod,
  trailingMonths,
  wibTodayIso,
} from "@/lib/reports/period";

// 2026-07-15 10:00 UTC = 17:00 WIB same calendar day.
const NOW = new Date("2026-07-15T10:00:00Z");

describe("wibTodayIso", () => {
  it("matches the UTC calendar date when both zones agree", () => {
    expect(wibTodayIso(NOW)).toBe("2026-07-15");
  });

  it("is one day AHEAD of a naive UTC-date read late in the UTC day", () => {
    // 18:30 UTC = 01:30 WIB the NEXT day — the timezone bug this fn prevents.
    expect(wibTodayIso(new Date("2026-07-08T18:30:00Z"))).toBe("2026-07-09");
  });

  it("crosses a year boundary correctly", () => {
    expect(wibTodayIso(new Date("2025-12-31T20:00:00Z"))).toBe("2026-01-01");
  });
});

describe("resolvePeriod", () => {
  it("defaults to the current WIB month for empty params", () => {
    const p = resolvePeriod({}, NOW);
    expect(p).toEqual({
      preset: "month",
      start: "2026-07-01",
      end: "2026-07-31",
      label: "Juli 2026",
    });
  });

  it("resolves an explicit month (with correct last day)", () => {
    const p = resolvePeriod({ preset: "month", year: "2026", month: "2" }, NOW);
    expect(p.start).toBe("2026-02-01");
    expect(p.end).toBe("2026-02-28");
    expect(p.label).toBe("Februari 2026");
  });

  it("resolves a leap-year February", () => {
    const p = resolvePeriod({ preset: "month", year: "2024", month: "2" }, NOW);
    expect(p.end).toBe("2024-02-29");
  });

  it("resolves an explicit quarter", () => {
    const p = resolvePeriod({ preset: "quarter", year: "2026", quarter: "3" }, NOW);
    expect(p).toEqual({
      preset: "quarter",
      start: "2026-07-01",
      end: "2026-09-30",
      label: "Kuartal 3 2026",
    });
  });

  it("resolves a year", () => {
    const p = resolvePeriod({ preset: "year", year: "2025" }, NOW);
    expect(p.start).toBe("2025-01-01");
    expect(p.end).toBe("2025-12-31");
    expect(p.label).toBe("2025");
  });

  it("resolves a custom range", () => {
    const p = resolvePeriod(
      { preset: "custom", from: "2026-07-01", to: "2026-07-10" },
      NOW,
    );
    expect(p.preset).toBe("custom");
    expect(p.start).toBe("2026-07-01");
    expect(p.end).toBe("2026-07-10");
  });

  it("silently swaps from > to", () => {
    const p = resolvePeriod(
      { preset: "custom", from: "2026-07-10", to: "2026-07-01" },
      NOW,
    );
    expect(p.start).toBe("2026-07-01");
    expect(p.end).toBe("2026-07-10");
  });

  it("never throws on garbage — falls back to the current WIB month", () => {
    const p = resolvePeriod(
      { preset: "chaos", year: "-4", month: "99", quarter: "0", from: "x", to: "y" },
      NOW,
    );
    expect(p.start).toBe("2026-07-01");
    expect(p.end).toBe("2026-07-31");
  });

  it("falls back for an incomplete custom range", () => {
    const p = resolvePeriod({ preset: "custom", from: "2026-07-01" }, NOW);
    expect(p.preset).toBe("month");
    expect(p.start).toBe("2026-07-01");
  });

  it("rejects a calendar-invalid date (Feb 30) as garbage", () => {
    const p = resolvePeriod(
      { preset: "custom", from: "2026-02-30", to: "2026-03-05" },
      NOW,
    );
    expect(p.preset).toBe("month"); // safe fallback
  });
});

describe("previousPeriod", () => {
  it("month -> prior month", () => {
    const p = previousPeriod(resolvePeriod({ preset: "month", year: "2026", month: "7" }, NOW));
    expect(p.start).toBe("2026-06-01");
    expect(p.end).toBe("2026-06-30");
  });

  it("January -> December of the prior year", () => {
    const p = previousPeriod(resolvePeriod({ preset: "month", year: "2026", month: "1" }, NOW));
    expect(p.start).toBe("2025-12-01");
    expect(p.end).toBe("2025-12-31");
    expect(p.label).toBe("Desember 2025");
  });

  it("quarter -> prior quarter", () => {
    const p = previousPeriod(
      resolvePeriod({ preset: "quarter", year: "2026", quarter: "3" }, NOW),
    );
    expect(p.label).toBe("Kuartal 2 2026");
  });

  it("Q1 -> Q4 of the prior year", () => {
    const p = previousPeriod(
      resolvePeriod({ preset: "quarter", year: "2026", quarter: "1" }, NOW),
    );
    expect(p.label).toBe("Kuartal 4 2025");
    expect(p.start).toBe("2025-10-01");
    expect(p.end).toBe("2025-12-31");
  });

  it("year -> prior year", () => {
    const p = previousPeriod(resolvePeriod({ preset: "year", year: "2026" }, NOW));
    expect(p.start).toBe("2025-01-01");
    expect(p.end).toBe("2025-12-31");
  });

  it("custom -> same day-count window immediately preceding", () => {
    const p = previousPeriod(
      resolvePeriod({ preset: "custom", from: "2026-07-11", to: "2026-07-20" }, NOW),
    );
    // 10-day window ending the day before the 11th.
    expect(p.start).toBe("2026-07-01");
    expect(p.end).toBe("2026-07-10");
  });

  it("custom window crossing a leap-year February", () => {
    const p = previousPeriod(
      resolvePeriod({ preset: "custom", from: "2024-03-01", to: "2024-03-07" }, NOW),
    );
    // 7 days ending 2024-02-29 (leap day).
    expect(p.start).toBe("2024-02-23");
    expect(p.end).toBe("2024-02-29");
  });
});

describe("trailingMonths", () => {
  it("returns exactly `count` months, oldest -> newest, ending at the anchor month", () => {
    const months = trailingMonths("2026-07-15", 12);
    expect(months).toHaveLength(12);
    expect(months[0].ym).toBe("2025-08");
    expect(months[0].label).toBe("Agu 2025");
    expect(months[11].ym).toBe("2026-07");
    expect(months[11].label).toBe("Jul 2026");
  });

  it("computes correct month start/end incl. a leap February", () => {
    const months = trailingMonths("2024-03-31", 3);
    expect(months.map((m) => m.ym)).toEqual(["2024-01", "2024-02", "2024-03"]);
    expect(months[1].start).toBe("2024-02-01");
    expect(months[1].end).toBe("2024-02-29"); // leap day
  });

  it("crosses a year boundary correctly", () => {
    const months = trailingMonths("2026-01-31", 3);
    expect(months.map((m) => m.ym)).toEqual(["2025-11", "2025-12", "2026-01"]);
    expect(months[0].label).toBe("Nov 2025");
  });
});

describe("computeChangePct", () => {
  it("returns null for an undefined baseline (previous 0, current != 0)", () => {
    expect(computeChangePct(500, 0)).toBeNull();
  });

  it("returns 0 when both are 0", () => {
    expect(computeChangePct(0, 0)).toBe(0);
  });

  it("computes a normal increase, rounded to 1 decimal", () => {
    expect(computeChangePct(1123, 1000)).toBe(12.3);
  });

  it("computes a decrease", () => {
    expect(computeChangePct(900, 1000)).toBe(-10);
  });

  it("sign follows the DIRECTION of change on a negative baseline", () => {
    // Loss shrinking to a profit reads as "up": (50 - (-100)) / |-100| = +150%.
    expect(computeChangePct(50, -100)).toBe(150);
  });
});
