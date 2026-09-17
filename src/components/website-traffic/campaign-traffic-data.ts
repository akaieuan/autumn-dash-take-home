import type { CampaignSeriesDto } from "@/lib/db/queries";
import { addDays } from "@/lib/date-range";
import { bucketLabel, shortDate } from "@/lib/format";
import type { MarkerEvent } from "./event-marker";

/**
 * The arithmetic behind the campaign traffic chart and its table twin: which day a bucket ends on,
 * which bucket a date falls in, how several changes on one bucket become one mark, and the rows
 * Recharts is handed. Pure and React-free, so `tests/components/traffic-campaigns.test.tsx` can
 * prove each rule without rendering a chart (design audit item 9).
 */

/**
 * The last day a bucket covers: the day before the next bucket starts, or the range's own last day.
 * `bucketEnd` lives in the query layer, which a component may not import, so it is derived here.
 */
export const bucketSpan = (buckets: string[], i: number, to: string): string =>
  i + 1 < buckets.length ? addDays(buckets[i + 1], -1) : to;

/** Recharts reads a campaign's values under a positional key, so a renamed campaign never renames a series. */
export const keyOf = (i: number) => `s${i}`;

/** Bucket start containing a date, from the chart's own bucket list; a date before the first falls on the first. */
export const bucketOf = (buckets: string[], date: string): string => buckets.reduce((hit, b) => (b <= date ? b : hit), buckets[0]);

export interface ChartRow {
  label: string;
  /** The days the bucket covers, for the tooltip's title: one day, or "Sep 1 – Sep 7". */
  span: string;
  total: number;
  [series: string]: string | number;
}

/** One row per bucket: its label, the days it covers, every campaign's value and the all-campaigns total. */
export function chartRows(data: CampaignSeriesDto, rangeTo: string): ChartRow[] {
  const { buckets, series, granularity } = data;
  return buckets.map((b, i) => {
    const end = bucketSpan(buckets, i, rangeTo);
    return {
      label: bucketLabel(b, granularity),
      span: granularity === "day" || end === b ? shortDate(b) : `${shortDate(b)} – ${shortDate(end)}`,
      total: series.reduce((s, c) => s + (c.values[i] ?? 0), 0),
      ...Object.fromEntries(series.map((s, si) => [keyOf(si), s.values[i] ?? 0])),
    };
  });
}

/** Several changes on one bucket share one line; the marker then carries their count. */
export function marksByBucket(events: CampaignSeriesDto["events"]): [string, MarkerEvent[]][] {
  const byBucket = new Map<string, MarkerEvent[]>();
  for (const e of events) byBucket.set(e.bucket, [...(byBucket.get(e.bucket) ?? []), { id: e.id, kindLabel: e.kindLabel, title: e.title }]);
  return [...byBucket.entries()];
}

/**
 * The buckets a picked change's after-window covers. The window is measured in days and can run past
 * the chart, so it is clipped to the range's own end before it becomes a shaded band.
 */
export function highlightSpan(buckets: string[], highlight: { from: string; to: string }, rangeTo: string): { from: string; to: string } {
  return { from: bucketOf(buckets, highlight.from), to: bucketOf(buckets, highlight.to < rangeTo ? highlight.to : rangeTo) };
}
