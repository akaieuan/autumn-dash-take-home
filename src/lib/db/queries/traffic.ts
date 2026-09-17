import { sql } from "drizzle-orm";
import { n, rowsOf, toCents, type AnyDb } from "./types";
import { addDays, type DateRange, type Granularity } from "@/lib/date-range";
import { valueLabel } from "@/lib/glossary";
import { bucketStarts, getPeriodTotals } from "./overview";
import { getBreakdown, type BreakdownBundle } from "./breakdowns";
import { getEvents, type EventDto } from "./events";

/**
 * The website-traffic screen's own queries: traffic explained through the
 * campaigns that produce it, and what each campaign gives back per visit.
 * Both read the same rows the Overview reads, so the two screens cannot disagree.
 */

export type CampaignSeriesMetric = "clicks" | "impressions" | "bookings";
export interface CampaignSeries { name: string; label: string; values: number[]; total: number }
export type EventMarker = EventDto & { bucket: string };
export interface CampaignSeriesDto { metric: CampaignSeriesMetric; granularity: Granularity; buckets: string[]; series: CampaignSeries[]; events: EventMarker[] }

const COLUMN: Record<CampaignSeriesMetric, string> = { clicks: "clicks", impressions: "impressions", bookings: "bookings" };

/** Bucket start containing a date, for the bucket list the series use. */
const bucketOf = (buckets: string[], date: string) => buckets.reduce((hit, b) => (b <= date ? b : hit), buckets[0]);

/**
 * One series per campaign over the range (stack them), ranked by total, plus
 * every event in the range pinned to its bucket so the chart can mark it.
 */
export async function getTrafficByCampaign(db: AnyDb, range: DateRange, metric: CampaignSeriesMetric = "clicks"): Promise<CampaignSeriesDto> {
  const buckets = bucketStarts(range.from, range.to, range.granularity);
  const [rows, events] = await Promise.all([
    rowsOf<{ d: string; value: string; v: unknown }>(await db.execute(sql`
      select date::text as d, dimension_value as value, ${sql.raw(COLUMN[metric])} as v
      from breakdowns where dimension = 'campaign' and date between ${range.from} and ${range.to}`)),
    getEvents(db, range, 100),
  ]);
  const byName = new Map<string, number[]>();
  for (const r of rows) {
    const values = byName.get(r.value) ?? new Array<number>(buckets.length).fill(0);
    values[buckets.indexOf(bucketOf(buckets, r.d))] += n(r.v);
    byName.set(r.value, values);
  }
  const series = [...byName.entries()]
    .map(([name, values]) => ({ name, label: valueLabel(name), values, total: values.reduce((s, v) => s + v, 0) }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  return {
    metric, granularity: range.granularity, buckets, series,
    events: [...events].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id).map((e) => ({ ...e, bucket: bucketOf(buckets, e.date) })),
  };
}

export interface CampaignEfficiencyRow {
  name: string; label: string;
  visits: number; shareOfVisits: number; spendCents: number; costPerVisitCents: number | null;
  bookings: number; conversion: number; costPerBookingCents: number | null;
  bookingValueCents: number; valuePerVisitCents: number | null;
  previous: { visits: number; bookings: number; spendCents: number; bookingValueCents: number } | null;
}
export interface CampaignEfficiencyDto {
  rows: CampaignEfficiencyRow[];
  total: { visits: number; spendCents: number; costPerVisitCents: number | null; bookings: number; conversion: number; costPerBookingCents: number | null; bookingValueCents: number; valuePerVisitCents: number | null };
}

const per = (cents: number, count: number) => (count ? Math.round(cents / count) : null);

/**
 * "Where the next dollar goes": what each campaign costs per visit and per
 * booking, and what a visit is worth, ranked by value per visit. The total row
 * comes from `daily_metrics`, never from summing the campaigns (CLAUDE.md §2).
 * `bundle` is the screen's shared aggregation when it has one: with it this reads the
 * campaign rows and the daily totals the bundle already fetched and runs no query at all.
 */
export async function getCampaignEfficiency(db: AnyDb, range: DateRange, bundle?: BreakdownBundle): Promise<CampaignEfficiencyDto> {
  const [rows, t] = await Promise.all([
    bundle ? bundle.rows.campaign : getBreakdown(db, range, "campaign"),
    bundle ? bundle.totals : getPeriodTotals(db, range.from, range.to),
  ]);
  const totalVisits = rows.reduce((s, r) => s + r.clicks, 0) || 1;
  const out: CampaignEfficiencyRow[] = rows.map((r) => ({
    name: r.value, label: r.label,
    visits: r.clicks, shareOfVisits: r.clicks / totalVisits, spendCents: r.spendCents, costPerVisitCents: per(r.spendCents, r.clicks),
    bookings: r.bookings, conversion: r.conversion, costPerBookingCents: per(r.spendCents, r.bookings),
    bookingValueCents: r.bookingValueCents, valuePerVisitCents: per(r.bookingValueCents, r.clicks),
    previous: r.previous ? { visits: r.previous.clicks, bookings: r.previous.bookings, spendCents: r.previous.spendCents, bookingValueCents: r.previous.bookingValueCents } : null,
  }));
  out.sort((a, b) => (b.valuePerVisitCents ?? -1) - (a.valuePerVisitCents ?? -1) || b.visits - a.visits || a.name.localeCompare(b.name));
  return {
    rows: out,
    total: {
      visits: t.clicks, spendCents: t.spendCents, costPerVisitCents: per(t.spendCents, t.clicks),
      bookings: t.bookings, conversion: t.conversion, costPerBookingCents: per(t.spendCents, t.bookings),
      bookingValueCents: t.bookingValueCents, valuePerVisitCents: per(t.bookingValueCents, t.clicks),
    },
  };
}

/** Kept for callers that want the day list a bucket covers (tooltips). */
export function bucketEnd(buckets: string[], i: number, to: string): string {
  return i + 1 < buckets.length ? addDays(buckets[i + 1], -1) : to;
}
export { toCents };
