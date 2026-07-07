import { Upload } from "lucide-react";
import { requireRole } from "@/lib/session";
import { ComingSoon } from "@/components/coming-soon";

// Admin + staff placeholder.
export default async function UploadPage() {
  await requireRole(["admin", "staff"]);
  return (
    <ComingSoon
      icon={Upload}
      title="Upload"
      description="Unggah mutasi rekening atau Excel untuk mencatat transaksi otomatis."
    />
  );
}
