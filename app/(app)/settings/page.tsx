import { Settings } from "lucide-react";
import { requireRole } from "@/lib/session";
import { ComingSoon } from "@/components/coming-soon";

// Admin-only placeholder.
export default async function SettingsPage() {
  await requireRole(["admin"]);
  return (
    <ComingSoon
      icon={Settings}
      title="Pengaturan"
      description="Kelola rekening, anggota tim, dan preferensi bisnis di sini."
    />
  );
}
