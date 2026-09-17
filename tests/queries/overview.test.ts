import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { makeTestDb, type TestDb } from "./setup";
import { loadFixture, FIXTURE_RANGE } from "./fixture";
import { getDataBounds, getOverview, getTrend, bucketStarts, chunkSums, isTrendMetric, getDailySeries, getQuickAnalytics } from "@/lib/db/queries";

let db: TestDb; let close: () => Promise<void>;
beforeAll(async () => { ({ db, close } = await makeTestDb()); await loadFixture(db); });
afterAll(() => close());

describe("getDataBounds", () => {
  it("returns the first and last day with data", async () => {
    expect(await getDataBounds(db)).toEqual({ min: "2025-09-03", max: "2026-09-11" });
  });
  it("throws a readable error on an empty table", async () => {
    const empty = await makeTestDb();
    await expect(getDataBounds(empty.db)).rejects.toThrow(/db:seed/);
    await empty.close();
  });
});

describe("getOverview", () => {
  it("computes totals, ratios, fee and net from hand-checked rows", async () => {
    const o = await getOverview(db, FIXTURE_RANGE, 1500);
    expect(o.current).toMatchObject({
      days: 3, impressions: 5000, clicks: 600, websiteVisits: 582, bookings: 3,
      bookingValueCents: 125050, feeCents: 18758, netCents: 106292, newVisitors: 2700,
      siteSessions: 3600, pageviews: 13250, pagesPerSession: 3.68,
      avgBookingValueCents: 41683, spendCents: 4500,
    });
    expect(o.current.ctr).toBeCloseTo(0.12, 6);
    expect(o.current.conversion).toBeCloseTo(0.005, 6);
    expect(o.previous).toMatchObject({ bookings: 1, bookingValueCents: 30000, clicks: 50 });
    expect(o.lastYear).toMatchObject({ bookings: 2, bookingValueCents: 50000 });
    expect(o.costPerBookingCents).toBe(6253);              // 18758 / 3
    expect(o.otaCommissionPerBookingCents).toBe(7503);     // 0.18 × 125050 / 3
    expect(o.commissionAvoidedCents).toBe(22509);          // 0.18 × 125050
  });
  it("weights pages per visit by sessions, so a busy day counts more than a quiet one", async () => {
    // 13250 pageviews over 3600 sessions = 3.68. Averaging the three daily rates (3.0, 4.0, 3.5) gives 3.5.
    const o = await getOverview(db, FIXTURE_RANGE, 1500);
    expect(o.current.pagesPerSession).toBe(3.68);
    expect(o.current.pagesPerSession).not.toBe(3.5);
  });
  it("matches the stored daily rate when the range is a single day", async () => {
    const o = await getOverview(db, { ...FIXTURE_RANGE, from: "2026-09-10", to: "2026-09-10", comparison: null }, 1500);
    expect(o.current.pagesPerSession).toBe(3.5); // 3150 / 900, and the day's own stored rate
    expect(o.current.siteSessions).toBe(900);
  });
  it("reports zero pages per visit rather than dividing by zero when a window has no sessions", async () => {
    const o = await getOverview(db, { ...FIXTURE_RANGE, from: "2026-01-01", to: "2026-01-05", comparison: null }, 1500);
    expect(o.current).toMatchObject({ siteSessions: 0, pageviews: 0, pagesPerSession: 0 });
  });
  it("has no comparison for the all-time preset and nulls where bookings are zero", async () => {
    const o = await getOverview(db, { ...FIXTURE_RANGE, from: "2026-09-10", to: "2026-09-10", comparison: null }, 1500);
    expect(o.previous).toBeNull();
    expect(o.current.bookings).toBe(0);
    expect(o.current.avgBookingValueCents).toBeNull();
    expect(o.costPerBookingCents).toBeNull();
  });
});

