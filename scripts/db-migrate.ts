import "dotenv/config";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "@/lib/db/client";

/** Applies drizzle/ migrations through the app's own client (same journal drizzle-kit writes; same code path the PGlite tests use). */
async function main() {
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied: drizzle/ is up to date.");
  process.exit(0);
}
main().catch((e) => { console.error(e.cause?.message ?? e.message); process.exit(1); });
