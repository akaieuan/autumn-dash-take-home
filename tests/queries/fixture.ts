import type { TestDb } from "./setup";
import { breakdowns, campaignEvents, campaigns, dailyMetrics } from "@/lib/db/schema";

/**
 * Hand-built days. Current window 2026-09-01..09-10; previous 2026-08-22..08-31; last year 2025-09-01..09-10.
 * Every expected value in the query tests is computed by hand from these rows, never by the code under test.
 */
export const FIXTURE_RANGE = {
  preset: "30d" as const, from: "2026-09-01", to: "2026-09-10", days: 10, granularity: "day" as const, label: "Test",
  comparison: { prevFrom: "2026-08-22", prevTo: "2026-08-31", prevLabel: "prev", lastYearFrom: "2025-09-01", lastYearTo: "2025-09-10", lastYearLabel: "ly" },
};

/**
 * A second window, July 2026, added 2026-09-17 for the segment DTOs (markets, campaigns, funnel).
 * It is disjoint from every window above, so no existing expectation moves. Current 2026-07-08..07-17
 * (last seven days 07-11..07-17, which is what the campaign `live` flag reads); previous
 * 2026-06-28..07-07; last year 2025-07-08..07-17, which has no rows at all.
 *
 * Daily totals in the window: impressions 3500, clicks 380, website visits 361, bookings 12,
 * booking value 2300.00, new visitors 1500, pages per session (3.0 + 2.0 + 4.0) / 3 = 3.0.
 * Breakdown rows in the same window sum to 3000 / 300 / 10 / 2000.00 instead, because 2026-07-13
 * deliberately has no breakdown rows. That gap is what proves a total read from `daily_metrics`.
 */
export const SEGMENT_RANGE = {
  preset: "30d" as const, from: "2026-07-08", to: "2026-07-17", days: 10, granularity: "day" as const, label: "Segments",
  comparison: { prevFrom: "2026-06-28", prevTo: "2026-07-07", prevLabel: "prev", lastYearFrom: "2025-07-08", lastYearTo: "2025-07-17", lastYearLabel: "ly" },
};

const day = (date: string, impressions: number, clicks: number, websiteVisits: number, bookings: number, bookingValue: number, newVisitors: number, pagesPerSession: number, spend = 0) =>
  ({ date, impressions, clicks, websiteVisits, bookings, bookingValue, newVisitors, pagesPerSession, spend });
const bd = (date: string, dimension: "campaign" | "device" | "feeder_market", dimensionValue: string, impressions: number, clicks: number, bookings: number, bookingValue: number, spend = 0) =>
  ({ date, dimension, dimensionValue, impressions, clicks, bookings, bookingValue, spend });

