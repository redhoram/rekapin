import { NextResponse } from "next/server";
import { getActiveMembership } from "@/lib/session";
import { generateTemplateBuffer } from "@/lib/parsing/template";

// GET /api/upload/template — streams the Rekapin Excel template as a download.
// A route handler (not a server action) so the browser triggers a native file
// download. admin + staff (any verified membership).
export async function GET() {
  const membership = await getActiveMembership();
  if (!membership) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const buffer = generateTemplateBuffer();
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-mutasi-rekapin.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
