import type { Granularity } from "./date-range";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** Whole dollars from integer cents: 1868500 → "$18,685". */
export const money = (cents: number) => usd.format(Math.round(cents / 100));

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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const parts = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return { y, m, d }; };
export const shortDate = (iso: string) => { const { m, d } = parts(iso); return `${d} ${MONTHS[m - 1]}`; };
export const longDate = (iso: string) => { const { y, m, d } = parts(iso); return `${d} ${MONTHS[m - 1]} ${y}`; };
export function bucketLabel(iso: string, g: Granularity): string {
  const { y, m } = parts(iso);
  if (g === "month") return `${MONTHS[m - 1]} ${y}`;
  if (g === "week") return `w/c ${shortDate(iso)}`;
  return shortDate(iso);
}
