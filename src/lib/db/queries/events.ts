import { sql } from "drizzle-orm";
import { n, rowsOf, toCents, type AnyDb } from "./types";
import { addDays, type DateRange } from "@/lib/date-range";
import type { EventKind } from "../schema";
import { EVENT_KIND_LABELS, valueLabel } from "@/lib/glossary";

export interface CampaignMetaDto { name: string; label: string; objective: string; focus: string; launchedOn: string; status: "live" | "paused"; monthlyBudgetCents: number }

/** What each campaign is for, in the owner's words. */
export async function getCampaignMeta(db: AnyDb): Promise<CampaignMetaDto[]> {
  const rows = rowsOf<{ name: string; objective: string; focus: string; launched_on: string; status: "live" | "paused"; budget: unknown }>(
    await db.execute(sql`select name, objective, focus, launched_on::text as launched_on, status, monthly_budget::float8 as budget from campaigns order by launched_on, name`),
  );
  return rows.map((r) => ({ name: r.name, label: valueLabel(r.name), objective: r.objective, focus: r.focus, launchedOn: r.launched_on, status: r.status, monthlyBudgetCents: toCents(r.budget) }));
}

export interface EventDto { id: number; date: string; campaign: string | null; campaignLabel: string | null; kind: EventKind; kindLabel: string; title: string; note: string }

/** What Autumn did inside the range, newest first. */
export async function getEvents(db: AnyDb, range: DateRange, limit = 10): Promise<EventDto[]> {
  const rows = rowsOf<{ id: number; date: string; campaign_name: string | null; kind: EventKind; title: string; note: string }>(
    await db.execute(sql`select id, date::text as date, campaign_name, kind, title, note from campaign_events where date between ${range.from} and ${range.to} order by date desc, id desc limit ${limit}`),
  );
  return rows.map((r) => ({
    id: Number(r.id), date: r.date, campaign: r.campaign_name, campaignLabel: r.campaign_name ? valueLabel(r.campaign_name) : null,
    kind: r.kind, kindLabel: EVENT_KIND_LABELS[r.kind], title: r.title, note: r.note,
  }));
}

export interface WindowTotals { from: string; to: string; impressions: number; clicks: number; bookings: number; bookingValueCents: number; spendCents: number; ctr: number; conversion: number }
export interface EventImpactDto { event: EventDto; days: number; before: WindowTotals; after: WindowTotals }

async function windowTotals(db: AnyDb, campaign: string | null, from: string, to: string): Promise<WindowTotals> {
  const [r] = rowsOf(
    campaign === null
      ? await db.execute(sql`select coalesce(sum(impressions),0) as i, coalesce(sum(clicks),0) as c, coalesce(sum(bookings),0) as b, coalesce(sum(booking_value),0)::float8 as v, coalesce(sum(spend),0)::float8 as s from daily_metrics where date between ${from} and ${to}`)
      : await db.execute(sql`select coalesce(sum(impressions),0) as i, coalesce(sum(clicks),0) as c, coalesce(sum(bookings),0) as b, coalesce(sum(booking_value),0)::float8 as v, coalesce(sum(spend),0)::float8 as s from breakdowns where dimension = 'campaign' and dimension_value = ${campaign} and date between ${from} and ${to}`),
  );
  const impressions = n(r.i), clicks = n(r.c), bookings = n(r.b);
  return { from, to, impressions, clicks, bookings, bookingValueCents: toCents(r.v), spendCents: toCents(r.s), ctr: impressions ? clicks / impressions : 0, conversion: clicks ? bookings / clicks : 0 };
}

/**
 * The album-release comparison: the `days` days from the event against the same
 * number of days before it, scoped to the event's campaign (program-wide events
 * read `daily_metrics`). `clipTo` (normally the last day with data) shortens the
 * after-window for recent events; `days` reports the length actually compared.
 */
export async function getEventImpact(db: AnyDb, event: EventDto, days = 28, clipTo?: string): Promise<EventImpactDto> {
  let afterTo = addDays(event.date, days - 1);
  if (clipTo && afterTo > clipTo) afterTo = clipTo;
  const actual = Math.max(1, Math.round((Date.parse(afterTo) - Date.parse(event.date)) / 86_400_000) + 1);
  const [before, after] = await Promise.all([
    windowTotals(db, event.campaign, addDays(event.date, -actual), addDays(event.date, -1)),
    windowTotals(db, event.campaign, event.date, afterTo),
  ]);
  return { event, days: actual, before, after };
}

/** The most recent events in the range, each with its before/after windows. */
export async function getRecentEventImpacts(db: AnyDb, range: DateRange, count = 3, days = 28): Promise<EventImpactDto[]> {
  const events = await getEvents(db, range, count);
  return Promise.all(events.map((e) => getEventImpact(db, e, days, range.to)));
}
