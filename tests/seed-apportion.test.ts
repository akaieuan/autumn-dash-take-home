import { describe, it, expect } from "vitest";
import { apportion } from "../scripts/seed/apportion";

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
