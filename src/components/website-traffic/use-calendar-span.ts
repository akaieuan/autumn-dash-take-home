"use client";
import { useState } from "react";
import { CALENDAR_SPANS, writeCalendarSpanCookie, type CalendarSpan } from "@/lib/calendar-span";

export { CALENDAR_SPANS, type CalendarSpan };

/**
 * The span the server rendered is the span the browser starts with (it came from the cookie), so
 * there is nothing to reconcile after hydration. A change writes the cookie for the next request.
 */
export function useCalendarSpan(initial: CalendarSpan = "half"): [CalendarSpan, (s: CalendarSpan) => void] {
  const [span, setSpan] = useState<CalendarSpan>(initial);
  const set = (s: CalendarSpan) => {
    setSpan(s);
    try {
      writeCalendarSpanCookie(s);
    } catch {
      /* no document: the choice lasts for this render only */
    }
  };
  return [span, set];
}
