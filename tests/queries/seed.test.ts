import { describe, it, expect } from "vitest";
import { makeTestDb } from "./setup";
import { generateAll } from "../../scripts/seed/generate";
import { seedDatabase, verifyDatabase, acceptanceLine } from "../../scripts/seed/seed-database";

describe("seed round-trip through a real Postgres", () => {
  it("inserts, is repeatable, and db:verify re-derives the same acceptance line", async () => {
    const { db, close } = await makeTestDb();
    const data = generateAll();
    const first = await seedDatabase(db, data);
    const second = await seedDatabase(db, data); // running twice must not double the rows
    expect(second).toEqual(first);
    const { acceptance, reconciled } = await verifyDatabase(db);
    expect(acceptanceLine(acceptance)).toBe(acceptanceLine(first));
    expect(acceptance.days).toBe(730);
    expect(acceptance.campaigns).toBe(4);
    expect(acceptance.events).toBeGreaterThanOrEqual(20);
    expect(acceptance.spend).toBeGreaterThan(0);
    expect(acceptance.allDirectBookings).toBeGreaterThan(acceptance.bookings);
    expect(acceptanceLine(acceptance)).toMatch(new RegExp(`${acceptance.allDirectBookings} direct bookings in all`));
    expect(reconciled).toEqual({ campaign: true, device: true, feeder_market: true });
    await close();
  }, 120_000);
});
