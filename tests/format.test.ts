import { describe, it, expect } from "vitest";
import { money, moneyCompact, compact, count, pct, delta, deltaText, oneIn, shortDate, longDate, bucketLabel, rangeLabel } from "@/lib/format";

describe("format", () => {
  it("money renders whole dollars from cents", () => {
    expect(money(1868500)).toBe("$18,685");
    expect(money(1824000)).toBe("$18,240");
    expect(money(0)).toBe("$0");
    expect(money(-125000)).toBe("-$1,250");
    expect(money(44450)).toBe("$445");
  });
  it("compact forms abbreviate and count keeps thousands separators", () => {
    expect(moneyCompact(1868500)).toBe("$18.7k");
    expect(moneyCompact(1824000)).toBe("$18.2k");
    expect(moneyCompact(125000000)).toBe("$1.25M");
    expect(compact(12400)).toBe("12.4k");
    expect(compact(6400)).toBe("6.4k");
    expect(compact(950)).toBe("950");
    expect(count(12345)).toBe("12,345");
    expect(count(950)).toBe("950");
  });
  it("pct rounds fractions", () => {
    expect(pct(0.4821)).toBe("48%");
    expect(pct(0.4821, 1)).toBe("48.2%");
  });
  it("delta handles zero and null previous", () => {
    expect(delta(41, 35)).toEqual({ pct: 17, direction: "up" });
    expect(delta(118, 100)).toEqual({ pct: 18, direction: "up" });
    expect(delta(90, 100)).toEqual({ pct: -10, direction: "down" });
    expect(delta(100, 100)).toEqual({ pct: 0, direction: "flat" });
    expect(delta(5, 0)).toEqual({ pct: null, direction: "up" });
    expect(delta(5, null)).toEqual({ pct: null, direction: "flat" });
  });
  it("deltaText is a plain sentence fragment", () => {
    expect(deltaText(41, 35, "the previous 30 days")).toBe("+17% vs the previous 30 days");
    expect(deltaText(118, 100, "the previous 30 days")).toBe("+18% vs the previous 30 days");
    expect(deltaText(100, 100, "this time last year")).toBe("No change vs this time last year");
    expect(deltaText(5, 0, "last year")).toBeNull();
  });
  it("oneIn and dates read the way an owner says them", () => {
    expect(oneIn(0.083)).toBe("1 in 12");
    expect(oneIn(0)).toBe("none");
    expect(shortDate("2026-09-01")).toBe("Sep 1");
    expect(longDate("2026-09-01")).toBe("Sep 1, 2026");
    expect(longDate("2026-09-16")).toBe("Sep 16, 2026");
    expect(bucketLabel("2026-09-01", "month")).toBe("Sep 2026");
    expect(bucketLabel("2026-08-31", "week")).toBe("Wk of Aug 31");
    expect(bucketLabel("2026-09-01", "day")).toBe("Sep 1");
    expect(rangeLabel("2026-08-18", "2026-09-16")).toBe("Aug 18 – Sep 16, 2026");
    expect(rangeLabel("2025-12-20", "2026-01-05")).toBe("Dec 20, 2025 – Jan 5, 2026");
  });
});
