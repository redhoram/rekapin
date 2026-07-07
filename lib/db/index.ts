import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// Lazy init: `neon()` throws if given an empty connection string, and
// `next build` collects page data without a real DATABASE_URL. Defer client
// construction until the first query actually runs (Node runtime only).
let _db: NeonHttpDatabase<typeof schema> | null = null;

function getDb(): NeonHttpDatabase<typeof schema> {
  if (_db) return _db;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Configure it in .env (see .env.example).",
    );
  }
  const sql = neon(connectionString);
  _db = drizzle(sql, { schema });
  return _db;
}

// Proxy forwards property access to the lazily-created Drizzle instance, so
// `db.select(...)` works while construction stays deferred to request time.
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export { schema };
