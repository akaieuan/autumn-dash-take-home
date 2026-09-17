import { describe, it, expect } from "vitest";
import { apportion, apportionByDraw } from "../scripts/seed/apportion";
import { makeRng } from "../scripts/seed/rng";

describe("apportion", () => {
  it("sums exactly to the total and gives zero weight nothing", () => {
    const parts = apportion(10, [1, 1, 1, 0]);
    expect(parts.reduce((s, p) => s + p, 0)).toBe(10);
    expect(parts[3]).toBe(0);
    expect(parts.sort()).toEqual([0, 3, 3, 4]);
  });
  it("respects caps and pushes overflow to parts with room", () => {
    const parts = apportion(9, [10, 1, 1], [3, 5, 5]);
    expect(parts.reduce((s, p) => s + p, 0)).toBe(9);
    expect(parts[0]).toBe(3);
  });
  it("handles zero total and all-zero weights", () => {
    expect(apportion(0, [1, 2])).toEqual([0, 0]);
    expect(apportion(5, [0, 0])).toEqual([0, 0]);
  });
});

describe("apportionByDraw", () => {
  it("sums exactly, respects caps, and spreads small totals in proportion over many days", () => {
    const rng = makeRng(3);
    const totals = [0, 0, 0];
    for (let day = 0; day < 3000; day++) {
      const parts = apportionByDraw(1, [34, 12, 3], rng.next);
      expect(parts.reduce((s, p) => s + p, 0)).toBe(1);
      parts.forEach((p, i) => (totals[i] += p));
    }
    expect(totals[1] / 3000).toBeGreaterThan(0.19); expect(totals[1] / 3000).toBeLessThan(0.30); // 12/49 ≈ 0.245
    expect(totals[2]).toBeGreaterThan(100);                                                       // 3/49 ≈ 6% of 3000
    const capped = apportionByDraw(5, [10, 1], rng.next, [2, 5]);
    expect(capped).toEqual([2, 3]);
  });
});
