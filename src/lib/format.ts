import type { Granularity } from "./date-range";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usdExact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const int = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** Whole dollars from integer cents: 1868500 → "$18,685". */
export const money = (cents: number) => usd.format(Math.round(cents / 100));

/** Cents to the cent: "$0.07", "$8.50". For per-unit money, where rounding to a dollar would say "$0". */
export const moneyExact = (cents: number) => usdExact.format(cents / 100);

/** A whole count with thousands separators: 12345 → "12,345". */
export const count = (n: number) => int.format(Math.round(n));

const trim = (v: number, d: number) => String(Number(v.toFixed(d)));

/** 12400 → "12.4k", 1250000 → "1.25M", 950 → "950". */
export function compact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${trim(n / 1_000_000, 2)}M`;
  if (abs >= 1_000) return `${trim(n / 1_000, 1)}k`;
  return String(Math.round(n));
}

export const moneyCompact = (cents: number) => `${cents < 0 ? "-" : ""}$${compact(Math.abs(cents) / 100)}`;

export const pct = (fraction: number, digits = 0) => `${(fraction * 100).toFixed(digits)}%`;

export function delta(current: number, previous: number | null): { pct: number | null; direction: "up" | "down" | "flat" } {
  if (previous === null) return { pct: null, direction: "flat" };
  if (previous === 0) return { pct: null, direction: current > 0 ? "up" : "flat" };
  const p = Math.round(((current - previous) / previous) * 100);
  return { pct: p, direction: p > 0 ? "up" : p < 0 ? "down" : "flat" };
}

/** "+18% vs the previous 30 days" · "No change vs last year" · null when there is no baseline. */
export function deltaText(current: number, previous: number | null, vsLabel: string): string | null {
  const d = delta(current, previous);
  if (d.pct === null) return null;
  if (d.pct === 0) return `No change vs ${vsLabel}`;
  return `${d.pct > 0 ? "+" : ""}${d.pct}% vs ${vsLabel}`;
}

/** 0.083 → "1 in 12". Plain-language click-through and conversion. */
export const oneIn = (rate: number) => (rate <= 0 ? "none" : `1 in ${Math.round(1 / rate)}`);

/** "the previous 30 days" → "The previous 30 days". Sentence case for a phrase written lower-case. */
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** A spoken rank: 1 → "1st", 11 → "11th", 21 → "21st", 112 → "112th". */
export const ordinal = (n: number) => {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
};

/** "4.2×", but "3×" when the decimal says nothing. */
export const times = (ratio: number) => `${ratio.toFixed(1).replace(/\.0$/, "")}×`;

/** Pages per visit, always to one decimal so 3 reads as "3.0" beside a 3.4. */
export const perVisit = (pages: number) => pages.toFixed(1);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const parts = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return { y, m, d }; };
/** US date voice throughout, the way the seeded property's owner reads a date: "Sep 1". */
export const shortDate = (iso: string) => { const { m, d } = parts(iso); return `${MONTHS[m - 1]} ${d}`; };
export const longDate = (iso: string) => { const { y, m, d } = parts(iso); return `${MONTHS[m - 1]} ${d}, ${y}`; };
/** "Sep" — the month a calendar column starts in. */
export const monthShort = (iso: string) => MONTHS[parts(iso).m - 1];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** "Tue, Sep 1" — how a hovered calendar day reads. Weekday from the ISO date in UTC, never the wall clock. */
export const weekdayDate = (iso: string) => { const { y, m, d } = parts(iso); return `${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}, ${shortDate(iso)}`; };
export const weekdayShort = (row: number) => WEEKDAYS[row] ?? "";
export function bucketLabel(iso: string, g: Granularity): string {
  const { y, m } = parts(iso);
  if (g === "month") return `${MONTHS[m - 1]} ${y}`;
  if (g === "week") return `Wk of ${shortDate(iso)}`;
  return shortDate(iso);
}

/** "Aug 18 – Sep 16, 2026"; both years spelled out when the range crosses one. */
export function rangeLabel(from: string, to: string): string {
  return parts(from).y === parts(to).y ? `${shortDate(from)} – ${longDate(to)}` : `${longDate(from)} – ${longDate(to)}`;
}
