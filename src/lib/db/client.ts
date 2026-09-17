import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { schema } from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env and paste the Supabase transaction-pooler connection string.");

// Supabase's transaction pooler (port 6543) does not support prepared statements.
// In development every hot reload re-evaluates this module; without the globalThis cache each reload
// opened a new pool until the pooler ran out of connections and requests hung for minutes.
const globalForDb = globalThis as unknown as { __autumnPg?: ReturnType<typeof postgres> };
const client = globalForDb.__autumnPg ?? postgres(url, { prepare: false, ssl: "require", max: 5, idle_timeout: 20 });
if (process.env.NODE_ENV !== "production") globalForDb.__autumnPg = client;
export const db = drizzle({ client, schema });
export type Db = typeof db;
