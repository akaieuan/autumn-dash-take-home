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

export const BASE_IMPRESSIONS_PER_DAY = 150; // at a July weekday, fully ramped, year one
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
}

export const DIMENSION_DEFS: Record<"campaign" | "device" | "feeder_market", DimensionDef[]> = {
  campaign: [
    { label: "Brand Protection", weight: 14, ctr: 1.85, cvr: 1.8, valueMult: 1.05 },
    { label: "Discovery & Competitors", weight: 62, ctr: 0.62, cvr: 0.6, valueMult: 0.95 },
    { label: "Google Hotel Ads", weight: 17, ctr: 1.1, cvr: 1.3, valueMult: 1.1, startsOn: "2024-11-04" },
    { label: "Retargeting", weight: 7, ctr: 0.7, cvr: 1.5, valueMult: 1.0, startsOn: "2024-12-02" },
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
