import { describe, it, expect } from "vitest";
import {
  weekdayOf, weekdayAverages, monthTotals, weekOf, lastWeeks, heatLevel, monthColumns,
  visibleWindow, dayRank, monthContext, weekContext, monthBlocks, type DayLike,
} from "@/lib/activity";

/** A local date walker, so the fixtures below never borrow the helper under test. */
const addUtcDays = (iso: string, n: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + n * 86_400_000).toISOString().slice(0, 10);
};

/**
 * Two whole weeks, Sunday 2026-08-23 through Saturday 2026-09-05, hand-built so every
 * expectation below is arithmetic a reader can check without running the code.
 */
const DAYS: DayLike[] = [
  { date: "2026-08-23", value: null },  // Sun
  { date: "2026-08-24", value: 10 },    // Mon
  { date: "2026-08-25", value: 50 },    // Tue
  { date: "2026-08-26", value: null },  // Wed
  { date: "2026-08-27", value: 0 },     // Thu
  { date: "2026-08-28", value: 4 },     // Fri
  { date: "2026-08-29", value: 8 },     // Sat
  { date: "2026-08-30", value: 6 },     // Sun
  { date: "2026-08-31", value: 20 },    // Mon
  { date: "2026-09-01", value: 30 },    // Tue
  { date: "2026-09-02", value: 97 },    // Wed
  { date: "2026-09-03", value: 2 },     // Thu
  { date: "2026-09-04", value: 6 },     // Fri
  { date: "2026-09-05", value: 290 },   // Sat
];

describe("weekdayOf", () => {
  it("reads the weekday from the ISO date in UTC, never the wall clock", () => {
    expect(weekdayOf("2026-08-23")).toBe(0); // Sunday
    expect(weekdayOf("2026-08-24")).toBe(1);
    expect(weekdayOf("2026-09-05")).toBe(6); // Saturday
    expect(weekdayOf("2024-02-29")).toBe(4); // a leap day, Thursday
  });
});

describe("weekdayAverages", () => {
  it("averages the non-null values of each weekday, Sunday first", () => {
    // Sun 6 · Mon (10+20)/2 · Tue (50+30)/2 · Wed 97 · Thu (0+2)/2 · Fri (4+6)/2 · Sat (8+290)/2
    expect(weekdayAverages(DAYS)).toEqual([
      { weekday: 0, average: 6 },
      { weekday: 1, average: 15 },
      { weekday: 2, average: 40 },
      { weekday: 3, average: 97 },
      { weekday: 4, average: 1 },
      { weekday: 5, average: 5 },
      { weekday: 6, average: 149 },
    ]);
  });
  it("gives a weekday with no data 0, never NaN", () => {
    const a = weekdayAverages(DAYS.slice(0, 3)); // Sun (null), Mon 10, Tue 50
    expect(a.map((r) => r.average)).toEqual([0, 10, 50, 0, 0, 0, 0]);
  });
});

describe("monthTotals", () => {
  it("sums each calendar month in order of appearance", () => {
    // Aug: 10 + 50 + 0 + 4 + 8 + 6 + 20 = 98 · Sep: 30 + 97 + 2 + 6 + 290 = 425
    expect(monthTotals(DAYS)).toEqual([
      { key: "2026-08", total: 98 },
      { key: "2026-09", total: 425 },
    ]);
  });
  it("is empty for no days", () => {
    expect(monthTotals([])).toEqual([]);
  });
});

describe("weekOf", () => {
  it("returns the Sunday..Saturday week containing the date", () => {
    expect(weekOf(DAYS, "2026-09-02").map((d) => d?.date)).toEqual([
      "2026-08-30", "2026-08-31", "2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05",
    ]);
    expect(weekOf(DAYS, "2026-08-23")[0]).toEqual({ date: "2026-08-23", value: null });
  });
  it("leaves a slot the array does not cover null", () => {
    const week = weekOf(DAYS.slice(1), "2026-08-24"); // 2026-08-23 dropped
    expect(week[0]).toBeNull();
    expect(week[1]?.date).toBe("2026-08-24");
    expect(week).toHaveLength(7);
  });
});

