/**
 * How far back the activity calendar draws. Kept in a cookie, like the sidebar, so the server renders
 * the span the browser will show and the first paint never re-lays the page (Lighthouse 2026-09-17
 * measured a 0.19 layout shift when the choice lived only in localStorage).
 */
export type CalendarSpan = "year" | "half" | "quarter";
export const CALENDAR_SPANS: CalendarSpan[] = ["year", "half", "quarter"];
export const CALENDAR_SPAN_COOKIE = "autumn-calendar-span";
const MAX_AGE = 60 * 60 * 24 * 365;

export const parseCalendarSpan = (value: string | undefined): CalendarSpan =>
  CALENDAR_SPANS.includes(value as CalendarSpan) ? (value as CalendarSpan) : "half";

export function writeCalendarSpanCookie(span: CalendarSpan): void {
  document.cookie = `${CALENDAR_SPAN_COOKIE}=${span}; path=/; max-age=${MAX_AGE}; samesite=lax`;
}
