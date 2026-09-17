import type { BreakdownRow, CampaignEventRow, CampaignRow, DailyMetricRow, Dimension } from "@/lib/db/schema";
import { DIMENSIONS } from "@/lib/db/schema";
import { dayOfWeek, daysBetween, eachDay } from "@/lib/date-range";
import { makeRng, type Rng } from "./rng";
import { apportion, apportionByDraw } from "./apportion";
import { BASE_IMPRESSIONS_PER_DAY, CAMPAIGN_META, CAMPAIGN_WEIGHT_TOTAL, CLICK_THROUGH_RATE, DIMENSION_DEFS, EVENTS, SEED, WINDOW, avgBookingValueCents, conversionRate, demandMultiplier, eventMultipliers, growth, ramp } from "./profile";

const cents = (c: number) => Math.round(c) / 100;

interface CampaignPlan { weight: number; ctr: number; cvr: number }

/**
 * What each campaign is expected to do on a date, before noise: its impression
 * weight (base weight × every active event effect), its click-through and its
 * conversion. Pure, so the daily totals and the campaign split use the same plan
 * and the events cause both.
 */
export function campaignPlan(date: string): CampaignPlan[] {
  return DIMENSION_DEFS.campaign.map((d) => {
    if (d.startsOn && date < d.startsOn) return { weight: 0, ctr: 0, cvr: 0 };
    const m = eventMultipliers(d.label, date);
    return { weight: d.weight * m.impressions, ctr: CLICK_THROUGH_RATE * d.ctr * m.ctr, cvr: d.cvr * m.cvr };
  });
}

/** Step 1: one row per day. The level is the sum of the campaigns' plans, so launches and budget changes move the totals. */
export function generateDaily(rng: Rng): DailyMetricRow[] {
  let carry = 0;
  return eachDay(WINDOW.start, WINDOW.end).map((date) => {
    const plan = campaignPlan(date);
    const planned = plan.reduce((s, p) => s + p.weight, 0);
    const level = BASE_IMPRESSIONS_PER_DAY * demandMultiplier(date) * ramp(date) * growth(date) * (planned / CAMPAIGN_WEIGHT_TOTAL);
    const impressions = rng.poisson(level * (0.9 + rng.next() * 0.2));
    const expectedClicks = plan.reduce((s, p) => s + p.weight * p.ctr, 0);
    const blendedCtr = planned ? expectedClicks / planned : CLICK_THROUGH_RATE;
    const clicks = rng.binomial(impressions, blendedCtr * (0.92 + rng.next() * 0.16));
    const websiteVisits = clicks - rng.binomial(clicks, 0.03); // a few clicks never finish loading
    const cvrMix = expectedClicks ? plan.reduce((s, p) => s + p.weight * p.ctr * p.cvr, 0) / expectedClicks : 1;
    // Bookings are small integers per day; error diffusion keeps daily counts lumpy (0–3) while monthly totals track the rate.
    const expected = clicks * conversionRate(date) * cvrMix * (0.8 + rng.next() * 0.4) + carry;
    const bookings = Math.max(0, Math.min(clicks, Math.floor(expected)));
    carry = expected - bookings;
    let valueCents = 0;
    for (let i = 0; i < bookings; i++) valueCents += Math.round(avgBookingValueCents(date) * (0.75 + rng.next() * 0.5));
    // Site-wide sessions: the paid visits plus the organic, direct and referral traffic around them, which
    // together run several times paid and grow with the program. New visitors are a share of those sessions
    // and never more than all of them; pageviews come from a per-session rate. Storing both denominators is
    // what lets a range compute pages per visit correctly instead of averaging daily averages.
    const siteSessions = websiteVisits + rng.poisson(clicks * 6.4 * (0.9 + rng.next() * 0.2) + 18 * demandMultiplier(date));
    const newVisitors = Math.min(siteSessions, rng.poisson(siteSessions * (0.66 + rng.next() * 0.08)));
    const pageviews = Math.round(siteSessions * Math.min(5, Math.max(2.2, rng.normal(3.4, 0.28))));
    const pagesPerSession = siteSessions ? Math.round((pageviews / siteSessions) * 100) / 100 : 0;
    return { date, impressions, clicks, websiteVisits, bookings, bookingValue: cents(valueCents), newVisitors, siteSessions, pageviews, pagesPerSession, spend: 0 };
  });
}

