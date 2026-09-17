import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { makeTestDb, type TestDb } from "./setup";
import { loadFixture, FIXTURE_RANGE } from "./fixture";
import { getCampaignMeta, getEvents, getEventImpact, getRecentEventImpacts } from "@/lib/db/queries";

let db: TestDb; let close: () => Promise<void>;
beforeAll(async () => { ({ db, close } = await makeTestDb()); await loadFixture(db); });
afterAll(() => close());

describe("getCampaignMeta", () => {
  it("returns every campaign with a plain label and budget in cents", async () => {
    const m = await getCampaignMeta(db);
    expect(m.map((c) => [c.label, c.monthlyBudgetCents])).toEqual([["Brand protection", 35000], ["Discovery", 90000]]);
    expect(m[0]).toMatchObject({ name: "Brand Protection", status: "live", launchedOn: "2024-09-17" });
  });
});

describe("getEvents", () => {
  it("returns events inside the range, newest first, with plain kind labels", async () => {
    const inRange = await getEvents(db, FIXTURE_RANGE);
    expect(inRange.map((e) => e.id)).toEqual([1]);
    expect(inRange[0]).toMatchObject({ campaignLabel: "Brand protection", kindLabel: "Ads refreshed", title: "Brand ads refreshed" });
    const wider = await getEvents(db, { ...FIXTURE_RANGE, from: "2026-07-01", to: "2026-09-16" });
    expect(wider.map((e) => e.id)).toEqual([1, 2, 3]);
    expect(wider[1].campaignLabel).toBeNull();
    expect(await getEvents(db, { ...FIXTURE_RANGE, from: "2026-07-01", to: "2026-09-16" }, 2)).toHaveLength(2);
  });
});

describe("getEventImpact", () => {
  it("compares a campaign event's after-window with the same days before, from breakdown rows", async () => {
    const [e] = await getEvents(db, FIXTURE_RANGE);
    // Six days keeps the fixture's deliberately huge 09-11 row out of the after-window.
    const i = await getEventImpact(db, e, 6);
    expect(i.days).toBe(6);
    expect(i.before).toMatchObject({ from: "2026-08-30", to: "2026-09-04", impressions: 300, clicks: 60, bookings: 1, bookingValueCents: 50000, spendCents: 400 });
    expect(i.after).toMatchObject({ from: "2026-09-05", to: "2026-09-10", impressions: 1200, clicks: 200, bookings: 1, bookingValueCents: 45050, spendCents: 1300 });
    expect(i.before.ctr).toBeCloseTo(0.2, 6);
    expect(i.after.ctr).toBeCloseTo(200 / 1200, 6);
  });
  it("reads daily_metrics for a program-wide event and clips the after-window to the last day with data", async () => {
    const [, program] = await getEvents(db, { ...FIXTURE_RANGE, from: "2026-08-01", to: "2026-09-16" });
    expect(program.campaign).toBeNull();
    const i = await getEventImpact(db, program, 7);
    expect(i.before).toMatchObject({ from: "2026-08-18", to: "2026-08-24", impressions: 99999, bookings: 99 });
    expect(i.after).toMatchObject({ from: "2026-08-25", to: "2026-08-31", impressions: 500, clicks: 50, bookings: 1, bookingValueCents: 30000 });
    const clipped = await getEventImpact(db, program, 28, "2026-08-27");
    expect(clipped.days).toBe(3);
    expect(clipped.after.to).toBe("2026-08-27");
    expect(clipped.before).toMatchObject({ from: "2026-08-22", to: "2026-08-24" });
  });
  it("getRecentEventImpacts pairs each in-range event with its windows, clipped to the range end", async () => {
    const list = await getRecentEventImpacts(db, { ...FIXTURE_RANGE, from: "2026-08-01", to: "2026-09-10" }, 2, 28);
    expect(list.map((x) => x.event.id)).toEqual([1, 2]);
    expect(list[0].after.to).toBe("2026-09-10");
    expect(list[0].days).toBe(6);
  });
});
