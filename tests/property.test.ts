import { describe, it, expect } from "vitest";
import { PROPERTY, OTA_COMMISSION_RATE } from "@/lib/property";
import { PROPERTY as SEEDED } from "../scripts/seed/profile";

describe("property", () => {
  it("matches the seeded property so copy and fee agree with the data", () => {
    expect(PROPERTY).toEqual(SEEDED);
    expect(PROPERTY.feeRateBps).toBe(1500);
    expect(OTA_COMMISSION_RATE).toBe(0.18);
  });
});
