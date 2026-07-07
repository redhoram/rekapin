import type { Config } from "drizzle-kit";

// drizzle-kit reads DATABASE_URL from the environment. `generate` works offline
// from the schema; `migrate`/`push` require a live DATABASE_URL.
export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
} satisfies Config;
