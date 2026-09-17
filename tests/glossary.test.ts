import { describe, it, expect } from "vitest";
import { glossary, valueLabel } from "@/lib/glossary";
import { DIMENSION_DEFS } from "../scripts/seed/profile";

describe("glossary", () => {
  it("every label is plain (no bare acronym) and every meaning is a sentence", () => {
    for (const [key, e] of Object.entries(glossary)) {
      expect(e.label, key).not.toMatch(/\b(CTR|CVR|ROAS|CPC|OTA)\b/);
      expect(e.meaning.length, key).toBeGreaterThan(20);
      expect(e.meaning.trim().endsWith("."), key).toBe(true);
    }
  });
  it("has a plain-language entry with a purpose for every seeded campaign", () => {
    for (const c of DIMENSION_DEFS.campaign) {
      const e = glossary[c.label as keyof typeof glossary];
      expect(e, c.label).toBeDefined();
      expect(e.purpose, c.label).toBeTruthy();
    }
  });
  it("valueLabel passes cities and devices through unchanged", () => {
    expect(valueLabel("Chicago, IL")).toBe("Chicago, IL");
    expect(valueLabel("Retargeting")).toBe("Reminders");
  });
});
