import { describe, it, expect } from "vitest";
import { weekdayOf, weekdayAverages, monthTotals, weekOf, lastWeeks, heatLevel, monthColumns, type DayLike } from "@/lib/activity";

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
