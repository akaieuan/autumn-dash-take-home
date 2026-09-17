import { describe, it, expect } from "vitest";
import { glossary, valueLabel, campaignKey, deviceKey, MARKET_HINTS } from "@/lib/glossary";
import { DIMENSION_DEFS } from "../scripts/seed/profile";

describe("glossary", () => {
  it("every label is plain (no bare acronym) and every meaning is a sentence", () => {
    for (const [key, e] of Object.entries(glossary)) {
      expect(e.label, key).not.toMatch(/\b(CTR|CVR|ROAS|CPC|OTA)\b/);
      expect(e.meaning.length, key).toBeGreaterThan(20);
      expect(e.meaning.trim().endsWith("."), key).toBe(true);
    }
  });
  it("maps every seeded campaign and device label to a key that has an entry", () => {
    for (const d of DIMENSION_DEFS.campaign) {
      const k = campaignKey(d.label);
      expect(k, d.label).not.toBeNull();
      expect(glossary[k!].purpose, d.label).toBeTruthy();
    }
    for (const d of DIMENSION_DEFS.device) {
      const k = deviceKey(d.label);
      expect(k, d.label).not.toBeNull();
      expect(glossary[k!].label, d.label).toBeTruthy();
    }
    expect(campaignKey("Nope")).toBeNull();
    expect(deviceKey("Nope")).toBeNull();
  });
  it("has a drive hint for every named feeder market except Other, and hints nothing the seed never produces", () => {
    for (const d of DIMENSION_DEFS.feeder_market) if (d.label !== "Other") expect(MARKET_HINTS[d.label], d.label).toBeTruthy();
    const seeded = new Set(DIMENSION_DEFS.feeder_market.map((d) => d.label));
    for (const hinted of Object.keys(MARKET_HINTS)) expect(seeded.has(hinted), hinted).toBe(true);
  });
  it("names the headline metric direct_bookings, the key every screen asks for", () => {
    expect(glossary.direct_bookings.label).toBe("Direct bookings from Autumn");
  });
  it("valueLabel gives campaigns their plain name and passes cities through unchanged", () => {
    expect(valueLabel("Chicago, IL")).toBe("Chicago, IL");
    expect(valueLabel("Retargeting")).toBe("Reminders");
    expect(valueLabel("Brand Protection")).toBe("Brand protection");
  });
});
