import type { BankPreset } from "../types";
import { bcaPreset } from "./bca";

/**
 * Preset registry. Only BCA ships now (spec scope). Adding Mandiri/BRI/BNI later
 * is one new file in this folder + one entry here — no other file changes.
 */
export const PRESETS: BankPreset[] = [bcaPreset];

/** Return the first preset whose header signature matches, or null. */
export function detectPreset(rawHeaders: string[]): BankPreset | null {
  return PRESETS.find((preset) => preset.matchesHeaders(rawHeaders)) ?? null;
}
