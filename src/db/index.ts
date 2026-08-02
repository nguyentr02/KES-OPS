import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

// neon-http: one round-trip per query — ideal for Vercel serverless. It has no
// interactive transactions, so multi-row writes (order + items) insert
// sequentially with manual cleanup on failure.
type DB = ReturnType<typeof drizzle<typeof schema>>;

let instance: DB | null = null;

function init(): DB {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (see .env.example).");
  return drizzle(neon(url), { schema });
}

/**
 * Lazy so `next build` never needs a live database — the connection is created
 * on first query, not at import time.
 */
export const db = new Proxy({} as DB, {
  get(_target, prop) {
    instance ??= init();
    const value = Reflect.get(instance as object, prop);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
