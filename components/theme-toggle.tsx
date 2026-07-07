"use client";

import * as React from "react";
import { Sun, Moon } from "lucide-react";
import { THEME_STORAGE_KEY } from "@/lib/constants";

type Theme = "night" | "day";

/**
 * Toggles data-theme on <html>, persists to localStorage['rekapin_theme'], and
 * updates colorScheme. The anti-flash inline script in app/layout.tsx has
 * already set the initial theme before paint, so there is nothing to "catch up".
 */
export function ThemeToggle() {
  const [theme, setTheme] = React.useState<Theme>("night");

  // Sync from the DOM (set by the anti-flash script) after hydration.
  React.useEffect(() => {
    const current = document.documentElement.getAttribute(
      "data-theme",
    ) as Theme | null;
    if (current === "day" || current === "night") {
      setTheme(current);
    }
  }, []);

  const toggle = React.useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "night" ? "day" : "night";
      document.documentElement.setAttribute("data-theme", next);
      document.documentElement.style.colorScheme =
        next === "night" ? "dark" : "light";
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // Ignore storage failures (private mode, etc.).
      }
      return next;
    });
  }, []);

  const isNight = theme === "night";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isNight ? "Mode terang" : "Mode gelap"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--text)] outline-none transition-colors hover:hover-wash focus-visible:ring-2 focus-visible:ring-[var(--yellow)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
    >
      {isNight ? (
        <Sun size={18} strokeWidth={1.75} aria-hidden="true" />
      ) : (
        <Moon size={18} strokeWidth={1.75} aria-hidden="true" />
      )}
    </button>
  );
}
