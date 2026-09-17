import { describe, it, expect } from "vitest";
import { parseRange, addDays, daysBetween, dayOfWeek, eachDay } from "@/lib/date-range";

const MIN = "2024-09-17";
const MAX = "2026-09-16";

describe("date helpers", () => {
  it("cross month and year boundaries in UTC", () => {
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(daysBetween("2026-08-18", "2026-09-16")).toBe(30);
    expect(dayOfWeek("2025-06-14")).toBe(6);
    expect(eachDay(MIN, MAX)).toHaveLength(730);
  });
});

describe("parseRange", () => {
  it("defaults to 30d anchored on dataMax with two comparisons", () => {
    const r = parseRange(undefined, MIN, MAX);
    expect(r.preset).toBe("30d");
    expect(r.to).toBe(MAX);
    expect(r.from).toBe("2026-08-18");
    expect(r.days).toBe(30);
    expect(r.granularity).toBe("day");
    expect(r.comparison?.prevTo).toBe("2026-08-17");
    expect(r.comparison?.prevFrom).toBe("2026-07-19");
    expect(r.comparison?.lastYearFrom).toBe("2025-08-18");
    expect(r.comparison?.lastYearTo).toBe("2025-09-16");
  });
  it("ytd starts on 1 Jan of the dataMax year and uses weeks", () => {
    const r = parseRange("ytd", MIN, MAX);
    expect(r.from).toBe("2026-01-01");
    expect(r.days).toBe(259);
    expect(r.granularity).toBe("week");
  });
  it("12m is 365 days of weeks; all is the full window in months with no comparison", () => {
    expect(parseRange("12m", MIN, MAX).granularity).toBe("week");
    const all = parseRange("all", MIN, MAX);
    expect(all.from).toBe(MIN);
    expect(all.granularity).toBe("month");
    expect(all.comparison).toBeNull();
  });
  it("falls back to 30d on garbage", () => {
    expect(parseRange("evil", MIN, MAX).preset).toBe("30d");
  });
  it("clamps from to dataMin when the window is short", () => {
    expect(parseRange("12m", "2026-06-01", MAX).from).toBe("2026-06-01");
  });
});
