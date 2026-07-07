"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/wordmark";
import { navItemsForRole } from "@/components/app-nav-config";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/constants";

// Sidebar nav list — role-filtered. Used both in the fixed desktop sidebar and
// inside the mobile drawer (onNavigate closes the drawer).
export function SidebarNav({
  role,
  homeHref,
  onNavigate,
}: {
  role: Role;
  homeHref: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = navItemsForRole(role);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b border-[var(--border)] px-4">
        <Wordmark href={homeHref} />
      </div>
      <nav
        aria-label="Navigasi utama"
        className="flex flex-1 flex-col gap-1 p-3"
      >
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm outline-none transition-colors",
                "focus-visible:ring-2 focus-visible:ring-[var(--yellow)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-card)]",
                active
                  ? "hover-wash font-medium text-[var(--text)]"
                  : "font-normal text-[var(--text-muted)] hover:hover-wash hover:text-[var(--text)]",
              )}
            >
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-[var(--yellow)]"
                />
              )}
              <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
