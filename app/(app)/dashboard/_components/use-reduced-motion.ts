"use client";

import * as React from "react";

/**
 * Tracks the `prefers-reduced-motion` media query. Recharts animations are
 * JS-driven (react-smooth), so the global reduced-motion CSS rule can't stop
 * them — the charts must gate `isAnimationActive` on this hook instead
 * (design §1.4 / §8). SSR-safe: defaults to `false` until mounted.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return reduced;
}