describe("getTrend", () => {
  it("buckets start on the range's first day", () => {
    expect(bucketStarts("2026-08-30", "2026-09-13", "week")).toEqual(["2026-08-30", "2026-09-06", "2026-09-13"]);
    expect(bucketStarts("2025-11-15", "2026-01-20", "month")).toEqual(["2025-11-15", "2025-12-01", "2026-01-01"]);
  });
  it("returns one point per day, money in cents, comparisons aligned by index", async () => {
    const t = await getTrend(db, FIXTURE_RANGE, "booking_value");
    expect(t).toHaveLength(10);
    expect(t[1]).toEqual({ bucket: "2026-09-02", current: 80000, previous: 0, lastYear: 0 });
    expect(t[2]).toMatchObject({ bucket: "2026-09-03", current: 0, lastYear: 50000 }); // 2025-09-03 → index 2
    expect(t[3]).toMatchObject({ bucket: "2026-09-04", previous: 30000 });             // 2026-08-25 → index 3 of the previous window
    expect(t[9]).toMatchObject({ bucket: "2026-09-10", current: 0 });
    const v = await getTrend(db, FIXTURE_RANGE, "website_visits");
    expect(v[1].current).toBe(97); expect(v[4].current).toBe(290);
  });
  it("sums into week buckets and drops comparisons when there are none", async () => {
    const t = await getTrend(db, { ...FIXTURE_RANGE, granularity: "week", comparison: null }, "clicks");
    expect(t.map((p) => p.current)).toEqual([400, 200]); // 09-01..09-07 = 100+300, 09-08..09-10 = 200
    expect(t[0].previous).toBeNull();
  });
});

describe("chunkSums", () => {
  it("sums into near-equal groups, the first groups one longer when it does not divide", () => {
    expect(chunkSums([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 4)).toEqual([6, 15, 15, 19]); // 1+2+3 | 4+5+6 | 7+8 | 9+10
    expect(chunkSums(Array(30).fill(1), 4)).toEqual([8, 8, 7, 7]);                  // 30 = 8 + 8 + 7 + 7
    expect(chunkSums([5], 4)).toEqual([5, 0, 0, 0]);                                // one value, three empty groups
  });
});

describe("isTrendMetric", () => {
  it("accepts the six column names and nothing else", () => {
    expect(isTrendMetric("booking_value")).toBe(true);
    expect(isTrendMetric("website_visits")).toBe(true);
    expect(isTrendMetric("revenue")).toBe(false);
    expect(isTrendMetric(undefined)).toBe(false);
  });
});

describe("getDailySeries", () => {
  it("returns one value per day of the window, money in cents, 0 where there is no row", async () => {
    const s = await getDailySeries(db, FIXTURE_RANGE.from, FIXTURE_RANGE.to, "booking_value");
    expect(s).toHaveLength(10);                          // 2026-09-01..09-10 inclusive
    expect(s[0]).toBe(0);                                // 2026-09-01: no row
    expect(s[1]).toBe(80000);                            // 2026-09-02: 800.00 dollars
    expect(s[4]).toBe(45050);                            // 2026-09-05: 450.50 dollars
    expect(s.reduce((a, b) => a + b, 0)).toBe(125050);   // 800.00 + 450.50
    const v = await getDailySeries(db, FIXTURE_RANGE.from, FIXTURE_RANGE.to, "website_visits");
    expect([v[1], v[4], v[9]]).toEqual([97, 290, 195]);  // the three seeded days of the window
  });
});

describe("getQuickAnalytics", () => {
  // Current window rows: 09-02 (1000 imp, 97 visits, 2 bookings, 800.00) · 09-05 (3000, 290, 1, 450.50)
  // · 09-10 (1000, 195, 0, 0). Previous window: 08-25 (500 imp, 50 visits, 1 booking, 300.00).
  // The 10 days chunk 3 + 3 + 2 + 2, so a spark group is [09-01..09-03], [09-04..09-06], [09-07..09-08], [09-09..09-10].
  it("gives four stats in a fixed order, each the period total, sparked into four day chunks", async () => {
    const q = await getQuickAnalytics(db, FIXTURE_RANGE);
    expect(q.stats.map((s) => s.key)).toEqual(["direct_bookings", "booking_value", "website_visits", "impressions"]);
    expect(q.stats[0]).toEqual({ key: "direct_bookings", kind: "count", value: 3, previous: 1, spark: [2, 1, 0, 0] });
    expect(q.stats[1]).toEqual({ key: "booking_value", kind: "money", value: 125050, previous: 30000, spark: [80000, 45050, 0, 0] });
    expect(q.stats[2]).toEqual({ key: "website_visits", kind: "count", value: 582, previous: 50, spark: [97, 290, 0, 195] });
    expect(q.stats[3]).toEqual({ key: "impressions", kind: "count", value: 5000, previous: 500, spark: [1000, 3000, 0, 1000] });
    for (const s of q.stats) expect(s.spark.reduce((a, b) => a + b, 0), s.key).toBe(s.value);
  });
  it("has no previous figure when the range carries no comparison", async () => {
    const q = await getQuickAnalytics(db, { ...FIXTURE_RANGE, comparison: null });
    expect(q.stats.map((s) => s.previous)).toEqual([null, null, null, null]);
    expect(q.stats.map((s) => s.value)).toEqual([3, 125050, 582, 5000]);
  });
});
