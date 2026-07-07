"use client";

import * as React from "react";
import { AppHeader } from "@/components/app-header";
import { SidebarNav } from "@/components/app-sidebar";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/constants";

// Client shell: fixed desktop sidebar + header, plus an off-canvas drawer on
// mobile with focus trap, Esc-to-close, and backdrop.
export function AppShell({
  role,
  name,
  email,
  children,
}: {
  role: Role;
  name: string;
  email: string;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const drawerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  const homeHref = role === "admin" ? "/dashboard" : "/transactions";

  const closeDrawer = React.useCallback(() => setDrawerOpen(false), []);

  // Esc closes; focus moves into the drawer on open and back to the trigger on
  // close (a11y — design §2.I). Tab/Shift+Tab wrap within the drawer so focus
  // never escapes to the content behind it while it's open (carry-forward #2).
  React.useEffect(() => {
    if (!drawerOpen) return;
    const drawer = drawerRef.current;

    const focusable = (): HTMLElement[] => {
      if (!drawer) return [];
      return Array.from(
        drawer.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || active === drawer) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    drawer?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const handleOpenMenu = () => {
    triggerRef.current = document.activeElement as HTMLButtonElement | null;
    setDrawerOpen(true);
  };

  React.useEffect(() => {
    if (!drawerOpen) triggerRef.current?.focus();
  }, [drawerOpen]);

  return (
    <div className="grid h-screen grid-cols-1 md:grid-cols-[240px_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden h-screen border-r border-[var(--border)] bg-[var(--bg-card)] md:block">
        <SidebarNav role={role} homeHref={homeHref} />
      </aside>

      {/* Content column */}
      <div className="flex h-screen min-w-0 flex-col">
        <AppHeader name={name} email={email} onOpenMenu={handleOpenMenu} />
        <main className="flex-1 overflow-y-auto bg-[var(--bg)] p-6 max-md:p-4">
          {children}
        </main>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={closeDrawer}
            className="absolute inset-0 bg-[color-mix(in_srgb,#0A0A0A_50%,transparent)]"
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigasi utama"
            tabIndex={-1}
            className={cn(
              "absolute inset-y-0 left-0 w-60 bg-[var(--bg-card)] outline-none",
              "border-r border-[var(--border)]",
            )}
          >
            <SidebarNav
              role={role}
              homeHref={homeHref}
              onNavigate={closeDrawer}
            />
          </div>
        </div>
      )}
    </div>
  );
}
