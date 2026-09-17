import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { schema } from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env and paste the Supabase transaction-pooler connection string.");

// Supabase's transaction pooler (port 6543) does not support prepared statements.
const client = postgres(url, { prepare: false });
export const db = drizzle({ client, schema });
export type Db = typeof db;
