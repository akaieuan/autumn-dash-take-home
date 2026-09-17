import { sql } from "drizzle-orm";
import { breakdowns, dailyMetrics } from "@/lib/db/schema";
import { rowsOf, type AnyDb } from "@/lib/db/types";
import type { SeedData } from "./generate";
import { WINDOW } from "./profile";
import { daysBetween } from "@/lib/date-range";
import { acceptanceLine, type Acceptance } from "./acceptance";

/** Repeatable: wipes both tables, inserts daily first (the FK target), then breakdowns in chunks. */
export async function seedDatabase(db: AnyDb, data: SeedData, chunk = 1000): Promise<Acceptance> {
  await db.execute(sql`truncate table breakdowns, daily_metrics`);
  for (let i = 0; i < data.daily.length; i += chunk) await db.insert(dailyMetrics).values(data.daily.slice(i, i + chunk));
  for (let i = 0; i < data.breakdowns.length; i += chunk) await db.insert(breakdowns).values(data.breakdowns.slice(i, i + chunk));
  return {
    days: daysBetween(WINDOW.start, WINDOW.end), from: WINDOW.start, to: WINDOW.end,
    dailyRows: data.daily.length, breakdownRows: data.breakdowns.length,
    bookings: data.daily.reduce((s, d) => s + d.bookings, 0),
    bookingValue: Math.round(data.daily.reduce((s, d) => s + d.bookingValue * 100, 0)) / 100,
  };
}

/** Re-measure from the database itself. Also proves every dimension reconciles with the daily totals. */
export async function verifyDatabase(db: AnyDb): Promise<{ acceptance: Acceptance; reconciled: Record<string, boolean> }> {
  const [d] = rowsOf<Record<string, number | string>>(await db.execute(sql`select count(*)::int as n, count(distinct date)::int as days, min(date)::text as lo, max(date)::text as hi,
    coalesce(sum(bookings), 0)::int as bookings, coalesce(sum(booking_value), 0)::float8 as value from daily_metrics`));
  const [b] = rowsOf<{ n: number }>(await db.execute(sql`select count(*)::int as n from breakdowns`));
  const rec = rowsOf<{ dimension: string; impressions_ok: boolean; clicks_ok: boolean; bookings_ok: boolean; value_ok: boolean }>(await db.execute(sql`
    select b.dimension,
      sum(b.impressions)::int = (select sum(impressions)::int from daily_metrics) as impressions_ok,
      sum(b.clicks)::int = (select sum(clicks)::int from daily_metrics) as clicks_ok,
      sum(b.bookings)::int = (select sum(bookings)::int from daily_metrics) as bookings_ok,
      abs(sum(b.booking_value) - (select sum(booking_value) from daily_metrics)) < 0.005 as value_ok
    from breakdowns b group by b.dimension order by 1`));
  const reconciled = Object.fromEntries(rec.map((r) => [r.dimension, r.impressions_ok && r.clicks_ok && r.bookings_ok && r.value_ok]));
  return {
    acceptance: { days: Number(d.days), from: String(d.lo), to: String(d.hi), dailyRows: Number(d.n), breakdownRows: Number(b.n), bookings: Number(d.bookings), bookingValue: Math.round(Number(d.value) * 100) / 100 },
    reconciled,
  };
}

export { acceptanceLine };
