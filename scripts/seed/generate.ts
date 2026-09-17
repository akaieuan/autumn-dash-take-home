import type { BreakdownRow, DailyMetricRow, Dimension } from "@/lib/db/schema";
import { DIMENSIONS } from "@/lib/db/schema";
import { dayOfWeek, daysBetween, eachDay } from "@/lib/date-range";
import { makeRng, type Rng } from "./rng";
import { apportion, apportionByDraw } from "./apportion";
import { BASE_IMPRESSIONS_PER_DAY, CLICK_THROUGH_RATE, DIMENSION_DEFS, SEED, WINDOW, avgBookingValueCents, conversionRate, demandMultiplier, growth, ramp } from "./profile";

const cents = (c: number) => Math.round(c) / 100;

/** Step 1: one row per day with trend + weekly + seasonal variation. Totals are the source of truth. */
export function generateDaily(rng: Rng): DailyMetricRow[] {
  // Bookings are small integers per day. A plain binomial draw makes monthly totals swing ±15% on noise
  // alone, which would hide the real trend. Error diffusion keeps daily counts lumpy (0–3) while monthly
  // totals track the underlying rate (clicks × conversion) closely.
  let carry = 0;
  return eachDay(WINDOW.start, WINDOW.end).map((date) => {
    const level = BASE_IMPRESSIONS_PER_DAY * demandMultiplier(date) * ramp(date) * growth(date);
    const impressions = rng.poisson(level * (0.9 + rng.next() * 0.2));
    const clicks = rng.binomial(impressions, CLICK_THROUGH_RATE * (0.92 + rng.next() * 0.16));
    const websiteVisits = clicks - rng.binomial(clicks, 0.03); // a few clicks never finish loading
    const expected = clicks * conversionRate(date) * (0.8 + rng.next() * 0.4) + carry;
    const bookings = Math.max(0, Math.min(clicks, Math.floor(expected)));
    carry = expected - bookings;
    let valueCents = 0;
    for (let i = 0; i < bookings; i++) valueCents += Math.round(avgBookingValueCents(date) * (0.75 + rng.next() * 0.5));
    // Site-wide new visitors (organic, direct, OTA referrals) run several times paid visits, and grow with the program.
    const newVisitors = rng.poisson(clicks * 5.2 * (0.9 + rng.next() * 0.2) + 12 * demandMultiplier(date));
    const pagesPerSession = Math.min(5, Math.max(2.2, rng.normal(3.4, 0.28)));
    return { date, impressions, clicks, websiteVisits, bookings, bookingValue: cents(valueCents), newVisitors, pagesPerSession: Math.round(pagesPerSession * 100) / 100 };
  });
}

function weightsFor(dim: Dimension, date: string): number[] {
  const years = (daysBetween(WINDOW.start, date) - 1) / 365;
  const weekend = dayOfWeek(date) === 5 || dayOfWeek(date) === 6;
  return DIMENSION_DEFS[dim].map((d) => {
    if (d.startsOn && date < d.startsOn) return 0;
    let w = d.weight * (1 + (d.drift ?? 0) * years);
    if (weekend && d.weekendBoost) w *= 1 + d.weekendBoost;
    return w;
  });
}

/** Step 2: split each day's totals across dimension values with weighted ratios. Every metric sums exactly to the day. */
export function generateBreakdowns(rng: Rng, daily: DailyMetricRow[]): BreakdownRow[] {
  const rows: BreakdownRow[] = [];
  for (const day of daily) {
    for (const dimension of DIMENSIONS) {
      const defs = DIMENSION_DEFS[dimension];
      const jitter = defs.map(() => 0.85 + rng.next() * 0.3);
      const impW = weightsFor(dimension, day.date).map((w, i) => w * jitter[i]);
      const impressions = apportion(day.impressions, impW);
      // Impressions are hundreds a day: exact remainder split. Clicks and bookings are small counts:
      // weighted draws, so light markets and campaigns still win their share over a month.
      const clicks = apportionByDraw(day.clicks, impressions.map((n, i) => n * defs[i].ctr), rng.next, impressions);
      const bookings = apportionByDraw(day.bookings, clicks.map((n, i) => n * defs[i].cvr), rng.next, clicks);
      const valueCents = apportion(Math.round(day.bookingValue * 100), bookings.map((n, i) => n * defs[i].valueMult));
      defs.forEach((d, i) => {
        if (impressions[i] === 0 && clicks[i] === 0 && bookings[i] === 0 && (d.startsOn && day.date < d.startsOn)) return; // campaign not launched yet
        rows.push({ date: day.date, dimension, dimensionValue: d.label, impressions: impressions[i], clicks: clicks[i], bookings: bookings[i], bookingValue: cents(valueCents[i]) });
      });
    }
  }
  return rows;
}

export function generateAll(seed = SEED) {
  const rng = makeRng(seed);
  const daily = generateDaily(rng);
  const breakdowns = generateBreakdowns(rng, daily);
  return { daily, breakdowns };
}
export type SeedData = ReturnType<typeof generateAll>;
