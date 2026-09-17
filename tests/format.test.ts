import { describe, it, expect } from "vitest";
import { money, moneyCompact, pct, compact, delta, deltaText, oneIn, bucketLabel, longDate } from "@/lib/format";

describe("format", () => {
  it("money renders whole dollars from cents", () => {
    expect(money(1868500)).toBe("$18,685");
    expect(money(0)).toBe("$0");
    expect(money(-125000)).toBe("-$1,250");
  });
  it("moneyCompact and compact abbreviate", () => {
    expect(moneyCompact(1868500)).toBe("$18.7k");
    expect(moneyCompact(125000000)).toBe("$1.25M");
    expect(compact(12400)).toBe("12.4k");
    expect(compact(950)).toBe("950");
  });
  it("pct rounds fractions", () => {
    expect(pct(0.4821)).toBe("48%");
    expect(pct(0.4821, 1)).toBe("48.2%");
  });
  it("delta handles zero and null previous", () => {
    expect(delta(118, 100)).toEqual({ pct: 18, direction: "up" });
    expect(delta(90, 100)).toEqual({ pct: -10, direction: "down" });
    expect(delta(100, 100)).toEqual({ pct: 0, direction: "flat" });
    expect(delta(5, 0)).toEqual({ pct: null, direction: "up" });
    expect(delta(5, null)).toEqual({ pct: null, direction: "flat" });
  });
  it("deltaText is a plain sentence fragment", () => {
    expect(deltaText(118, 100, "the previous 30 days")).toBe("+18% vs the previous 30 days");
    expect(deltaText(100, 100, "last year")).toBe("No change vs last year");
    expect(deltaText(5, 0, "last year")).toBeNull();
  });
  it("oneIn and date labels read naturally", () => {
    expect(oneIn(0.083)).toBe("1 in 12");
    expect(oneIn(0)).toBe("none");
    expect(bucketLabel("2026-09-01", "month")).toBe("Sep 2026");
    expect(bucketLabel("2026-09-01", "day")).toBe("1 Sep");
    expect(bucketLabel("2026-08-31", "week")).toBe("w/c 31 Aug");
    expect(longDate("2026-09-16")).toBe("16 Sep 2026");
  });
});
