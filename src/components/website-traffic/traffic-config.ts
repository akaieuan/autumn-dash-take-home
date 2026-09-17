/**
 * The three series the traffic chart can plot, and what an innkeeper calls them.
 *
 * Declared here rather than imported from `@/lib/db/queries`: the chart and its metric picker are
 * client components, and `tests/architecture.test.ts` forbids a value import of `@/lib/db` under
 * `src/components`. Drift is not silent — the test asserts this list equals `CampaignSeriesMetric`.
 */
export const TRAFFIC_METRICS = ["clicks", "impressions", "bookings"] as const;

/** Structurally the query layer's `CampaignSeriesMetric`. */
export type TrafficMetric = (typeof TRAFFIC_METRICS)[number];

export const TRAFFIC_METRIC_LABELS: Record<TrafficMetric, string> = {
  clicks: "Visits",
  impressions: "Saw your hotel",
  bookings: "Booked",
};

export const isTrafficMetric = (v: unknown): v is TrafficMetric =>
  typeof v === "string" && (TRAFFIC_METRICS as readonly string[]).includes(v);
