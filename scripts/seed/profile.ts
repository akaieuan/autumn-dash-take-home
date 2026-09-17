import { dayOfWeek, daysBetween } from "@/lib/date-range";

export const SEED = 20260917;
export const WINDOW = { start: "2024-09-17", end: "2026-09-16" } as const; // 730 days
export const PROPERTY = { name: "Harbor House Inn", city: "South Haven", region: "Michigan", roomCount: 22, feeRateBps: 1500 } as const;

// Search demand for a Lake Michigan inn, by month (Jan..Dec). July is the peak; October is fall colour.
const SEASON = [0.42, 0.45, 0.52, 0.62, 0.8, 0.95, 1.0, 0.96, 0.8, 0.72, 0.48, 0.46];
// Planning happens early in the week and on Fridays; Saturday is the lowest search day.
const WEEKDAY = [1.02, 1.06, 1.0, 0.98, 1.0, 1.08, 0.86];
const HOLIDAYS: Record<string, number> = {
  "05-23": 1.25, "05-24": 1.3, "05-25": 1.2, "07-02": 1.25, "07-03": 1.35, "07-04": 1.3,
  "08-29": 1.25, "08-30": 1.3, "09-01": 1.15, "11-27": 1.1, "11-28": 1.15, "12-26": 1.35, "12-27": 1.35, "12-28": 1.3, "12-29": 1.3, "12-30": 1.3,
};

const month = (iso: string) => Number(iso.slice(5, 7)) - 1;

/** Season × weekday × holiday. Dimensionless; 1.0 is a July weekday. */
export function demandMultiplier(iso: string): number {
  return SEASON[month(iso)] * WEEKDAY[dayOfWeek(iso)] * (HOLIDAYS[iso.slice(5)] ?? 1);
}

/** Program maturity: campaigns take about eight weeks to reach full delivery. */
export function ramp(iso: string): number {
  const d = daysBetween(WINDOW.start, iso) - 1;
  return Math.min(1, 0.35 + (0.65 * d) / 56);
}

/** Year-over-year growth as the program learns: +22% per year, compounding daily. */
export function growth(iso: string): number {
  return Math.pow(1.22, (daysBetween(WINDOW.start, iso) - 1) / 365);
}

/** Average value of one booking (ADR × typical stay), in cents, by season; weekends stay longer. */
export function avgBookingValueCents(iso: string): number {
  const s = SEASON[month(iso)];
  const adr = 15000 + (26500 - 15000) * ((s - 0.42) / 0.58);
  const nights = dayOfWeek(iso) === 5 || dayOfWeek(iso) === 6 ? 2.3 : 1.9;
  return Math.round(adr * nights);
}

/** Share of ad clicks that turn into a booking. Shoulder seasons convert best (fewer lookers, more planners). */
export function conversionRate(iso: string): number {
  const m = month(iso);
  return [0.03, 0.031, 0.034, 0.04, 0.045, 0.043, 0.04, 0.041, 0.046, 0.044, 0.034, 0.032][m];
}

export const BASE_IMPRESSIONS_PER_DAY = 175; // at a July weekday, all four campaigns live, fully ramped, year one, no event effects
export const CLICK_THROUGH_RATE = 0.16;      // reference dashboard shows 17% blended

export interface DimensionDef {
  label: string;
  /** Share of impressions, before start-date gating and drift. */
  weight: number;
  /** Relative click-through vs the blended rate (1 = average). */
  ctr: number;
  /** Relative conversion vs the blended rate. */
  cvr: number;
  /** Relative booking value vs the day's average. */
  valueMult: number;
  /** First day this value exists (campaigns launch in stages). */
  startsOn?: string;
  /** Per-year drift in weight, as a fraction (mobile share grows). */
  drift?: number;
  /** Extra weight on Fri/Sat (Chicago books weekends). */
  weekendBoost?: number;
  /** Cost per click in cents (campaigns only). */
  cpcCents?: number;
}

