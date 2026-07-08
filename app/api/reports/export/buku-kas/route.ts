import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { bankAccounts, businesses } from "@/lib/db/schema";
import { previousPeriod, resolvePeriod } from "@/lib/reports/period";
import {
  BUKU_KAS_EXPORT_PAGE_SIZE,
  fetchCashBook,
} from "@/lib/reports/cash-book";
import { buildCashBookWorkbook } from "@/lib/reports/export/cash-book";
import { reportExportFilename } from "@/lib/reports/export/filename";

const COMBINED_LABEL = "Semua Rekening";

// GET /api/reports/export/buku-kas — streams the Buku Kas ledger as .xlsx.
// Reads accountId (default "combined", same param as /reports) and fetches EVERY
// row in one page (BUKU_KAS_EXPORT_PAGE_SIZE), not just the on-screen 50.
// requireRole is the FIRST line.
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
  void previous; // Buku Kas has no previous-period comparison.

  const accountId = sp.accountId ?? "combined";

  const [page, accountRows, businessRow] = await Promise.all([
    fetchCashBook(businessId, period, accountId, 1, BUKU_KAS_EXPORT_PAGE_SIZE),
    db
      .select({
        id: bankAccounts.id,
        bankCode: bankAccounts.bankCode,
        label: bankAccounts.label,
      })
      .from(bankAccounts)
      .where(eq(bankAccounts.businessId, businessId)),
    db
      .select({ name: businesses.name })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1),
  ]);

  // page.accountId is the RESOLVED view (unknown ids fall back to "combined").
  const selected =
    page.accountId === "combined"
      ? null
      : (accountRows.find((a) => a.id === page.accountId) ?? null);
  const accountLabel = selected
    ? `${selected.bankCode} · ${selected.label}`
    : COMBINED_LABEL;

  const buffer = buildCashBookWorkbook(
    page,
    businessRow[0]?.name ?? "Rekapin",
    accountLabel,
  );

  const filename = reportExportFilename(
    "buku-kas",
    period,
    selected ? accountLabel : undefined,
  );

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
