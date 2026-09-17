import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { makeTestDb, type TestDb } from "./setup";
import { loadFixture } from "./fixture";
import { getActivity } from "@/lib/db/queries";

let db: TestDb; let close: () => Promise<void>;
beforeAll(async () => { ({ db, close } = await makeTestDb()); await loadFixture(db); });
afterAll(() => close());

describe("getActivity", () => {
  it("returns exactly the range's days, one entry each, null where the data has no row", async () => {
    // 2026-09-03 is a Thursday (2026-09-05 is the Saturday the day fixtures elsewhere name), so
    // weekday 4; eight days from it need ceil((4 + 8) / 7) = 2 calendar columns.
    const a = await getActivity(db, "2026-09-03", "2026-09-10", "website_visits");
    expect(a.from).toBe("2026-09-03");
    expect(a.to).toBe("2026-09-10");
    expect(a.days).toHaveLength(8);
    expect(a.weeks).toBe(2);
    // Every field of a day the fixture does not cover is null, so the day band reads "—" rather than a zero.
    expect(a.days[0]).toEqual({ date: "2026-09-03", value: null, newVisitors: null, bookings: null, pagesPerSession: null });
    expect(a.days[2]).toEqual({ date: "2026-09-05", value: 290, newVisitors: 1500, bookings: 1, pagesPerSession: 4 });
    expect(a.days[7]).toEqual({ date: "2026-09-10", value: 195, newVisitors: 700, bookings: 0, pagesPerSession: 3.5 });
    // Fixture rows inside [2026-09-03, 2026-09-10]: 09-05 = 290 and 09-10 = 195. 09-02 = 97 is outside it.
    expect(a.max).toBe(290);
    expect(a.total).toBe(290 + 195);
  });
  it("counts the calendar columns the days land in, not the days divided by seven", async () => {
    // 2026-09-05 is a Saturday, so six days from it are the last cell of one column and five of the
    // next: two columns, where six days over seven would claim one.
    const a = await getActivity(db, "2026-09-05", "2026-09-10", "website_visits");
    expect(a.days).toHaveLength(6);
    expect(a.weeks).toBe(2);
  });
  it("never reaches back past `from`: a day the caller did not ask for is absent, not blank", async () => {
    const a = await getActivity(db, "2026-09-03", "2026-09-10", "website_visits");
    expect(a.days.some((d) => d.date < "2026-09-03")).toBe(false);
    expect(a.days[0].date).toBe("2026-09-03"); // no Sunday padding: the component pads the grid
  });
  it("returns money metrics in cents", async () => {
    const a = await getActivity(db, "2026-09-04", "2026-09-10", "booking_value");
    expect(a.days.find((d) => d.date === "2026-09-05")?.value).toBe(45050);
  });
});
