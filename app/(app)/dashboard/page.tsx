import { LayoutDashboard } from "lucide-react";
import { requireRole } from "@/lib/session";
import { ComingSoon } from "@/components/coming-soon";

// Admin-only placeholder. requireRole is the real gate — staff redirect to
// /transactions server-side (not just a hidden nav link).
export default async function DashboardPage() {
  await requireRole(["admin"]);
  return (
    <ComingSoon
      icon={LayoutDashboard}
      title="Dashboard"
      description="Ringkasan margin dan arus kas bisnismu akan tampil di sini."
    />
  );
}
