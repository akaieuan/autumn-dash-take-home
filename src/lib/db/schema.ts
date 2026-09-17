import { pgTable, date, integer, numeric, text, uuid, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Two metric tables at two grains, plus two small reference tables.
 * `daily_metrics` is one row per day (the date is the natural key). `breakdowns`
 * is one row per day per dimension value and splits that day's totals across
 * campaigns, devices and feeder markets. `campaigns` holds what each campaign is
 * for; `campaign_events` records what Autumn did and when (launches, budget and
 * bid changes, copy refreshes, seasonal pushes), so before/after comparisons
 * have something to anchor on. Insights are not stored: they are computed at
 * render time, so they can never disagree with the numbers underneath them.
 * See docs/decisions.md D21–D28.
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
  /** What Autumn spent on ads that day, in dollars. Autumn funds it; the owner sees it for the cost-vs-return story. */
  spend: numeric("spend", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
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
  spend: numeric("spend", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
}, (t) => [
  index("idx_breakdowns_date_dimension").on(t.date, t.dimension),
  check("breakdowns_dimension_check", sql`${t.dimension} in ('campaign', 'device', 'feeder_market')`),
]);

/** One row per campaign. `name` matches `breakdowns.dimension_value` where `dimension = 'campaign'`. */
export const campaigns = pgTable("campaigns", {
  name: text("name").primaryKey(),
  objective: text("objective").notNull(),
  focus: text("focus").notNull(),
  launchedOn: date("launched_on").notNull(),
  status: text("status").$type<"live" | "paused">().notNull(),
  monthlyBudget: numeric("monthly_budget", { precision: 10, scale: 2, mode: "number" }).notNull(),
});

export const EVENT_KINDS = ["launched", "budget_change", "copy_refresh", "bid_change", "seasonal_push"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

/** What Autumn did, and when. `campaign_name` null = the whole program. The seed makes the numbers respond to these. */
export const campaignEvents = pgTable("campaign_events", {
  id: integer("id").primaryKey(),
  date: date("date").notNull(),
  campaignName: text("campaign_name").references(() => campaigns.name),
  kind: text("kind").$type<EventKind>().notNull(),
  title: text("title").notNull(),
  note: text("note").notNull(),
}, (t) => [
  index("idx_campaign_events_date").on(t.date),
  check("campaign_events_kind_check", sql`${t.kind} in ('launched', 'budget_change', 'copy_refresh', 'bid_change', 'seasonal_push')`),
]);

export const schema = { dailyMetrics, breakdowns, campaigns, campaignEvents };
export type DailyMetricRow = typeof dailyMetrics.$inferInsert;
export type BreakdownRow = typeof breakdowns.$inferInsert;
export type CampaignRow = typeof campaigns.$inferInsert;
export type CampaignEventRow = typeof campaignEvents.$inferInsert;
