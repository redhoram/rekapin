import {
  LayoutDashboard,
  Upload,
  ArrowLeftRight,
  FileText,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/constants";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
  /** Which badge counter (if any) renders on this item. */
  badge?: "needsReview";
};

// Nav config filtered by role in the sidebar. This is UI convenience only —
// server requireRole is the real gate (FR-9.1/9.2).
export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["admin"],
  },
  {
    href: "/upload",
    label: "Upload",
    icon: Upload,
    roles: ["admin", "staff"],
  },
  {
    href: "/transactions",
    label: "Transaksi",
    icon: ArrowLeftRight,
    roles: ["admin", "staff"],
    badge: "needsReview",
  },
  {
    href: "/reports",
    label: "Laporan",
    icon: FileText,
    roles: ["admin"],
  },
  {
    href: "/settings",
    label: "Pengaturan",
    icon: Settings,
    roles: ["admin"],
  },
];

export function navItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