export const DIMENSION_DEFS: Record<"campaign" | "device" | "feeder_market", DimensionDef[]> = {
  campaign: [
    { label: "Brand Protection", weight: 14, ctr: 1.85, cvr: 1.8, valueMult: 1.05, cpcCents: 95 },
    { label: "Discovery & Competitors", weight: 62, ctr: 0.62, cvr: 0.6, valueMult: 0.95, cpcCents: 165 },
    { label: "Google Hotel Ads", weight: 17, ctr: 1.1, cvr: 1.3, valueMult: 1.1, startsOn: "2024-11-04", cpcCents: 210 },
    { label: "Retargeting", weight: 7, ctr: 0.7, cvr: 1.5, valueMult: 1.0, startsOn: "2024-12-02", cpcCents: 120 },
  ],
  device: [
    { label: "Mobile", weight: 58, ctr: 1.05, cvr: 0.85, valueMult: 0.92, drift: 0.03 },
    { label: "Desktop", weight: 35, ctr: 0.95, cvr: 1.3, valueMult: 1.15, drift: -0.03 },
    { label: "Tablet", weight: 7, ctr: 0.9, cvr: 0.9, valueMult: 1.0 },
  ],
  feeder_market: [
    { label: "Chicago, IL", weight: 34, ctr: 1.05, cvr: 1.15, valueMult: 1.08, weekendBoost: 0.25 },
    { label: "Grand Rapids, MI", weight: 14, ctr: 1.0, cvr: 1.0, valueMult: 0.9 },
    { label: "Detroit, MI", weight: 12, ctr: 1.0, cvr: 1.0, valueMult: 1.0 },
    { label: "Indianapolis, IN", weight: 9, ctr: 0.95, cvr: 0.95, valueMult: 1.05 },
    { label: "Milwaukee, WI", weight: 7, ctr: 0.95, cvr: 0.9, valueMult: 1.0 },
    { label: "Kalamazoo, MI", weight: 6, ctr: 1.1, cvr: 1.1, valueMult: 0.8 },
    { label: "Columbus, OH", weight: 4, ctr: 0.9, cvr: 0.9, valueMult: 1.1 },
    { label: "St. Louis, MO", weight: 3, ctr: 0.9, cvr: 0.85, valueMult: 1.1 },
    { label: "Toronto, ON", weight: 3, ctr: 0.85, cvr: 0.8, valueMult: 1.2 },
    { label: "Other", weight: 8, ctr: 0.8, cvr: 0.7, valueMult: 1.0 },
  ],
};

/** Sum of campaign base weights; a day at full launch runs at BASE_IMPRESSIONS_PER_DAY × demand × ramp × growth. */
export const CAMPAIGN_WEIGHT_TOTAL = DIMENSION_DEFS.campaign.reduce((s, d) => s + d.weight, 0);

/** What each campaign is for, in the owner's words. `name` matches the breakdown label. */
export const CAMPAIGN_META: { name: string; objective: string; focus: string; status: "live" | "paused"; monthlyBudget: number }[] = [
  { name: "Brand Protection", objective: "Keep you first when guests search your hotel's name, so an OTA doesn't take a booking that was already yours.", focus: "Searches for \"Harbor House Inn\" and close misspellings, all markets.", status: "live", monthlyBudget: 350 },
  { name: "Discovery & Competitors", objective: "Reach travellers planning a Lake Michigan stay who don't know you yet.", focus: "Searches like \"South Haven inn\" and \"Lake Michigan B&B\"; Chicago, Grand Rapids and Detroit first.", status: "live", monthlyBudget: 900 },
  { name: "Google Hotel Ads", objective: "Show your direct rate next to the OTA prices on Google Hotels, so guests book with you.", focus: "Google Hotels listings for South Haven dates; direct rate pinned first.", status: "live", monthlyBudget: 550 },
  { name: "Retargeting", objective: "Bring back people who visited your site and didn't book.", focus: "Recent site visitors and past guests, shown on Google and partner sites.", status: "live", monthlyBudget: 150 },
];

export type EventKind = "launched" | "budget_change" | "copy_refresh" | "bid_change" | "seasonal_push";
export interface SeedEvent {
  id: number; date: string; campaign: string | null; kind: EventKind; title: string; note: string;
  /** Multipliers applied from `date` onward (or for `days` days) to the campaign, or to every campaign when program-wide. */
  effect?: { impressions?: number; ctr?: number; cvr?: number; days?: number };
}

/**
 * What Autumn did, in order. The generator applies each event's effect from its
 * date, so a budget raise visibly lifts that campaign's impressions and a copy
 * refresh lifts its click-through. Events cause the data, not the other way round.
 */
