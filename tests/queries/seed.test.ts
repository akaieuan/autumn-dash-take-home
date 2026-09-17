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
    expect(reconciled).toEqual({ campaign: true, device: true, feeder_market: true });
    await close();
  }, 120_000);
});
