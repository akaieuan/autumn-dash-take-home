import { sql } from "drizzle-orm";
import { rowsOf, type AnyDb } from "../types";

/** The first and last day with data. "Today" for every range is `max`, never the wall clock. */
export async function getDataBounds(db: AnyDb): Promise<{ min: string; max: string }> {
  const [r] = rowsOf<{ min: string | null; max: string | null }>(await db.execute(sql`select min(date)::text as min, max(date)::text as max from daily_metrics`));
  if (!r?.min || !r.max) throw new Error("daily_metrics is empty. Run `npm run db:seed`.");
  return { min: r.min, max: r.max };
}
