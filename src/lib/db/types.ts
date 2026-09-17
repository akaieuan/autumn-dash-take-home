import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import type { schema } from "./schema";

/** The production driver (Supabase over postgres-js) and the test driver (PGlite) share every query and the seed. */
export type AnyDb = PostgresJsDatabase<typeof schema> | PgliteDatabase<typeof schema>;

/** `db.execute` returns a bare array on postgres-js and `{ rows }` on PGlite; this reads either. */
export const rowsOf = <T = Record<string, unknown>>(result: unknown): T[] =>
  Array.isArray(result) ? (result as T[]) : ((result as { rows: T[] }).rows ?? []);
