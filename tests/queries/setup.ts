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

/**
 * The same database with every `db.execute` counted. The query layer is measured in
 * statements, not in function calls: a page body that "feels" like five queries can be
 * eighteen round trips, which is what the fan-out work (audit item 7) had to prove down.
 */
export function countingDb(db: TestDb): { db: TestDb; statements: () => number; reset: () => void } {
  let count = 0;
  const proxy = new Proxy(db, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (prop === "execute" && typeof value === "function") {
        return (...args: unknown[]) => {
          count++;
          return (value as (...a: unknown[]) => unknown).apply(target, args);
        };
      }
      return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(target) : value;
    },
  }) as TestDb;
  return { db: proxy, statements: () => count, reset: () => { count = 0; } };
}
