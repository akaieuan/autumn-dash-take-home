import type { TestDb } from "./setup";
import { breakdowns, dailyMetrics } from "@/lib/db/schema";

/**
 * Hand-built days. Current window 2026-09-01..09-10; previous 2026-08-22..08-31; last year 2025-09-01..09-10.
 * Every expected value in the query tests is computed by hand from these rows, never by the code under test.
 */
export const FIXTURE_RANGE = {
  preset: "30d" as const, from: "2026-09-01", to: "2026-09-10", days: 10, granularity: "day" as const, label: "Test",
  comparison: { prevFrom: "2026-08-22", prevTo: "2026-08-31", prevLabel: "prev", lastYearFrom: "2025-09-01", lastYearTo: "2025-09-10", lastYearLabel: "ly" },
};

const day = (date: string, impressions: number, clicks: number, websiteVisits: number, bookings: number, bookingValue: number, newVisitors: number, pagesPerSession: number) =>
  ({ date, impressions, clicks, websiteVisits, bookings, bookingValue, newVisitors, pagesPerSession });
const bd = (date: string, dimension: "campaign" | "device" | "feeder_market", dimensionValue: string, impressions: number, clicks: number, bookings: number, bookingValue: number) =>
  ({ date, dimension, dimensionValue, impressions, clicks, bookings, bookingValue });

export async function loadFixture(db: TestDb) {
  await db.insert(dailyMetrics).values([
    // current: imp 5000, clk 600, visits 582, bookings 3, value 1250.50, new 2700, pps mean 3.5
    day("2026-09-02", 1000, 100, 97, 2, 800.0, 500, 3.0),
    day("2026-09-05", 3000, 300, 290, 1, 450.5, 1500, 4.0),
    day("2026-09-10", 1000, 200, 195, 0, 0, 700, 3.5),
    // previous
    day("2026-08-25", 500, 50, 50, 1, 300.0, 200, 3.2),
    // last year
    day("2025-09-03", 400, 40, 40, 2, 500.0, 150, 3.1),
    // outside every window
    day("2026-08-21", 99999, 9999, 9999, 99, 99999.99, 9999, 4.9),
    day("2026-09-11", 99999, 9999, 9999, 99, 99999.99, 9999, 4.9),
  ]);
  await db.insert(breakdowns).values([
    // campaign, current: Brand Protection imp 1500 clk 260 bk 2 val 950.50 · Discovery imp 3500 clk 340 bk 1 val 300.00
    bd("2026-09-02", "campaign", "Brand Protection", 300, 60, 1, 500.0), bd("2026-09-02", "campaign", "Discovery & Competitors", 700, 40, 1, 300.0),
    bd("2026-09-05", "campaign", "Brand Protection", 1000, 150, 1, 450.5), bd("2026-09-05", "campaign", "Discovery & Competitors", 2000, 150, 0, 0),
    bd("2026-09-10", "campaign", "Brand Protection", 200, 50, 0, 0), bd("2026-09-10", "campaign", "Discovery & Competitors", 800, 150, 0, 0),
    // campaign, previous: only Brand Protection ran
    bd("2026-08-25", "campaign", "Brand Protection", 500, 50, 1, 300.0),
    // device, current (one day only)
    bd("2026-09-02", "device", "Mobile", 600, 60, 1, 500.0), bd("2026-09-02", "device", "Desktop", 400, 40, 1, 300.0),
    // outside window
    bd("2026-09-11", "campaign", "Brand Protection", 99999, 9999, 99, 99999.99),
  ]);
}
