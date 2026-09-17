import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { makeTestDb, type TestDb } from "./setup";
import { loadFixture, FIXTURE_RANGE } from "./fixture";
import { getDataBounds, getOverview, getTrend, bucketStarts } from "@/lib/db/queries";

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
      bookingValueCents: 125050, feeCents: 18758, netCents: 106292, newVisitors: 2700, pagesPerSession: 3.5,
      avgBookingValueCents: 41683,
    });
    expect(o.current.ctr).toBeCloseTo(0.12, 6);
    expect(o.current.conversion).toBeCloseTo(0.005, 6);
    expect(o.previous).toMatchObject({ bookings: 1, bookingValueCents: 30000, clicks: 50 });
    expect(o.lastYear).toMatchObject({ bookings: 2, bookingValueCents: 50000 });
    expect(o.costPerBookingCents).toBe(6253);              // 18758 / 3
    expect(o.otaCommissionPerBookingCents).toBe(7503);     // 0.18 × 125050 / 3
    expect(o.commissionAvoidedCents).toBe(22509);          // 0.18 × 125050
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
