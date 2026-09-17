import { sql } from "drizzle-orm";
import { rowsOf, type AnyDb } from "../types";
import { addDays, type DateRange, type Granularity } from "@/lib/date-range";
import { FEE_RATE_BPS, OTA_COMMISSION_RATE } from "@/lib/config";

const n = (v: unknown) => Number(v ?? 0);
const toCents = (dollars: unknown) => Math.round(n(dollars) * 100);

export interface PeriodTotals {
  from: string; to: string; days: number;
  impressions: number; clicks: number; websiteVisits: number; bookings: number;
  bookingValueCents: number; feeCents: number; netCents: number;
  newVisitors: number; pagesPerSession: number;
  ctr: number; conversion: number; avgBookingValueCents: number | null;
}

export interface OverviewDto {
  current: PeriodTotals;
  previous: PeriodTotals | null;
  lastYear: PeriodTotals | null;
  feeRateBps: number;
  costPerBookingCents: number | null;
  otaCommissionPerBookingCents: number | null;
  commissionAvoidedCents: number;
}

/** One pass over daily_metrics for a window. Every ratio is computed from the same rows it describes. */
export async function getPeriodTotals(db: AnyDb, from: string, to: string, feeRateBps = FEE_RATE_BPS): Promise<PeriodTotals> {
  const [r] = rowsOf(await db.execute(sql`
    select count(*)::int as days,
      coalesce(sum(impressions), 0) as impressions, coalesce(sum(clicks), 0) as clicks,
      coalesce(sum(website_visits), 0) as visits, coalesce(sum(bookings), 0) as bookings,
      coalesce(sum(booking_value), 0)::float8 as value, coalesce(sum(new_visitors), 0) as new_visitors,
      coalesce(avg(pages_per_session), 0)::float8 as pps
    from daily_metrics where date between ${from} and ${to}`));
  const bookingValueCents = toCents(r.value);
  const feeCents = Math.round((bookingValueCents * feeRateBps) / 10000);
  const clicks = n(r.clicks), impressions = n(r.impressions), bookings = n(r.bookings);
  return {
    from, to, days: n(r.days), impressions, clicks, websiteVisits: n(r.visits), bookings,
    bookingValueCents, feeCents, netCents: bookingValueCents - feeCents,
    newVisitors: n(r.new_visitors), pagesPerSession: Math.round(n(r.pps) * 100) / 100,
    ctr: impressions ? clicks / impressions : 0,
    conversion: clicks ? bookings / clicks : 0,
    avgBookingValueCents: bookings ? Math.round(bookingValueCents / bookings) : null,
  };
}

export async function getOverview(db: AnyDb, range: DateRange, feeRateBps = FEE_RATE_BPS): Promise<OverviewDto> {
  const c = range.comparison;
  const [current, previous, lastYear] = await Promise.all([
    getPeriodTotals(db, range.from, range.to, feeRateBps),
    c ? getPeriodTotals(db, c.prevFrom, c.prevTo, feeRateBps) : null,
    c ? getPeriodTotals(db, c.lastYearFrom, c.lastYearTo, feeRateBps) : null,
  ]);
  const b = current.bookings;
  return {
    current, previous, lastYear, feeRateBps,
    costPerBookingCents: b ? Math.round(current.feeCents / b) : null,
    otaCommissionPerBookingCents: b ? Math.round((current.bookingValueCents * OTA_COMMISSION_RATE) / b) : null,
    commissionAvoidedCents: Math.round(current.bookingValueCents * OTA_COMMISSION_RATE),
  };
}

export const TREND_METRICS = ["booking_value", "bookings", "clicks", "impressions", "website_visits", "new_visitors"] as const;
export type TrendMetric = (typeof TREND_METRICS)[number];
export interface TrendPoint { bucket: string; current: number; previous: number | null; lastYear: number | null }

/** Bucket starts from the range's first day (a "last 90 days" view should not snap to Mondays the owner did not pick). */
export function bucketStarts(from: string, to: string, g: Granularity): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; ) {
    out.push(d);
    if (g === "day") d = addDays(d, 1);
    else if (g === "week") d = addDays(d, 7);
    else { const [y, m] = d.split("-").map(Number); d = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`; }
  }
  return out;
}

const COLUMN: Record<TrendMetric, string> = { booking_value: "booking_value", bookings: "bookings", clicks: "clicks", impressions: "impressions", website_visits: "website_visits", new_visitors: "new_visitors" };

async function series(db: AnyDb, from: string, to: string, g: Granularity, metric: TrendMetric): Promise<number[]> {
  const rows = rowsOf<{ d: string; v: unknown }>(await db.execute(sql`select date::text as d, ${sql.raw(COLUMN[metric])} as v from daily_metrics where date between ${from} and ${to}`));
  const byDay = new Map(rows.map((r) => [r.d, metric === "booking_value" ? toCents(r.v) : n(r.v)]));
  const starts = bucketStarts(from, to, g);
  return starts.map((s, i) => {
    const end = i + 1 < starts.length ? addDays(starts[i + 1], -1) : to;
    let sum = 0;
    for (let d = s; d <= end; d = addDays(d, 1)) sum += byDay.get(d) ?? 0;
    return sum;
  });
}

/** Money metrics come back in cents. Comparison series are aligned by bucket index so the chart can overlay them. */
export async function getTrend(db: AnyDb, range: DateRange, metric: TrendMetric): Promise<TrendPoint[]> {
  const g = range.granularity, c = range.comparison;
  const [cur, prev, ly] = await Promise.all([
    series(db, range.from, range.to, g, metric),
    c ? series(db, c.prevFrom, c.prevTo, g, metric) : null,
    c ? series(db, c.lastYearFrom, c.lastYearTo, g, metric) : null,
  ]);
  return bucketStarts(range.from, range.to, g).map((bucket, i) => ({ bucket, current: cur[i], previous: prev ? (prev[i] ?? 0) : null, lastYear: ly ? (ly[i] ?? 0) : null }));
}
