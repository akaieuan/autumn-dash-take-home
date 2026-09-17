import { describe, it, expect } from "vitest";
import { makeRng } from "../scripts/seed/rng";
import { demandMultiplier, ramp, growth, avgBookingValueCents, WINDOW } from "../scripts/seed/profile";
import { eachDay } from "@/lib/date-range";

describe("rng", () => {
  it("is deterministic for a seed", () => {
    const a = makeRng(1), b = makeRng(1);
    expect([a.next(), a.int(1, 6), a.poisson(4), a.binomial(20, 0.3)]).toEqual([b.next(), b.int(1, 6), b.poisson(4), b.binomial(20, 0.3)]);
  });
  it("poisson and binomial means land near their parameters", () => {
    const r = makeRng(7); let p = 0, b = 0;
    for (let i = 0; i < 4000; i++) { p += r.poisson(3.2); b += r.binomial(50, 0.16); }
    expect(p / 4000).toBeGreaterThan(3.0); expect(p / 4000).toBeLessThan(3.4);
    expect(b / 4000).toBeGreaterThan(7.6); expect(b / 4000).toBeLessThan(8.4);
  });
});

describe("profile", () => {
  it("window is 730 days", () => { expect(eachDay(WINDOW.start, WINDOW.end)).toHaveLength(730); });
  it("summer beats winter by more than 2x; holidays spike; Saturday searches least", () => {
    expect(demandMultiplier("2025-07-15")).toBeGreaterThan(demandMultiplier("2025-01-14") * 2);
    expect(demandMultiplier("2025-07-03")).toBeGreaterThan(demandMultiplier("2025-07-08"));
    expect(demandMultiplier("2025-06-14")).toBeLessThan(demandMultiplier("2025-06-13")); // Sat < Fri
  });
  it("ramp starts partial and reaches 1 after eight weeks; growth compounds to +22% in a year", () => {
    expect(ramp(WINDOW.start)).toBeCloseTo(0.35, 5);
    expect(ramp("2024-11-12")).toBe(1);
    expect(growth("2025-09-17")).toBeCloseTo(1.22, 3);
  });
  it("a July booking is worth more than a January one", () => {
    expect(avgBookingValueCents("2025-07-12")).toBeGreaterThan(50000);
    expect(avgBookingValueCents("2025-01-14")).toBeLessThan(32000);
  });
});
