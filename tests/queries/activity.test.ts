import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { makeTestDb, type TestDb } from "./setup";
import { loadFixture } from "./fixture";
import { getActivity } from "@/lib/db/queries";

let db: TestDb; let close: () => Promise<void>;
beforeAll(async () => { ({ db, close } = await makeTestDb()); await loadFixture(db); });
afterAll(() => close());

describe("getActivity", () => {
  it("starts on the Sunday before the window, one entry per day, null where the data has no row", async () => {
    // Two weeks back from 2026-09-10 is 2026-08-28, a Friday (2026-01-01 is a Thursday; 239 days later is Friday),
    // so the grid starts on Sunday 2026-08-23 and runs 19 days, which is three columns.
    const a = await getActivity(db, "2026-09-10", "website_visits", 2);
    expect(a.from).toBe("2026-08-23");
    expect(a.to).toBe("2026-09-10");
    expect(a.days).toHaveLength(19);
    expect(a.weeks).toBe(3);
    expect(a.days[0]).toEqual({ date: "2026-08-23", value: null });   // before any fixture row: blank, not zero
    expect(a.days[2]).toEqual({ date: "2026-08-25", value: 50 });
    expect(a.days[13]).toEqual({ date: "2026-09-05", value: 290 });
    // Fixture rows inside the window: 08-25 = 50, 09-02 = 97, 09-05 = 290, 09-10 = 195.
    expect(a.max).toBe(290);
    expect(a.total).toBe(50 + 97 + 290 + 195);
  });
  it("returns money metrics in cents", async () => {
    const a = await getActivity(db, "2026-09-10", "booking_value", 1);
    expect(a.days.find((d) => d.date === "2026-09-05")?.value).toBe(45050);
  });
});
