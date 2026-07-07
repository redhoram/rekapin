import { ArrowLeftRight } from "lucide-react";
import { requireRole } from "@/lib/session";
import { ComingSoon } from "@/components/coming-soon";

// Admin + staff placeholder — staff's landing page.
export default async function TransactionsPage() {
  await requireRole(["admin", "staff"]);
  return (
    <ComingSoon
      icon={ArrowLeftRight}
      title="Transaksi"
      description="Daftar transaksi terkategorisasi akan muncul di sini."
    />
  );
}
