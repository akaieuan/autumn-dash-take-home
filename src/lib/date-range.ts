export type RangePreset = "30d" | "90d" | "ytd" | "12m" | "all";
export type Granularity = "day" | "week" | "month";

export interface DateRange {
  preset: RangePreset;
  from: string;
  to: string;
  days: number;
  granularity: Granularity;
  label: string;
  comparison: {
    prevFrom: string; prevTo: string; prevLabel: string;
    lastYearFrom: string; lastYearTo: string; lastYearLabel: string;
  } | null;
}

/** The presets the range control offers, in the order it lists them (D3). */
export const RANGE_PRESETS: RangePreset[] = ["30d", "90d", "ytd", "12m", "all"];
const PRESETS = RANGE_PRESETS;
const LABELS: Record<RangePreset, string> = {
  "30d": "Last 30 days", "90d": "Last 90 days", ytd: "Year to date", "12m": "Last 12 months", all: "Since the beginning",
};

const toUTC = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return Date.UTC(y, m - 1, d); };
const fromUTC = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export const addDays = (iso: string, n: number) => fromUTC(toUTC(iso) + n * 86_400_000);
export const addYears = (iso: string, n: number) => { const [y, m, d] = iso.split("-").map(Number); return fromUTC(Date.UTC(y + n, m - 1, d)); };
/** Inclusive day count from a to b. */
export const daysBetween = (a: string, b: string) => Math.round((toUTC(b) - toUTC(a)) / 86_400_000) + 1;
/** 0 = Sunday … 6 = Saturday, in UTC. */
export const dayOfWeek = (iso: string) => new Date(toUTC(iso)).getUTCDay();
export function eachDay(start: string, end: string): string[] { const out: string[] = []; for (let d = start; d <= end; d = addDays(d, 1)) out.push(d); return out; }

export function granularityFor(days: number): Granularity {
  if (days <= 92) return "day";
  if (days <= 400) return "week";
  return "month";
}

/** Resolve a URL preset into concrete dates anchored on the last day that has data (never the wall clock). */
export function parseRange(param: string | undefined, dataMin: string, dataMax: string): DateRange {
  const preset: RangePreset = PRESETS.includes(param as RangePreset) ? (param as RangePreset) : "30d";
  const to = dataMax;
  let from: string;
  switch (preset) {
    case "30d": from = addDays(to, -29); break;
    case "90d": from = addDays(to, -89); break;
    case "ytd": from = `${to.slice(0, 4)}-01-01`; break;
    case "12m": from = addDays(to, -364); break;
    case "all": from = dataMin; break;
  }
  if (from < dataMin) from = dataMin;
  const days = daysBetween(from, to);
  const comparison = preset === "all" ? null : {
    prevTo: addDays(from, -1),
    prevFrom: addDays(from, -days),
    prevLabel: preset === "ytd" ? "the same period last year" : `the previous ${days} days`,
    lastYearFrom: addYears(from, -1),
    lastYearTo: addYears(to, -1),
    lastYearLabel: "this time last year",
  };
  return { preset, from, to, days, granularity: granularityFor(days), label: LABELS[preset], comparison };
}
