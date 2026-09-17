import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { makeTestDb, type TestDb } from "./setup";
import { loadFixture, FIXTURE_RANGE } from "./fixture";
import { getBreakdown, getAllBreakdowns } from "@/lib/db/queries";

let db: TestDb; let close: () => Promise<void>;
beforeAll(async () => { ({ db, close } = await makeTestDb()); await loadFixture(db); });
afterAll(() => close());

describe("getBreakdown", () => {
  it("aggregates a dimension over the window, ranked by bookings, with shares, fee and previous period", async () => {
    const rows = await getBreakdown(db, FIXTURE_RANGE, "campaign", 1500);
    expect(rows.map((r) => r.value)).toEqual(["Brand Protection", "Discovery & Competitors"]);
    const bp = rows[0];
    expect(bp).toMatchObject({ label: "Brand protection", impressions: 1500, clicks: 260, bookings: 2, bookingValueCents: 95050, feeCents: 14258 });
    expect(bp.ctr).toBeCloseTo(260 / 1500, 6);
    expect(bp.conversion).toBeCloseTo(2 / 260, 6);
    expect(bp.shareOfBookings).toBeCloseTo(2 / 3, 6);
    expect(bp.shareOfClicks).toBeCloseTo(260 / 600, 6);
    expect(bp.previous).toEqual({ impressions: 500, clicks: 50, bookings: 1, bookingValueCents: 30000 });
    expect(rows[1].label).toBe("Discovery");
    expect(rows[1].previous).toEqual({ impressions: 0, clicks: 0, bookings: 0, bookingValueCents: 0 });
  });
  it("passes plain values through and nulls previous when there is no comparison", async () => {
    const rows = await getBreakdown(db, { ...FIXTURE_RANGE, comparison: null }, "device", 1500);
    expect(rows.map((r) => [r.label, r.bookings])).toEqual([["Mobile", 1], ["Desktop", 1]]);
    expect(rows[0].previous).toBeNull();
  });
  it("returns an empty list, not an error, for a dimension with no rows", async () => {
    expect(await getBreakdown(db, FIXTURE_RANGE, "feeder_market")).toEqual([]);
  });
  it("getAllBreakdowns keys every dimension", async () => {
    const all = await getAllBreakdowns(db, FIXTURE_RANGE);
    expect(Object.keys(all).sort()).toEqual(["campaign", "device", "feeder_market"]);
    expect(all.campaign).toHaveLength(2);
  });
});
