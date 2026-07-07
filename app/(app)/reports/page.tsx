import { FileText } from "lucide-react";
import { requireRole } from "@/lib/session";
import { ComingSoon } from "@/components/coming-soon";

// Admin-only placeholder.
export default async function ReportsPage() {
  await requireRole(["admin"]);
  return (
    <ComingSoon
      icon={FileText}
      title="Laporan"
      description="Laba Rugi, Arus Kas, dan Buku Kas — siap diekspor."
    />
  );
}
