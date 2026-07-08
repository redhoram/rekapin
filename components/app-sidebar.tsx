"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/wordmark";
import { navItemsForRole } from "@/components/app-nav-config";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/constants";

/**
 * Compact needs_review badge (design §6). NOT a full yellow pill: the number
 * uses --text (yellow text fails contrast on the day palette) with a small
 * yellow dot as the attention cue — calm in the chrome, but visible. The active
 * nav row already carries the left yellow bar, so this stays restrained.
 */
function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={`${count} transaksi perlu ditinjau`}
      className="ml-auto inline-flex min-w-[1.25rem] items-center justify-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg)] px-1.5 text-[11px] font-semibold tabular-nums text-[var(--text)]"
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 rounded-full bg-[var(--yellow)]"
      />
      {count > 99 ? "99+" : count}
    </span>
  );
}

// Sidebar nav list — role-filtered. Used both in the fixed desktop sidebar and
// inside the mobile drawer (onNavigate closes the drawer).
export function SidebarNav({
  role,
  homeHref,
  needsReviewCount,
  onNavigate,
}: {
  role: Role;
  homeHref: string;
  needsReviewCount: number;
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
              {item.badge === "needsReview" && (
                <NavBadge count={needsReviewCount} />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
