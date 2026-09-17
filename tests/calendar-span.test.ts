import { describe, it, expect } from "vitest";
import { parseCalendarSpan, CALENDAR_SPANS } from "@/lib/calendar-span";

describe("calendar span cookie", () => {
  it("accepts the three spans and falls back to six months for anything else", () => {
    for (const s of CALENDAR_SPANS) expect(parseCalendarSpan(s)).toBe(s);
    expect(parseCalendarSpan(undefined)).toBe("half");
    expect(parseCalendarSpan("forever")).toBe("half");
  });
});