export const EVENTS: SeedEvent[] = [
  { id: 1, date: "2024-09-17", campaign: null, kind: "launched", title: "Autumn started running your ads", note: "Brand Protection and Discovery went live. Campaigns take about eight weeks to reach full delivery." },
  { id: 2, date: "2024-10-14", campaign: "Discovery & Competitors", kind: "copy_refresh", title: "Discovery ads now lead with lakefront rooms", note: "Headlines rewritten around the view and the walk to the beach after the first four weeks of search data.", effect: { ctr: 1.08 } },
  { id: 3, date: "2024-11-04", campaign: "Google Hotel Ads", kind: "launched", title: "Google Hotel Ads switched on", note: "Your direct rate now shows beside the OTA prices on Google Hotels." },
  { id: 4, date: "2024-11-25", campaign: null, kind: "seasonal_push", title: "Holiday-week push", note: "Budgets raised across all campaigns from Thanksgiving through New Year's.", effect: { impressions: 1.2, days: 40 } },
  { id: 5, date: "2024-12-02", campaign: "Retargeting", kind: "launched", title: "Reminders switched on", note: "People who visited your site without booking now see a reminder for two weeks." },
  { id: 6, date: "2025-01-13", campaign: "Discovery & Competitors", kind: "budget_change", title: "Winter budget trimmed", note: "Fewer people search for lake stays in January; spend moved down to match.", effect: { impressions: 0.85 } },
  { id: 7, date: "2025-02-10", campaign: "Brand Protection", kind: "bid_change", title: "Bids raised on your name", note: "An OTA started bidding on \"Harbor House Inn\". Bids were raised so you stay first.", effect: { impressions: 1.15, ctr: 1.06 } },
  { id: 8, date: "2025-03-17", campaign: null, kind: "copy_refresh", title: "Spring photos across all ads", note: "New images from the March shoot replaced the winter set.", effect: { ctr: 1.04 } },
  { id: 9, date: "2025-04-14", campaign: "Discovery & Competitors", kind: "budget_change", title: "Summer budget raised", note: "Discovery budget up ahead of the season while searches are still cheap.", effect: { impressions: 1.3 } },
  { id: 10, date: "2025-05-12", campaign: "Discovery & Competitors", kind: "bid_change", title: "Weekend bids raised for Chicago searches", note: "Chicago books weekends; bids now lean into Friday and Saturday searches from there.", effect: { cvr: 1.08 } },
  { id: 11, date: "2025-06-23", campaign: "Google Hotel Ads", kind: "budget_change", title: "Hotel Ads budget raised for peak season", note: "More of the comparison-shopping traffic in July and August.", effect: { impressions: 1.25 } },
  { id: 12, date: "2025-08-04", campaign: "Discovery & Competitors", kind: "copy_refresh", title: "Fall-colour headlines", note: "Discovery copy now mentions October colour and the lighthouse walk.", effect: { ctr: 1.05 } },
  { id: 13, date: "2025-09-15", campaign: "Discovery & Competitors", kind: "budget_change", title: "Post-Labor Day budget trimmed", note: "Spend eased as the season wound down.", effect: { impressions: 0.8 } },
  { id: 14, date: "2025-10-06", campaign: null, kind: "seasonal_push", title: "Fall-colour push", note: "All campaigns raised for the five weeks of peak colour.", effect: { impressions: 1.2, days: 35 } },
  { id: 15, date: "2025-11-24", campaign: null, kind: "seasonal_push", title: "Holiday-week push", note: "Budgets raised across all campaigns from Thanksgiving through New Year's.", effect: { impressions: 1.2, days: 40 } },
  { id: 16, date: "2026-01-12", campaign: "Retargeting", kind: "bid_change", title: "Reminders now reach past guests too", note: "Guests who stayed last year see a return offer when they browse for travel.", effect: { impressions: 1.3, cvr: 1.15 } },
  { id: 17, date: "2026-02-16", campaign: "Discovery & Competitors", kind: "budget_change", title: "Spring budget raised early", note: "Last year's data showed planning starts in February; budget moved up a month earlier than 2025.", effect: { impressions: 1.25 } },
  { id: 18, date: "2026-03-16", campaign: null, kind: "copy_refresh", title: "New photos from the spring shoot", note: "All ads refreshed with this year's images.", effect: { ctr: 1.04 } },
  { id: 19, date: "2026-04-20", campaign: "Google Hotel Ads", kind: "bid_change", title: "Direct rate pinned above the OTA prices", note: "Bids adjusted so your rate appears first in the Google Hotels comparison.", effect: { cvr: 1.12 } },
  { id: 20, date: "2026-05-18", campaign: null, kind: "seasonal_push", title: "Memorial Day push", note: "Two weeks of raised budgets into the long weekend.", effect: { impressions: 1.25, days: 14 } },
  { id: 21, date: "2026-06-22", campaign: "Discovery & Competitors", kind: "budget_change", title: "Peak-season budget", note: "Discovery budget at its highest for July and August.", effect: { impressions: 1.2 } },
  { id: 22, date: "2026-08-03", campaign: "Discovery & Competitors", kind: "copy_refresh", title: "Discovery ad copy refreshed", note: "New headlines lead with the direct-booking rate and free parking after competitors raised bids in July.", effect: { ctr: 1.15 } },
  { id: 23, date: "2026-08-31", campaign: null, kind: "seasonal_push", title: "Labor Day push", note: "Raised budgets over the long weekend.", effect: { impressions: 1.2, days: 10 } },
  { id: 24, date: "2026-09-08", campaign: "Brand Protection", kind: "bid_change", title: "Bids raised on your name again", note: "A second OTA began bidding on your name in September.", effect: { impressions: 1.1 } },
];

/** Product of every active event effect for a campaign on a date. Program-wide events apply to every campaign. */
export function eventMultipliers(campaign: string, date: string): { impressions: number; ctr: number; cvr: number } {
  const m = { impressions: 1, ctr: 1, cvr: 1 };
  for (const e of EVENTS) {
    if (!e.effect || date < e.date) continue;
    if (e.campaign !== null && e.campaign !== campaign) continue;
    if (e.effect.days !== undefined && daysBetween(e.date, date) > e.effect.days) continue;
    m.impressions *= e.effect.impressions ?? 1;
    m.ctr *= e.effect.ctr ?? 1;
    m.cvr *= e.effect.cvr ?? 1;
  }
  return m;
}
