import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import { previousPeriod, resolvePeriod } from "@/lib/reports/period";
import { fetchCashFlow } from "@/lib/reports/cash-flow";
import { buildCashFlowWorkbook } from "@/lib/reports/export/cash-flow";
import { reportExportFilename } from "@/lib/reports/export/filename";

// GET /api/reports/export/arus-kas — streams the Arus Kas report as .xlsx.
// Takes NO accountId: always exports every account + the combined summary in one
// workbook, independent of the on-screen toggle. requireRole is the FIRST line.
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
    fetchCashFlow(businessId, period, previous),
    db
      .select({ name: businesses.name })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1),
  ]);

  const buffer = buildCashFlowWorkbook(report, businessRow[0]?.name ?? "Rekapin");

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${reportExportFilename("arus-kas", period)}"`,
      "Cache-Control": "no-store",
    },
  });
}