function weightsFor(dim: Dimension, date: string): number[] {
  if (dim === "campaign") return campaignPlan(date).map((p) => p.weight);
  const years = (daysBetween(WINDOW.start, date) - 1) / 365;
  const weekend = dayOfWeek(date) === 5 || dayOfWeek(date) === 6;
  return DIMENSION_DEFS[dim].map((d) => {
    let w = d.weight * (1 + (d.drift ?? 0) * years);
    if (weekend && d.weekendBoost) w *= 1 + d.weekendBoost;
    return w;
  });
}

/**
 * Step 2: split each day's totals across dimension values. Campaigns go first
 * because spend is priced per campaign click; the day's spend is the sum, and
 * devices and markets then split that spend by their clicks. Every metric,
 * spend included, sums exactly to the day.
 */
export function generateBreakdowns(rng: Rng, daily: DailyMetricRow[]): BreakdownRow[] {
  const rows: BreakdownRow[] = [];
  for (const day of daily) {
    const plan = campaignPlan(day.date);
    let daySpendCents = 0;
    for (const dimension of DIMENSIONS) {
      const defs = DIMENSION_DEFS[dimension];
      const jitter = defs.map(() => 0.85 + rng.next() * 0.3);
      const impW = weightsFor(dimension, day.date).map((w, i) => w * jitter[i]);
      const impressions = apportion(day.impressions, impW);
      const ctrW = dimension === "campaign" ? plan.map((p) => p.ctr) : defs.map((d) => d.ctr);
      const cvrW = dimension === "campaign" ? plan.map((p) => p.cvr) : defs.map((d) => d.cvr);
      // Impressions are hundreds a day: exact remainder split. Clicks and bookings are small counts:
      // weighted draws, so light markets and campaigns still win their share over a month.
      const clicks = apportionByDraw(day.clicks, impressions.map((n, i) => n * ctrW[i]), rng.next, impressions);
      const bookings = apportionByDraw(day.bookings, clicks.map((n, i) => n * cvrW[i]), rng.next, clicks);
      const valueCents = apportion(Math.round(day.bookingValue * 100), bookings.map((n, i) => n * defs[i].valueMult));
      let spendCents: number[];
      if (dimension === "campaign") {
        spendCents = clicks.map((n, i) => Math.round(n * (defs[i].cpcCents ?? 0) * (0.9 + rng.next() * 0.2)));
        daySpendCents = spendCents.reduce((s, c) => s + c, 0);
        day.spend = cents(daySpendCents);
      } else {
        spendCents = apportion(daySpendCents, clicks);
      }
      defs.forEach((d, i) => {
        if (d.startsOn && day.date < d.startsOn) return; // campaign not launched yet
        rows.push({ date: day.date, dimension, dimensionValue: d.label, impressions: impressions[i], clicks: clicks[i], bookings: bookings[i], bookingValue: cents(valueCents[i]), spend: cents(spendCents[i]) });
      });
    }
  }
  return rows;
}

export function generateCampaigns(): CampaignRow[] {
  return CAMPAIGN_META.map((m) => {
    const def = DIMENSION_DEFS.campaign.find((d) => d.label === m.name);
    if (!def) throw new Error(`CAMPAIGN_META has no dimension def: ${m.name}`);
    return { name: m.name, objective: m.objective, focus: m.focus, launchedOn: def.startsOn ?? WINDOW.start, status: m.status, monthlyBudget: m.monthlyBudget };
  });
}

export function generateEvents(): CampaignEventRow[] {
  return EVENTS.map((e) => ({ id: e.id, date: e.date, campaignName: e.campaign, kind: e.kind, title: e.title, note: e.note }));
}

export function generateAll(seed = SEED) {
  const rng = makeRng(seed);
  const daily = generateDaily(rng);
  const breakdowns = generateBreakdowns(rng, daily); // also fills daily[].spend
  return { daily, breakdowns, campaigns: generateCampaigns(), events: generateEvents() };
}
export type SeedData = ReturnType<typeof generateAll>;
