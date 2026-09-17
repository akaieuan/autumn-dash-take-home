import { sql } from "drizzle-orm";
import { n, rowsOf, toCents, type AnyDb } from "./types";
import { addDays, type DateRange } from "@/lib/date-range";
import { DIMENSIONS, type Dimension } from "../schema";
import { PROPERTY } from "@/lib/property";
import { campaignKey, deviceKey, glossary, valueLabel, MARKET_HINTS, type CampaignKey, type DeviceKey, type GlossaryKey } from "@/lib/glossary";
import { getPeriodTotals } from "./overview";

export interface BreakdownRowDto {
  value: string;
  label: string;
  impressions: number; clicks: number; bookings: number; bookingValueCents: number; feeCents: number;
  ctr: number; conversion: number;
  shareOfBookings: number; shareOfClicks: number;
  previous: { impressions: number; clicks: number; bookings: number; bookingValueCents: number } | null;
}

interface Agg { value: string; impressions: unknown; clicks: unknown; bookings: unknown; v: unknown }

async function aggregate(db: AnyDb, dimension: Dimension, from: string, to: string): Promise<Agg[]> {
  return rowsOf<Agg>(await db.execute(sql`
    select dimension_value as value, sum(impressions) as impressions, sum(clicks) as clicks, sum(bookings) as bookings, sum(booking_value)::float8 as v
    from breakdowns where dimension = ${dimension} and date between ${from} and ${to}
    group by dimension_value`));
}

/** One dimension over the range, ranked by bookings then value, each row with its share and its previous-period figures. */
export async function getBreakdown(db: AnyDb, range: DateRange, dimension: Dimension, feeRateBps = PROPERTY.feeRateBps): Promise<BreakdownRowDto[]> {
  const c = range.comparison;
  const [cur, prev] = await Promise.all([
    aggregate(db, dimension, range.from, range.to),
    c ? aggregate(db, dimension, c.prevFrom, c.prevTo) : null,
  ]);
  const totalBookings = cur.reduce((s, r) => s + n(r.bookings), 0) || 1;
  const totalClicks = cur.reduce((s, r) => s + n(r.clicks), 0) || 1;
  const prevBy = new Map((prev ?? []).map((r) => [r.value, r]));
  return cur
    .map((r) => {
      const impressions = n(r.impressions), clicks = n(r.clicks), bookings = n(r.bookings), bookingValueCents = toCents(r.v);
      const p = prevBy.get(r.value);
      return {
        value: r.value, label: valueLabel(r.value),
        impressions, clicks, bookings, bookingValueCents, feeCents: Math.round((bookingValueCents * feeRateBps) / 10000),
        ctr: impressions ? clicks / impressions : 0, conversion: clicks ? bookings / clicks : 0,
        shareOfBookings: bookings / totalBookings, shareOfClicks: clicks / totalClicks,
        previous: prev ? { impressions: n(p?.impressions), clicks: n(p?.clicks), bookings: n(p?.bookings), bookingValueCents: toCents(p?.v) } : null,
      };
    })
    .sort((a, b) => b.bookings - a.bookings || b.bookingValueCents - a.bookingValueCents || b.clicks - a.clicks || a.value.localeCompare(b.value));
}

export async function getAllBreakdowns(db: AnyDb, range: DateRange, feeRateBps = PROPERTY.feeRateBps): Promise<Record<Dimension, BreakdownRowDto[]>> {
  const results = await Promise.all(DIMENSIONS.map((d) => getBreakdown(db, range, d, feeRateBps)));
  return Object.fromEntries(DIMENSIONS.map((d, i) => [d, results[i]])) as Record<Dimension, BreakdownRowDto[]>;
}

/** The seed's catch-all feeder market. It is never ranked; it joins the fold row at the bottom. */
const OTHER_MARKET = "Other";
const EVERYWHERE_ELSE = "Everywhere else";

export interface MarketDto { name: string; hint: string | null; visits: number; previousVisits: number | null; bookings: number; bookingValueCents: number; share: number }

/**
 * The cities guests searched from, longest tail folded away. `share` is against the
 * top row rather than the total, so the bars read as "how this city compares with the
 * best one" — the comparison an owner actually makes.
 */
