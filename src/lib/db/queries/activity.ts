import { sql } from "drizzle-orm";
import { n, rowsOf, toCents, type AnyDb } from "./types";
import { dayOfWeek, eachDay } from "@/lib/date-range";
import { METRIC_COLUMN, type TrendMetric } from "./overview";

/**
 * One cell of the calendar. `value` is the chosen metric; the other three are what the day card
 * reads out beside it. All four are null together for a day the data does not cover.
 */
export interface ActivityDay {
  date: string;
  value: number | null;
  newVisitors: number | null;
  bookings: number | null;
  pagesPerSession: number | null;
}

export interface ActivityDto {
  metric: TrendMetric;
  /** The page range's own first day: the calendar follows `?range=` (D41), it does not pick a window. */
  from: string;
  to: string;
  /** Calendar columns the days span once the first one is pushed under its weekday: ceil((weekday(from) + days) / 7). */
  weeks: number;
  /** Largest daily value in the window; the colour ramp's top step. 0 when every day is empty. */
  max: number;
  total: number;
  /** One entry per day of [from, to] in order; `null` for a day the data does not cover. */
  days: ActivityDay[];
}

/**
 * The activity calendar's data: exactly the days of `[from, to]`, in order, no Sunday padding —
 * the component pads its own grid, so this DTO is the page range and nothing more (D41). A day the
 * data has no row for is `null` in every field, never 0, so the calendar leaves it blank instead of
 * drawing a quiet day. Money metrics come back in cents, like every other DTO.
 */
export async function getActivity(db: AnyDb, from: string, to: string, metric: TrendMetric): Promise<ActivityDto> {
  const rows = rowsOf<{ d: string; v: unknown; nv: unknown; bk: unknown; pps: unknown }>(
    await db.execute(
      sql`select date::text as d, ${sql.raw(METRIC_COLUMN[metric])} as v, new_visitors as nv, bookings as bk, pages_per_session as pps from daily_metrics where date between ${from} and ${to}`,
    ),
  );
  const byDay = new Map(
    rows.map((r) => [
      r.d,
      {
        value: metric === "booking_value" ? toCents(r.v) : n(r.v),
        newVisitors: n(r.nv),
        bookings: n(r.bk),
        pagesPerSession: n(r.pps),
      },
    ]),
  );
  const blank = { value: null, newVisitors: null, bookings: null, pagesPerSession: null };
  const days: ActivityDay[] = eachDay(from, to).map((date) => ({ date, ...(byDay.get(date) ?? blank) }));
  const values = days.flatMap((d) => (d.value === null ? [] : [d.value]));
  return {
    metric, from, to,
    weeks: Math.ceil((dayOfWeek(from) + days.length) / 7),
    max: values.length ? Math.max(...values) : 0,
    total: values.reduce((a, b) => a + b, 0),
    days,
  };
}
