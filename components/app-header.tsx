"use client";

import { Menu, ChevronDown, LogOut, User } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { initialsFromName } from "@/lib/utils";
import { signOutAction } from "@/actions/auth";

// App header for the content column. Hamburger on mobile opens the drawer.
export function AppHeader({
  name,
  email,
  onOpenMenu,
}: {
  name: string;
  email: string;
  onOpenMenu: () => void;
}) {
  const initials = initialsFromName(name);

  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-card)] px-6 max-md:px-4">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Buka menu"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--text)] outline-none transition-colors hover:hover-wash focus-visible:ring-2 focus-visible:ring-[var(--yellow)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-card)] md:hidden"
      >
        <Menu size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>
      {/* Spacer keeps the right cluster aligned on desktop (no left content). */}
      <div className="hidden md:block" aria-hidden="true" />

      <div className="flex items-center gap-2">
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Menu akun"
            className="flex items-center gap-1.5 rounded-md p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--yellow)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-card)]"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg)] text-xs font-medium text-[var(--text)]">
              {initials || (
                <User size={14} strokeWidth={1.75} aria-hidden="true" />
              )}
            </span>
            <ChevronDown
              size={14}
              strokeWidth={1.75}
              className="text-[var(--text-muted)] max-sm:hidden"
              aria-hidden="true"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-[var(--text)]">{name}</p>
              <p className="truncate text-xs text-[var(--text-muted)]">
                {email}
              </p>
            </div>
            <DropdownMenuSeparator />
            <form action={signOutAction}>
              <DropdownMenuItem asChild>
                <button type="submit" className="w-full">
                  <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
                  Keluar
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
