import { sql } from "drizzle-orm";
import { rowsOf, type AnyDb } from "../types";
import type { DateRange } from "@/lib/date-range";
import { DIMENSIONS, type Dimension } from "../schema";
import { PROPERTY } from "@/lib/property";
import { valueLabel } from "@/lib/glossary";

const n = (v: unknown) => Number(v ?? 0);
const toCents = (dollars: unknown) => Math.round(n(dollars) * 100);

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
