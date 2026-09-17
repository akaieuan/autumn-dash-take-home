import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { schema } from "./schema";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

let real: Db | undefined;

/**
 * Created on first use, not at import: `next build` evaluates page modules
 * while collecting page data, and a build must not need a database. Accepts
 * DATABASE_URL, or POSTGRES_URL as injected by Vercel's Supabase integration.
 */
function connect(): Db {
  if (real) return real;
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Locally: copy .env.example to .env and paste the Supabase transaction-pooler connection string. On Vercel: add it under Settings → Environment Variables.");
  // Supabase's transaction pooler (port 6543) does not support prepared statements, and requires TLS.
  real = drizzle({ client: postgres(url, { prepare: false, ssl: "require" }), schema });
  return real;
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const value = Reflect.get(connect() as object, prop);
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(connect()) : value;
  },
});
