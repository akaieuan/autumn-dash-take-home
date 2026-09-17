import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { makeTestDb, type TestDb } from "./setup";
import { loadFixture, FIXTURE_RANGE, SEGMENT_RANGE } from "./fixture";
import { getBreakdown, getAllBreakdowns, getMarkets, getCampaigns, getFunnel } from "@/lib/db/queries";

let db: TestDb; let close: () => Promise<void>;
beforeAll(async () => { ({ db, close } = await makeTestDb()); await loadFixture(db); });
afterAll(() => close());

describe("getBreakdown", () => {
  it("aggregates a dimension over the window, ranked by bookings, with shares, fee and previous period", async () => {
    const rows = await getBreakdown(db, FIXTURE_RANGE, "campaign", 1500);
    expect(rows.map((r) => r.value)).toEqual(["Brand Protection", "Discovery & Competitors"]);
    const bp = rows[0];
    expect(bp).toMatchObject({ label: "Brand protection", impressions: 1500, clicks: 260, bookings: 2, bookingValueCents: 95050, feeCents: 14258, spendCents: 1700 });
    expect(bp.ctr).toBeCloseTo(260 / 1500, 6);
    expect(bp.conversion).toBeCloseTo(2 / 260, 6);
    expect(bp.shareOfBookings).toBeCloseTo(2 / 3, 6);
    expect(bp.shareOfClicks).toBeCloseTo(260 / 600, 6);
    expect(bp.previous).toEqual({ impressions: 500, clicks: 50, bookings: 1, bookingValueCents: 30000, spendCents: 0 });
    expect(rows[1].label).toBe("Discovery");
    expect(rows[1].previous).toEqual({ impressions: 0, clicks: 0, bookings: 0, bookingValueCents: 0, spendCents: 0 });
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

// SEGMENT_RANGE is 2026-07-08..07-17, previous 2026-06-28..07-07. Hand totals from the fixture rows:
//   feeder_market  Chicago 1400/150/5/1100.00 · Grand Rapids 800/80/3/500.00 · Detroit 500/40/2/400.00 · Other 300/30/0/0
//   campaign       Brand Protection 1400/190/7/1500.00 · Google Hotel Ads 1200/80/2/300.00 · Summer Newsletter 400/30/1/200.00
//   device         Mobile 1700/160/5/1000.00 · Desktop 1100/120/4/800.00 · Tablet 200/20/1/200.00
//   daily_metrics  3500 impressions / 380 clicks / 361 visits / 12 bookings / 2300.00 / 1500 new visitors / 3.0 pages
describe("getMarkets", () => {
  it("ranks the named markets, hints them and folds the seeded Other into a trailing row", async () => {
    const m = await getMarkets(db, SEGMENT_RANGE);
    expect(m.map((r) => r.name)).toEqual(["Chicago, IL", "Grand Rapids, MI", "Detroit, MI", "Everywhere else"]);
    expect(m[0]).toEqual({ name: "Chicago, IL", hint: "2 h 15 drive", visits: 150, previousVisits: 40, bookings: 5, bookingValueCents: 110000, share: 1 });
    expect(m[1]).toEqual({ name: "Grand Rapids, MI", hint: "1 h 10 drive", visits: 80, previousVisits: 20, bookings: 3, bookingValueCents: 50000, share: 3 / 5 });
    expect(m[2]).toEqual({ name: "Detroit, MI", hint: "2 h 45 drive", visits: 40, previousVisits: 0, bookings: 2, bookingValueCents: 40000, share: 2 / 5 }); // no Detroit row in the previous window
    expect(m[3]).toEqual({ name: "Everywhere else", hint: null, visits: 30, previousVisits: 20, bookings: 0, bookingValueCents: 0, share: 0 });
  });
  it("folds everything past the limit into that row and nulls previous without a comparison", async () => {
    const m = await getMarkets(db, SEGMENT_RANGE, 1);
    expect(m.map((r) => r.name)).toEqual(["Chicago, IL", "Everywhere else"]);
    // Grand Rapids + Detroit + Other: visits 80 + 40 + 30 = 150, previous 20 + 0 + 20 = 40,
    // bookings 3 + 2 + 0 = 5, value 500.00 + 400.00 + 0 = 900.00; share 5 / 5 against the top row.
    expect(m[1]).toEqual({ name: "Everywhere else", hint: null, visits: 150, previousVisits: 40, bookings: 5, bookingValueCents: 90000, share: 1 });
    const none = await getMarkets(db, { ...SEGMENT_RANGE, comparison: null }, 1);
    expect(none.map((r) => r.previousVisits)).toEqual([null, null]);
  });
  it("returns an empty list for a window with no market rows", async () => {
    expect(await getMarkets(db, FIXTURE_RANGE)).toEqual([]);
  });
});

describe("getCampaigns", () => {
  it("names campaigns from the glossary, flags the live ones and totals from daily_metrics", async () => {
    const c = await getCampaigns(db, SEGMENT_RANGE);
    // live = impressions in 2026-07-11..07-17: Brand Protection and Summer Newsletter run on 07-15;
    // Google Hotel Ads only has rows on 07-09.
    expect(c.campaigns.map((r) => [r.name, r.live])).toEqual([["Brand protection", true], ["Google Hotel Ads", false], ["Summer Newsletter", true]]);
    expect(c.campaigns[0]).toMatchObject({ key: "brand_protection", shown: 1400, visits: 190, bookings: 7, bookingValueCents: 150000 });
    expect(c.campaigns[0].ctr).toBeCloseTo(190 / 1400, 12);
    expect(c.campaigns[0].share).toBeCloseTo(7 / 10, 12);  // 7 + 2 + 1 = 10 bookings across the campaign rows
    expect(c.campaigns[1]).toMatchObject({ key: "hotel_ads", shown: 1200, visits: 80, bookings: 2, bookingValueCents: 30000 });
    expect(c.campaigns[2]).toMatchObject({ key: null, name: "Summer Newsletter", shown: 400, visits: 30, bookings: 1, bookingValueCents: 20000 });
    // daily_metrics 07-09 (2000/200/6/1200.00) + 07-13 (500/80/2/300.00) + 07-15 (1000/100/4/800.00).
    // 07-13 has no breakdown rows, so a total summed from breakdowns would read 3000/300/10/2000.00.
    expect(c.total).toMatchObject({ shown: 3500, visits: 380, bookings: 12, bookingValueCents: 230000 });
    expect(c.total.ctr).toBeCloseTo(380 / 3500, 12);
  });
});

describe("getFunnel", () => {
  it("chains impressions to clicks to bookings from daily_metrics and shares clicks by device", async () => {
    const f = await getFunnel(db, SEGMENT_RANGE);
    expect(f.steps.map((s) => [s.key, s.people])).toEqual([["impressions", 3500], ["clicks", 380], ["direct_bookings", 12]]);
    expect(f.steps[0].onwardRatio).toBeCloseTo(380 / 3500, 12);
    expect(f.steps[1].onwardRatio).toBeCloseTo(12 / 380, 12);
    expect(f.steps[2].onwardRatio).toBeNull();
    expect(f.steps.map((s) => s.bookingValueCents)).toEqual([null, null, 230000]);
    expect(f.newVisitors).toBe(1500);   // 900 + 200 + 400
    expect(f.pagesPerSession).toBe(3);  // (3.0 + 2.0 + 4.0) / 3
    expect(f.devices.map((d) => d.key)).toEqual(["device_mobile", "device_desktop", "device_tablet"]);
    expect(f.devices.map((d) => d.share)).toEqual([160 / 300, 120 / 300, 20 / 300]);
    expect(f.devices.reduce((a, d) => a + d.share, 0)).toBeCloseTo(1, 9);
  });
  it("has no ratio where the denominator is zero and no devices where there are no rows", async () => {
    const f = await getFunnel(db, { ...FIXTURE_RANGE, from: "2026-09-01", to: "2026-09-01", comparison: null });
    expect(f.steps.map((s) => s.people)).toEqual([0, 0, 0]);
    expect(f.steps.map((s) => s.onwardRatio)).toEqual([null, null, null]);
    expect(f.devices).toEqual([]);
  });
});
