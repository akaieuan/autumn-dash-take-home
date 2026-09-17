import "dotenv/config";
import { db } from "@/lib/db/client";
import { verifyDatabase, acceptanceLine } from "./seed/seed-database";

async function main() {
  const { acceptance, reconciled } = await verifyDatabase(db);
  console.log(acceptanceLine(acceptance));
  for (const [dim, ok] of Object.entries(reconciled)) console.log(`${dim} reconciles with daily totals: ${ok ? "yes" : "NO"}`);
  const bad = Object.values(reconciled).some((ok) => !ok) || Object.keys(reconciled).length !== 3;
  if (acceptance.days < 720 || bad) { console.error("FAIL: fewer than 720 days or a dimension does not reconcile"); process.exit(1); }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
