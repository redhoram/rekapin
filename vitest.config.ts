import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests target the pure parsing layer (lib/parsing/**). Node environment —
// these functions use node:crypto (sha256) and Buffer, never the DOM.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
