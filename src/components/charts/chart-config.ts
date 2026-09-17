import type { ChartConfig } from "@/components/ui/chart";
import type { DateRange } from "@/lib/date-range";

/** One coloured series, comparisons in grey: the emphasis form (D26). Tokens only. */
export const trendChartConfig = {
  current: { label: "This period", color: "var(--chart-1)" },
  previous: { label: "Previous period", color: "var(--chart-2)" }, // amber
  lastYear: { label: "Same period last year", color: "var(--chart-3)" },
} satisfies ChartConfig;

/**
 * The six trend series, in the order the picker lists them.
 *
 * Declared here rather than imported from `@/lib/db/queries`: `MetricSelect` and `TrendChart`
 * are client components, so a value import of `TREND_METRICS` would pull Drizzle and the
 * postgres client into the browser bundle, and `tests/architecture.test.ts` forbids any
 * `@/lib/db` import under `src/components`. Drift is not silent: the charts test asserts
 * `METRIC_ORDER` equals the query layer's `TREND_METRICS` and that `ChartMetric` and
 * `ChartPoint` are exactly `TrendMetric` and `TrendPoint`.
 */
export const METRIC_ORDER = [
  "booking_value",
  "bookings",
  "clicks",
  "impressions",
  "website_visits",
  "new_visitors",
] as const;

/** Structurally the query layer's `TrendMetric`. */
export type ChartMetric = (typeof METRIC_ORDER)[number];

/** Structurally the query layer's `TrendPoint`: one bucket, this period and its two baselines. */
export interface ChartPoint {
  bucket: string;
  current: number;
  previous: number | null;
  lastYear: number | null;
}

/** Plain language, no acronyms: what an innkeeper would call each of the six series. */
export const METRIC_LABELS: Record<ChartMetric, string> = {
  booking_value: "Booking value",
  bookings: "Direct bookings",
  clicks: "Clicked to your website",
  impressions: "People reached",
  website_visits: "Website visits",
  new_visitors: "New visitors",
};

export const metricKind = (m: ChartMetric): "money" | "count" => (m === "booking_value" ? "money" : "count");

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Legend and table wording for the comparison series, from the range itself (so year-to-date never claims
 * "the previous 260 days"). Last year is a third line only when it is a different window from the previous
 * period: for 30 and 90 days it is a seasonal check; for year-to-date and 12 months the two coincide.
 */
export function comparisonLabels(range: Pick<DateRange, "preset" | "comparison">): { prevLabel: string | null; lastYearLabel: string | null } {
  const c = range.comparison;
  if (!c) return { prevLabel: null, lastYearLabel: null };
  const seasonal = range.preset === "30d" || range.preset === "90d";
  return { prevLabel: cap(c.prevLabel), lastYearLabel: seasonal ? cap(c.lastYearLabel) : null };
}
