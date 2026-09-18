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

/** True when the previous-period and last-year windows are the same days (year to date, last 12 months). Show one comparison, not two. */
export const comparisonsCoincide = (r: Pick<DateRange, "comparison">): boolean =>
  !!r.comparison && r.comparison.prevFrom === r.comparison.lastYearFrom && r.comparison.prevTo === r.comparison.lastYearTo;

export function granularityFor(days: number): Granularity {
  if (days <= 31) return "day"; // 90 daily bars are noise; weeks read
  if (days <= 400) return "week";
  return "month";
}

/** Resolve a URL preset into concrete dates anchored on the last day that has data (never the wall clock). */
export function parseRange(param: string | undefined, dataMin: string, dataMax: string): DateRange {
  const preset: RangePreset = PRESETS.includes(param as RangePreset) ? (param as RangePreset) : "ytd";
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
  // Year to date and last 12 months are year-shaped: the only comparison an owner means is the same
  // span a year earlier. The days immediately before 1 January would run from spring to Christmas, a
  // different season, so for those presets both windows are last year and the page shows one line.
  const yearShaped = preset === "ytd" || preset === "12m";
  const lastYearFrom = addYears(from, -1), lastYearTo = addYears(to, -1);
  const lastYearLabel = preset === "ytd" ? "the same period last year" : preset === "12m" ? "the year before" : "this time last year";
  const comparison = preset === "all" ? null : {
    prevFrom: yearShaped ? lastYearFrom : addDays(from, -days),
    prevTo: yearShaped ? lastYearTo : addDays(from, -1),
    prevLabel: yearShaped ? lastYearLabel : `the previous ${days} days`,
    lastYearFrom, lastYearTo, lastYearLabel,
  };
  return { preset, from, to, days, granularity: granularityFor(days), label: LABELS[preset], comparison };
}
