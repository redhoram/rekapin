import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import { previousPeriod, resolvePeriod } from "@/lib/reports/period";
import { fetchProfitLoss } from "@/lib/reports/profit-loss";
import { buildProfitLossWorkbook } from "@/lib/reports/export/profit-loss";
import { reportExportFilename } from "@/lib/reports/export/filename";

// GET /api/reports/export/laba-rugi — streams the Laba Rugi report as .xlsx.
// requireRole is the FIRST line (carry-forward from step ④ — lib/reports/*
// fetchers are not self-protecting; a non-admin is redirected/rejected before
// any fetch runs).
export async function GET(request: Request) {
  const { businessId } = await requireRole(["admin"]);
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const period = resolvePeriod({
    preset: sp.preset,
    year: sp.year,
    month: sp.month,
    quarter: sp.quarter,
    from: sp.from,
    to: sp.to,
  });
  const previous = previousPeriod(period);

  const [report, businessRow] = await Promise.all([
    fetchProfitLoss(businessId, period, previous),
    db
      .select({ name: businesses.name })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1),
  ]);

  const buffer = buildProfitLossWorkbook(report, businessRow[0]?.name ?? "Rekapin");

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${reportExportFilename("laba-rugi", period)}"`,
      "Cache-Control": "no-store",
    },
  });
}
