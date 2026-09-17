import { pgTable, date, integer, numeric, text, uuid, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Two tables at two grains. `daily_metrics` is one row per day (the date is the
 * natural key). `breakdowns` is one row per day per dimension value and splits
 * that day's totals across campaigns, devices and feeder markets. Insights are
 * not stored: they are computed at render time from `daily_metrics`, so they can
 * never disagree with the numbers underneath them. See docs/decisions.md D21–D24.
 */
export const dailyMetrics = pgTable("daily_metrics", {
  date: date("date").primaryKey(),
  impressions: integer("impressions").notNull(),
  clicks: integer("clicks").notNull(),
  websiteVisits: integer("website_visits").notNull(),
  bookings: integer("bookings").notNull(),
  bookingValue: numeric("booking_value", { precision: 10, scale: 2, mode: "number" }).notNull(),
  newVisitors: integer("new_visitors").notNull(),
  pagesPerSession: numeric("pages_per_session", { precision: 4, scale: 2, mode: "number" }).notNull(),
});

export const DIMENSIONS = ["campaign", "device", "feeder_market"] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export const breakdowns = pgTable("breakdowns", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: date("date").notNull().references(() => dailyMetrics.date),
  dimension: text("dimension").$type<Dimension>().notNull(),
  dimensionValue: text("dimension_value").notNull(),
  impressions: integer("impressions").notNull(),
  clicks: integer("clicks").notNull(),
  bookings: integer("bookings").notNull(),
  bookingValue: numeric("booking_value", { precision: 10, scale: 2, mode: "number" }).notNull(),
}, (t) => [
  index("idx_breakdowns_date_dimension").on(t.date, t.dimension),
  check("breakdowns_dimension_check", sql`${t.dimension} in ('campaign', 'device', 'feeder_market')`),
]);

export const schema = { dailyMetrics, breakdowns };
export type DailyMetricRow = typeof dailyMetrics.$inferInsert;
export type BreakdownRow = typeof breakdowns.$inferInsert;
