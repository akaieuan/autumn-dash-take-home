import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { schema } from "@/lib/db/schema";

/** A real Postgres in-process, with the generated migration applied. */
export async function makeTestDb() {
  const client = new PGlite();
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  return { db, close: () => client.close() };
}
export type TestDb = Awaited<ReturnType<typeof makeTestDb>>["db"];