export async function loadFixture(db: TestDb) {
  await db.insert(campaigns).values([
    { name: "Brand Protection", objective: "Keep you first on your name.", focus: "Your name.", launchedOn: "2024-09-17", status: "live", monthlyBudget: 350 },
    { name: "Discovery & Competitors", objective: "Reach new travellers.", focus: "Lake stays.", launchedOn: "2024-09-17", status: "live", monthlyBudget: 900 },
  ]);
  await db.insert(campaignEvents).values([
    // Impact (days = 6) hand-computed from the Brand Protection rows below: before 08-30..09-04 = 09-02 row; after 09-05..09-10 = 09-05 + 09-10 rows.
    { id: 1, date: "2026-09-05", campaignName: "Brand Protection", kind: "copy_refresh", title: "Brand ads refreshed", note: "New headline." },
    // Program-wide: impact (days = 7) reads daily_metrics: before 08-18..08-24 = the 08-21 row; after 08-25..08-31 = the 08-25 row.
    { id: 2, date: "2026-08-25", campaignName: null, kind: "seasonal_push", title: "Late-summer push", note: "Budgets raised." },
    { id: 3, date: "2026-07-09", campaignName: "Discovery & Competitors", kind: "bid_change", title: "Chicago weekend bids", note: "Raised." },
  ]);
  await db.insert(dailyMetrics).values([
    // current: imp 5000, clk 600, visits 582, bookings 3, value 1250.50, new 2700, pps mean 3.5
    day("2026-09-02", 1000, 100, 97, 2, 800.0, 500, 3.0, 10.0),
    day("2026-09-05", 3000, 300, 290, 1, 450.5, 1500, 4.0, 30.0),
    day("2026-09-10", 1000, 200, 195, 0, 0, 700, 3.5, 5.0),
    // previous
    day("2026-08-25", 500, 50, 50, 1, 300.0, 200, 3.2),
    // last year
    day("2025-09-03", 400, 40, 40, 2, 500.0, 150, 3.1),
    // outside every window
    day("2026-08-21", 99999, 9999, 9999, 99, 99999.99, 9999, 4.9),
    day("2026-09-11", 99999, 9999, 9999, 99, 99999.99, 9999, 4.9),
    // --- SEGMENT_RANGE (2026-07-08..07-17), added 2026-09-17 ---
    day("2026-07-09", 2000, 200, 190, 6, 1200.0, 900, 3.0),  // apportioned across all three dimensions
    day("2026-07-15", 1000, 100, 95, 4, 800.0, 400, 4.0),    // inside the last seven days of the range
    day("2026-07-13", 500, 80, 76, 2, 300.0, 200, 2.0),      // NO breakdown rows: the daily/breakdown gap
    // SEGMENT_RANGE's previous window
    day("2026-07-03", 800, 80, 76, 3, 600.0, 300, 3.5),
  ]);
  await db.insert(breakdowns).values([
    // campaign, current: Brand Protection imp 1500 clk 260 bk 2 val 950.50 · Discovery imp 3500 clk 340 bk 1 val 300.00
    bd("2026-09-02", "campaign", "Brand Protection", 300, 60, 1, 500.0, 4.0), bd("2026-09-02", "campaign", "Discovery & Competitors", 700, 40, 1, 300.0, 6.0),
    bd("2026-09-05", "campaign", "Brand Protection", 1000, 150, 1, 450.5, 12.0), bd("2026-09-05", "campaign", "Discovery & Competitors", 2000, 150, 0, 0, 18.0),
    bd("2026-09-10", "campaign", "Brand Protection", 200, 50, 0, 0, 1.0), bd("2026-09-10", "campaign", "Discovery & Competitors", 800, 150, 0, 0, 4.0),
    // campaign, previous: only Brand Protection ran
    bd("2026-08-25", "campaign", "Brand Protection", 500, 50, 1, 300.0),
    // device, current (one day only)
    bd("2026-09-02", "device", "Mobile", 600, 60, 1, 500.0), bd("2026-09-02", "device", "Desktop", 400, 40, 1, 300.0),
    // outside window
    bd("2026-09-11", "campaign", "Brand Protection", 99999, 9999, 99, 99999.99),

    // --- SEGMENT_RANGE rows (added 2026-09-17). Each day is apportioned exactly: every dimension
    // sums back to that day's daily_metrics row, except 2026-07-13, which has none on purpose.
    // campaign totals 07-08..07-17: Brand Protection 1400 / 190 / 7 / 1500.00 (runs 07-15, inside
    // 07-11..07-17 → live) · Google Hotel Ads 1200 / 80 / 2 / 300.00 (07-09 only → not live) ·
    // Summer Newsletter 400 / 30 / 1 / 200.00 (not a seeded campaign → glossary key null).
    bd("2026-07-09", "campaign", "Brand Protection", 800, 120, 4, 900.0), bd("2026-07-09", "campaign", "Google Hotel Ads", 1200, 80, 2, 300.0),
    bd("2026-07-15", "campaign", "Brand Protection", 600, 70, 3, 600.0), bd("2026-07-15", "campaign", "Summer Newsletter", 400, 30, 1, 200.0),
    bd("2026-07-03", "campaign", "Brand Protection", 500, 50, 2, 400.0), bd("2026-07-03", "campaign", "Google Hotel Ads", 300, 30, 1, 200.0),
    // device totals 07-08..07-17: Mobile 1700 / 160 / 5 / 1000.00 · Desktop 1100 / 120 / 4 / 800.00
    // · Tablet 200 / 20 / 1 / 200.00. Clicks 160 + 120 + 20 = 300, so the shares are 160/300, 120/300, 20/300.
    bd("2026-07-09", "device", "Mobile", 1200, 120, 4, 800.0), bd("2026-07-09", "device", "Desktop", 800, 80, 2, 400.0),
    bd("2026-07-15", "device", "Mobile", 500, 40, 1, 200.0), bd("2026-07-15", "device", "Desktop", 300, 40, 2, 400.0), bd("2026-07-15", "device", "Tablet", 200, 20, 1, 200.0),
    bd("2026-07-03", "device", "Mobile", 500, 50, 2, 400.0), bd("2026-07-03", "device", "Desktop", 300, 30, 1, 200.0),
    // feeder_market totals 07-08..07-17: Chicago 1400 / 150 / 5 / 1100.00 · Grand Rapids 800 / 80 / 3
    // / 500.00 · Detroit 500 / 40 / 2 / 400.00 · Other 300 / 30 / 0 / 0. Previous window (07-03):
    // Chicago 40 clicks, Grand Rapids 20, Detroit none, Other 20.
    bd("2026-07-09", "feeder_market", "Chicago, IL", 900, 100, 3, 700.0), bd("2026-07-09", "feeder_market", "Grand Rapids, MI", 500, 50, 2, 300.0),
    bd("2026-07-09", "feeder_market", "Detroit, MI", 400, 30, 1, 200.0), bd("2026-07-09", "feeder_market", "Other", 200, 20, 0, 0),
    bd("2026-07-15", "feeder_market", "Chicago, IL", 500, 50, 2, 400.0), bd("2026-07-15", "feeder_market", "Grand Rapids, MI", 300, 30, 1, 200.0),
    bd("2026-07-15", "feeder_market", "Detroit, MI", 100, 10, 1, 200.0), bd("2026-07-15", "feeder_market", "Other", 100, 10, 0, 0),
    bd("2026-07-03", "feeder_market", "Chicago, IL", 400, 40, 2, 400.0), bd("2026-07-03", "feeder_market", "Grand Rapids, MI", 200, 20, 1, 200.0),
    bd("2026-07-03", "feeder_market", "Other", 200, 20, 0, 0),
  ]);
}
