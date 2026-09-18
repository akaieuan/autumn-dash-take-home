import { sql } from "drizzle-orm";
import { breakdowns, campaignEvents, campaigns, dailyMetrics } from "@/lib/db/schema";
import { rowsOf, type AnyDb } from "@/lib/db/types";
import type { SeedData } from "./generate";
import { WINDOW } from "./profile";
import { daysBetween } from "@/lib/date-range";
import { acceptanceLine, type Acceptance } from "./acceptance";

const sumCents = (rows: { [k: string]: unknown }[], key: string) => Math.round(rows.reduce((s, r) => s + Number(r[key]) * 100, 0)) / 100;

/** Repeatable: wipes all four tables, inserts reference rows and daily first (the FK targets), then breakdowns in chunks. */
export async function seedDatabase(db: AnyDb, data: SeedData, chunk = 1000): Promise<Acceptance> {
  await db.execute(sql`truncate table campaign_events, campaigns, breakdowns, daily_metrics`);
  await db.insert(campaigns).values(data.campaigns);
  await db.insert(campaignEvents).values(data.events);
  for (let i = 0; i < data.daily.length; i += chunk) await db.insert(dailyMetrics).values(data.daily.slice(i, i + chunk));
  for (let i = 0; i < data.breakdowns.length; i += chunk) await db.insert(breakdowns).values(data.breakdowns.slice(i, i + chunk));
  return {
    days: daysBetween(WINDOW.start, WINDOW.end), from: WINDOW.start, to: WINDOW.end,
    dailyRows: data.daily.length, breakdownRows: data.breakdowns.length,
    bookings: data.daily.reduce((s, d) => s + d.bookings, 0),
    bookingValue: sumCents(data.daily, "bookingValue"), spend: sumCents(data.daily, "spend"),
    campaigns: data.campaigns.length, events: data.events.length,
    allDirectBookings: data.daily.reduce((s, d) => s + d.allDirectBookings, 0),
  };
}

/** Re-measure from the database itself. Also proves every dimension reconciles with the daily totals, spend included. */
export async function verifyDatabase(db: AnyDb): Promise<{ acceptance: Acceptance; reconciled: Record<string, boolean> }> {
  const [d] = rowsOf<Record<string, number | string>>(await db.execute(sql`select count(*)::int as n, count(distinct date)::int as days, min(date)::text as lo, max(date)::text as hi,
    coalesce(sum(bookings), 0)::int as bookings, coalesce(sum(booking_value), 0)::float8 as value, coalesce(sum(spend), 0)::float8 as spend,
    coalesce(sum(all_direct_bookings), 0)::int as all_direct from daily_metrics`));
  const [b] = rowsOf<{ n: number }>(await db.execute(sql`select count(*)::int as n from breakdowns`));
  const [c] = rowsOf<{ n: number }>(await db.execute(sql`select count(*)::int as n from campaigns`));
  const [e] = rowsOf<{ n: number }>(await db.execute(sql`select count(*)::int as n from campaign_events`));
  const rec = rowsOf<{ dimension: string; impressions_ok: boolean; clicks_ok: boolean; bookings_ok: boolean; value_ok: boolean; spend_ok: boolean }>(await db.execute(sql`
    select b.dimension,
      sum(b.impressions)::int = (select sum(impressions)::int from daily_metrics) as impressions_ok,
      sum(b.clicks)::int = (select sum(clicks)::int from daily_metrics) as clicks_ok,
      sum(b.bookings)::int = (select sum(bookings)::int from daily_metrics) as bookings_ok,
      abs(sum(b.booking_value) - (select sum(booking_value) from daily_metrics)) < 0.005 as value_ok,
      abs(sum(b.spend) - (select sum(spend) from daily_metrics)) < 0.005 as spend_ok
    from breakdowns b group by b.dimension order by 1`));
  const reconciled = Object.fromEntries(rec.map((r) => [r.dimension, r.impressions_ok && r.clicks_ok && r.bookings_ok && r.value_ok && r.spend_ok]));
  return {
    acceptance: {
      days: Number(d.days), from: String(d.lo), to: String(d.hi), dailyRows: Number(d.n), breakdownRows: Number(b.n),
      bookings: Number(d.bookings), bookingValue: Math.round(Number(d.value) * 100) / 100, spend: Math.round(Number(d.spend) * 100) / 100,
      campaigns: Number(c.n), events: Number(e.n), allDirectBookings: Number(d.all_direct),
    },
    reconciled,
  };
}

export { acceptanceLine };
