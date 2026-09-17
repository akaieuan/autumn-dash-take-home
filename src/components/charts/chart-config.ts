import type { ChartConfig } from "@/components/ui/chart";

/** One coloured series, comparisons in grey: the emphasis form (D26). Tokens only. */
export const trendChartConfig = {
  current: { label: "This period", color: "var(--chart-1)" },
  previous: { label: "Previous period", color: "var(--chart-2)" },
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
