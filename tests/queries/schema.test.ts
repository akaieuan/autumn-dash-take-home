import { describe, it, expect } from "vitest";
import { sql } from "drizzle-orm";
import { makeTestDb } from "./setup";

describe("migration", () => {
  it("creates the four tables, the composite index, and the dimension and kind checks", async () => {
    const { db, close } = await makeTestDb();
    const tables = await db.execute(sql`select table_name from information_schema.tables where table_schema = 'public' order by 1`);
    expect(tables.rows.map((r) => r.table_name)).toEqual(expect.arrayContaining(["breakdowns", "campaign_events", "campaigns", "daily_metrics"]));
    await db.execute(sql`insert into campaigns values ('X', 'o', 'f', '2026-01-01', 'live', 10)`);
    await expect(db.execute(sql`insert into campaign_events (id, date, campaign_name, kind, title, note) values (1, '2026-01-01', 'X', 'typo', 't', 'n')`)).rejects.toThrow();
    await expect(db.execute(sql`insert into campaign_events (id, date, campaign_name, kind, title, note) values (1, '2026-01-01', 'Nope', 'launched', 't', 'n')`)).rejects.toThrow();
    const idx = await db.execute(sql`select indexname from pg_indexes where tablename = 'breakdowns'`);
    expect(idx.rows.map((r) => r.indexname)).toContain("idx_breakdowns_date_dimension");
    await db.execute(sql`insert into daily_metrics values ('2026-01-01', 1, 1, 1, 0, 0, 1, 3.1)`);
    await expect(db.execute(sql`insert into breakdowns (date, dimension, dimension_value, impressions, clicks, bookings, booking_value) values ('2026-01-01', 'typo', 'x', 0, 0, 0, 0)`)).rejects.toThrow();
    await close();
  });
});