describe("lastWeeks", () => {
  it("keeps the last whole weeks, starting on a Sunday", () => {
    expect(lastWeeks(DAYS, 1).map((d) => d.date)).toEqual([
      "2026-08-30", "2026-08-31", "2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05",
    ]);
  });
  it("returns every day when the window is at least as long as the data", () => {
    expect(lastWeeks(DAYS, 2)).toHaveLength(14);
    expect(lastWeeks(DAYS, 26)).toHaveLength(14);
  });
  it("never draws more columns than asked when the last week is partial", () => {
    const partial = DAYS.slice(0, 12); // 2026-08-23..2026-09-03: two columns, the second five days long
    const one = lastWeeks(partial, 1);
    expect(one.map((d) => d.date)).toEqual(["2026-08-30", "2026-08-31", "2026-09-01", "2026-09-02", "2026-09-03"]);
    expect(Math.ceil(one.length / 7)).toBe(1);
    expect(weekdayOf(one[0].date)).toBe(0);
  });
  it("returns nothing for a window of no weeks", () => {
    expect(lastWeeks(DAYS, 0)).toEqual([]);
  });
});

describe("heatLevel and monthColumns still live here", () => {
  it("scales a day against the window's own maximum", () => {
    expect(heatLevel(null, 290)).toBeNull();
    expect(heatLevel(0, 290)).toBe(0);
    expect(heatLevel(290, 290)).toBe(4);
  });
  it("labels the column where a month starts and skips a stub at the left edge", () => {
    // Three columns: 2026-08-23, 2026-08-30, 2026-09-06. August owns two of them but never reaches
    // the fourth week, so it is a stub and only September is labelled.
    const threeWeeks = Array.from({ length: 21 }, (_, i) => ({ date: addUtcDays("2026-08-23", i), value: 1 }));
    expect(monthColumns(threeWeeks)).toEqual([{ column: 3, label: "Sep" }]);
    expect(monthColumns(DAYS)).toEqual([]); // two August columns only: nothing to label
  });
});

/**
 * Thirty whole weeks, Sunday 2026-02-22 through Saturday 2026-09-19, so a span can actually cut
 * something: the two-week DAYS fixture is shorter than every window the toggle offers.
 */
const LONG: DayLike[] = Array.from({ length: 210 }, (_, i) => ({ date: addUtcDays("2026-02-22", i), value: i }));

describe("visibleWindow", () => {
  it("draws the whole year, the last 26 weeks, or the last 13", () => {
    expect(visibleWindow(LONG, "year")).toHaveLength(210);
    const half = visibleWindow(LONG, "half");
    expect(half).toHaveLength(182);                 // 26 columns
    expect(half[0].date).toBe("2026-03-22");
    const quarter = visibleWindow(LONG, "quarter");
    expect(quarter).toHaveLength(91);               // 13 columns
    expect(quarter[0].date).toBe("2026-06-21");
    expect(weekdayOf(quarter[0].date)).toBe(0);     // every window starts on a Sunday
  });
  it("never trims data shorter than the window", () => {
    expect(visibleWindow(DAYS, "quarter")).toHaveLength(14);
  });
});

describe("dayRank", () => {
  it("places a day among every day with data, and among its own weekday", () => {
    // 290 on Saturday 2026-09-05 is the busiest of the twelve days that have data, and the busier
    // of the two Saturdays (the other is 8).
    expect(dayRank(DAYS, "2026-09-05")).toEqual({ day: 1, days: 12, weekday: 1, weekdays: 2 });
    // 10 on Monday 2026-08-24: five days beat it (50, 20, 30, 97, 290), and the other Monday (20) does.
    expect(dayRank(DAYS, "2026-08-24")).toEqual({ day: 6, days: 12, weekday: 2, weekdays: 2 });
  });
  it("has nothing to say about a day with no data, or a day it has never seen", () => {
    expect(dayRank(DAYS, "2026-08-23")).toBeNull(); // null value
    expect(dayRank(DAYS, "2025-01-01")).toBeNull();
  });
});

