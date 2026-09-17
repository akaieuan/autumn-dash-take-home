import "dotenv/config";
import { db } from "@/lib/db/client";
import { generateAll } from "./generate";
import { seedDatabase, acceptanceLine } from "./seed-database";

async function main() {
  const t0 = Date.now();
  const acceptance = await seedDatabase(db, generateAll());
  console.log(acceptanceLine(acceptance));
  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
