"use client";
import { useSyncExternalStore } from "react";

export type CalendarSpan = "year" | "half" | "quarter";
export const CALENDAR_SPANS: CalendarSpan[] = ["year", "half", "quarter"];
const KEY = "autumn:calendar-span";
const EVENT = "autumn:calendar-span-change";

const read = (): CalendarSpan => {
  try {
    const v = window.localStorage.getItem(KEY);
    return CALENDAR_SPANS.includes(v as CalendarSpan) ? (v as CalendarSpan) : "half";
  } catch {
    return "half";
  }
};

const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
};

/** How far back the calendar draws. Per browser; the server snapshot is always "half", so the first paint matches the server HTML. */
export function useCalendarSpan(): [CalendarSpan, (s: CalendarSpan) => void] {
  const span = useSyncExternalStore(subscribe, read, () => "half" as CalendarSpan);
  const set = (s: CalendarSpan) => {
    try {
      window.localStorage.setItem(KEY, s);
    } catch {
      /* private mode: the choice lasts for this render only */
    }
    window.dispatchEvent(new Event(EVENT));
  };
  return [span, set];
}
