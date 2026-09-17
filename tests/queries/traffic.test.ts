import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { makeTestDb, countingDb, type TestDb } from "./setup";
import { loadFixture, FIXTURE_RANGE, SEGMENT_RANGE } from "./fixture";
import { getTrafficByCampaign, getCampaignEfficiency, getBreakdownBundle, bucketEnd } from "@/lib/db/queries";

let db: TestDb; let close: () => Promise<void>;
beforeAll(async () => { ({ db, close } = await makeTestDb()); await loadFixture(db); });
afterAll(() => close());

describe("getTrafficByCampaign", () => {
  it("one series per campaign, bucketed by day, ranked by total, with events pinned to buckets", async () => {
    const t = await getTrafficByCampaign(db, FIXTURE_RANGE);
    expect(t.buckets).toHaveLength(10);
    expect(t.series.map((s) => [s.label, s.total])).toEqual([["Discovery", 340], ["Brand protection", 260]]);
    const bp = t.series[1];
    expect(bp.values).toEqual([0, 60, 0, 0, 150, 0, 0, 0, 0, 50]); // 09-02, 09-05, 09-10
    expect(t.events.map((e) => [e.id, e.bucket])).toEqual([[1, "2026-09-05"]]);
    expect(t.events[0].kindLabel).toBe("Ads refreshed");
  });
  it("sums into week buckets and switches metric", async () => {
    const t = await getTrafficByCampaign(db, { ...FIXTURE_RANGE, granularity: "week" }, "bookings");
    expect(t.buckets).toEqual(["2026-09-01", "2026-09-08"]);
    expect(t.series.find((s) => s.name === "Brand Protection")?.values).toEqual([2, 0]);
    expect(bucketEnd(t.buckets, 0, FIXTURE_RANGE.to)).toBe("2026-09-07");
    expect(bucketEnd(t.buckets, 1, FIXTURE_RANGE.to)).toBe("2026-09-10");
  });
  it("returns empty series and no events for a window with no campaign rows", async () => {
    const t = await getTrafficByCampaign(db, { ...FIXTURE_RANGE, from: "2025-01-01", to: "2025-01-10", comparison: null });
    expect(t.series).toEqual([]);
    expect(t.events).toEqual([]);
  });
});

describe("getCampaignEfficiency", () => {
  it("costs and value per visit computed by hand, ranked by value per visit, total from daily_metrics", async () => {
    const e = await getCampaignEfficiency(db, FIXTURE_RANGE);
    expect(e.rows.map((r) => r.label)).toEqual(["Brand protection", "Discovery"]);
    const bp = e.rows[0];
    // Brand Protection: 260 visits, spend 17.00, 2 bookings, value 950.50
    expect(bp).toMatchObject({ visits: 260, spendCents: 1700, costPerVisitCents: 7, bookings: 2, costPerBookingCents: 850, bookingValueCents: 95050, valuePerVisitCents: 366 });
    expect(bp.shareOfVisits).toBeCloseTo(260 / 600, 6);
    expect(bp.conversion).toBeCloseTo(2 / 260, 6);
    expect(bp.previous).toEqual({ visits: 50, bookings: 1, spendCents: 0, bookingValueCents: 30000 });
    // Discovery: 340 visits, spend 28.00, 1 booking, value 300.00
    expect(e.rows[1]).toMatchObject({ visits: 340, spendCents: 2800, costPerVisitCents: 8, costPerBookingCents: 2800, valuePerVisitCents: 88 });
    // Total reads daily_metrics: 600 clicks, spend 45.00, 3 bookings, value 1250.50
    expect(e.total).toMatchObject({ visits: 600, spendCents: 4500, costPerVisitCents: 8, bookings: 3, costPerBookingCents: 1500, bookingValueCents: 125050, valuePerVisitCents: 208 });
  });
  it("the total reads daily_metrics, not the campaign rows: a day without breakdowns still counts", async () => {
    const e = await getCampaignEfficiency(db, SEGMENT_RANGE);
    expect(e.rows.reduce((s, r) => s + r.visits, 0)).toBe(300); // campaign rows: 07-09 and 07-15 only
    expect(e.total.visits).toBe(380);                            // daily_metrics: 200 + 100 + 80 (07-13 has no breakdown rows)
  });
  it("derives the same rows and total from a shared breakdown bundle, with no query of its own", async () => {
    const counted = countingDb(db);
    const bundle = await getBreakdownBundle(counted.db, SEGMENT_RANGE);
    counted.reset();
    const fromBundle = await getCampaignEfficiency(counted.db, SEGMENT_RANGE, bundle);
    expect(counted.statements()).toBe(0);
    expect(fromBundle).toEqual(await getCampaignEfficiency(db, SEGMENT_RANGE));
    expect(fromBundle.total.visits).toBe(380); // still daily_metrics, not the 300 the campaign rows sum to
  });
  it("nulls the per-unit figures instead of dividing by zero", async () => {
    const e = await getCampaignEfficiency(db, { ...FIXTURE_RANGE, from: "2026-09-10", to: "2026-09-10", comparison: null });
    const bp = e.rows.find((r) => r.name === "Brand Protection")!;
    expect(bp).toMatchObject({ visits: 50, bookings: 0, costPerBookingCents: null, valuePerVisitCents: 0 });
    expect(e.total.costPerBookingCents).toBeNull();
    expect(bp.previous).toBeNull();
  });
});