export async function getMarkets(db: AnyDb, range: DateRange, limit = 5): Promise<MarketDto[]> {
  const rows = await getBreakdown(db, range, "feeder_market");
  if (rows.length === 0) return [];
  const named = rows.filter((r) => r.value !== OTHER_MARKET);
  const tail = [...named.slice(limit), ...rows.filter((r) => r.value === OTHER_MARKET)];
  const out: MarketDto[] = named.slice(0, limit).map((r) => ({
    name: r.label, hint: MARKET_HINTS[r.label] ?? null,
    visits: r.clicks, previousVisits: r.previous ? r.previous.clicks : null,
    bookings: r.bookings, bookingValueCents: r.bookingValueCents, share: 0,
  }));
  if (tail.length > 0) {
    const sum = (f: (r: BreakdownRowDto) => number) => tail.reduce((a, r) => a + f(r), 0);
    out.push({
      name: EVERYWHERE_ELSE, hint: null,
      visits: sum((r) => r.clicks),
      previousVisits: range.comparison ? sum((r) => r.previous?.clicks ?? 0) : null,
      bookings: sum((r) => r.bookings), bookingValueCents: sum((r) => r.bookingValueCents), share: 0,
    });
  }
  const top = out[0]?.bookings ?? 0;
  return out.map((m) => ({ ...m, share: top ? m.bookings / top : 0 }));
}

export interface CampaignDto { key: CampaignKey | null; name: string; live: boolean; shown: number; visits: number; ctr: number; bookings: number; bookingValueCents: number; share: number }
export interface CampaignSummaryDto { campaigns: CampaignDto[]; total: { shown: number; visits: number; ctr: number; bookings: number; bookingValueCents: number } }

/** A campaign counts as live when it was still being shown in the last seven days of the range. */
const LIVE_WINDOW_DAYS = 7;

/**
 * The total is `daily_metrics`, never a sum of the breakdown rows: breakdowns are
 * derived from the daily totals and a day without them would quietly shrink the
 * footer (CLAUDE.md §2). `visits` is clicks on both the rows and the total, so the
 * column adds up against its own footer.
 */
export async function getCampaigns(db: AnyDb, range: DateRange): Promise<CampaignSummaryDto> {
  const earliestLive = addDays(range.to, -(LIVE_WINDOW_DAYS - 1));
  const liveFrom = range.from > earliestLive ? range.from : earliestLive;
  const [rows, recent, totals] = await Promise.all([
    getBreakdown(db, range, "campaign"),
    // The live flag only needs this period's rows, so the comparison query is skipped.
    getBreakdown(db, { ...range, from: liveFrom, comparison: null }, "campaign"),
    getPeriodTotals(db, range.from, range.to),
  ]);
  const live = new Set(recent.filter((r) => r.impressions > 0).map((r) => r.value));
  return {
    campaigns: rows.map((r) => {
      const key = campaignKey(r.value);
      return {
        key, name: key ? glossary[key].label : r.label, live: live.has(r.value),
        shown: r.impressions, visits: r.clicks, ctr: r.ctr,
        bookings: r.bookings, bookingValueCents: r.bookingValueCents, share: r.shareOfBookings,
      };
    }),
    total: { shown: totals.impressions, visits: totals.clicks, ctr: totals.ctr, bookings: totals.bookings, bookingValueCents: totals.bookingValueCents },
  };
}

export interface FunnelStepDto { key: GlossaryKey; people: number; onwardRatio: number | null; bookingValueCents: number | null }
export interface FunnelDto { steps: FunnelStepDto[]; newVisitors: number; pagesPerSession: number; devices: { key: DeviceKey; share: number }[] }

/** Saw the ad → clicked it → booked. Each ratio is computed from the two figures above it, in the same rows. */
export async function getFunnel(db: AnyDb, range: DateRange): Promise<FunnelDto> {
  const [t, devices] = await Promise.all([
    getPeriodTotals(db, range.from, range.to),
    getBreakdown(db, range, "device"),
  ]);
  return {
    steps: [
      { key: "impressions", people: t.impressions, onwardRatio: t.impressions ? t.clicks / t.impressions : null, bookingValueCents: null },
      { key: "clicks", people: t.clicks, onwardRatio: t.clicks ? t.bookings / t.clicks : null, bookingValueCents: null },
      { key: "direct_bookings", people: t.bookings, onwardRatio: null, bookingValueCents: t.bookingValueCents },
    ],
    newVisitors: t.newVisitors,
    pagesPerSession: t.pagesPerSession,
    devices: devices
      .flatMap((r) => { const key = deviceKey(r.value); return key ? [{ key, share: r.shareOfClicks }] : []; })
      .sort((a, b) => b.share - a.share),
  };
}