describe("monthContext", () => {
  it("names the month, ranks it in the year and compares it with the month before", () => {
    // Aug 98, Sep 425 (monthTotals above): September is the busier and grew 334%.
    expect(monthContext(DAYS, "2026-09-02")).toEqual({ label: "Sep 2026", total: 425, rank: 1, count: 2, deltaPct: 334 });
    expect(monthContext(DAYS, "2026-08-24")).toEqual({ label: "Aug 2026", total: 98, rank: 2, count: 2, deltaPct: null });
  });
  it("is null with no day picked, or for a month outside the data", () => {
    expect(monthContext(DAYS, null)).toBeNull();
    expect(monthContext(DAYS, "2025-12-01")).toBeNull();
  });
});

describe("weekContext", () => {
  it("is the week around the picked day, and nothing at all when none is picked", () => {
    expect(weekContext(DAYS, "2026-09-02").map((d) => d?.date)).toEqual([
      "2026-08-30", "2026-08-31", "2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05",
    ]);
    expect(weekContext(DAYS, null)).toEqual([]);
  });
});

/**
 * Three calendar months, hand-built so every total below is a sum a reader can check:
 * July 20 (a tie on the busiest day), August 25 (one day with no data), September 50.
 */
const BLOCK_DAYS: DayLike[] = [
  { date: "2026-07-30", value: 10 },
  { date: "2026-07-31", value: 10 },   // the tie: both 10, so the first one wins
  { date: "2026-08-01", value: 5 },
  { date: "2026-08-02", value: null },
  { date: "2026-08-03", value: 20 },
  { date: "2026-09-01", value: 50 },
];

describe("monthBlocks", () => {
  it("walks back calendar months from the last day, padding the ones the data never reached", () => {
    const b = monthBlocks(BLOCK_DAYS, 4); // 2026-06 … 2026-09
    expect(b.map((m) => m.key)).toEqual(["2026-06", "2026-07", "2026-08", "2026-09"]);
    expect(b[0]).toEqual({ key: "2026-06", total: null, busiest: null, deltaPct: null }); // padded
    expect(b[1]).toEqual({ key: "2026-07", total: 20, busiest: "2026-07-30", deltaPct: null }); // tie → first; no month before it
    expect(b[2]).toEqual({ key: "2026-08", total: 25, busiest: "2026-08-03", deltaPct: 25 });   // (25 − 20) / 20
    expect(b[3]).toEqual({ key: "2026-09", total: 50, busiest: "2026-09-01", deltaPct: 100 });  // (50 − 25) / 25
  });
  it("still returns exactly `count` blocks when the data is shorter than the window", () => {
    const b = monthBlocks(BLOCK_DAYS, 12);
    expect(b).toHaveLength(12);
    expect(b[0].key).toBe("2025-10");          // twelve months back from 2026-09, across the year boundary
    expect(b.filter((m) => m.total === null)).toHaveLength(9);
    expect(b[11]).toEqual({ key: "2026-09", total: 50, busiest: "2026-09-01", deltaPct: 100 });
  });
  it("never divides by a zero month, and counts a zero day as data", () => {
    const b = monthBlocks([{ date: "2026-08-01", value: 0 }, { date: "2026-09-01", value: 7 }], 2);
    expect(b[0]).toEqual({ key: "2026-08", total: 0, busiest: "2026-08-01", deltaPct: null });
    expect(b[1]).toEqual({ key: "2026-09", total: 7, busiest: "2026-09-01", deltaPct: null }); // previous month is 0
  });
  it("has nothing to draw without days", () => {
    expect(monthBlocks([], 6)).toEqual([]);
  });
});
