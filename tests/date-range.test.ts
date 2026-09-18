import { describe, it, expect } from "vitest";
import { parseRange, addDays, daysBetween, dayOfWeek, eachDay, comparisonsCoincide } from "@/lib/date-range";

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
  it("defaults to year to date, anchored on dataMax", () => {
    // The owner's ruling, 2026-09-17: the span the screens open on is the year so far.
    const r = parseRange(undefined, MIN, MAX);
    expect(r.preset).toBe("ytd");
    expect(r.to).toBe(MAX);
    expect(r.from).toBe("2026-01-01");
    expect(r.days).toBe(259);
    expect(r.granularity).toBe("week");
    // Year-shaped, so both comparisons are the same period last year and the page shows one line.
    expect(r.comparison?.prevFrom).toBe("2025-01-01");
    expect(r.comparison?.prevTo).toBe("2025-09-16");
    expect(comparisonsCoincide(r)).toBe(true);
  });
  it("ytd starts on 1 Jan of the dataMax year and uses weeks", () => {
    const r = parseRange("ytd", MIN, MAX);
    expect(r.from).toBe("2026-01-01");
    expect(r.days).toBe(259);
    expect(r.granularity).toBe("week");
  });
  it("year-shaped presets compare against the same span last year, and say so", () => {
    // The 259 days before 1 Jan 2026 run 17 Apr..31 Dec 2025: spring to Christmas, not the same period.
    const ytd = parseRange("ytd", MIN, MAX);
    expect(ytd.comparison).toMatchObject({ prevFrom: "2025-01-01", prevTo: "2025-09-16", lastYearFrom: "2025-01-01", lastYearTo: "2025-09-16", prevLabel: "the same period last year" });
    expect(comparisonsCoincide(ytd)).toBe(true);
    const yr = parseRange("12m", MIN, MAX);
    expect(yr.comparison).toMatchObject({ prevFrom: yr.comparison!.lastYearFrom, prevTo: yr.comparison!.lastYearTo, lastYearLabel: "the year before" });
    expect(comparisonsCoincide(yr)).toBe(true);
    // Short presets keep a real previous period, distinct from last year.
    const m = parseRange("30d", MIN, MAX);
    expect(m.comparison).toMatchObject({ prevFrom: "2026-07-19", prevTo: "2026-08-17", prevLabel: "the previous 30 days", lastYearLabel: "this time last year" });
    expect(comparisonsCoincide(m)).toBe(false);
    expect(comparisonsCoincide(parseRange("all", MIN, MAX))).toBe(false);
  });
  it("12m is 365 days of weeks; all is the full window in months with no comparison", () => {
    expect(parseRange("12m", MIN, MAX).granularity).toBe("week");
    const all = parseRange("all", MIN, MAX);
    expect(all.from).toBe(MIN);
    expect(all.granularity).toBe("month");
    expect(all.comparison).toBeNull();
  });
  it("falls back to the default on garbage", () => {
    expect(parseRange("evil", MIN, MAX).preset).toBe("ytd");
  });
  it("clamps from to dataMin when the window is short", () => {
    expect(parseRange("12m", "2026-06-01", MAX).from).toBe("2026-06-01");
  });
});
