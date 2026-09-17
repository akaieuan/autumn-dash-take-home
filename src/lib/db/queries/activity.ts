import { sql } from "drizzle-orm";
import { n, rowsOf, toCents, type AnyDb } from "./types";
import { addDays, dayOfWeek, eachDay } from "@/lib/date-range";
import { METRIC_COLUMN, type TrendMetric } from "./overview";

export interface ActivityDay { date: string; value: number | null }

export interface ActivityDto {
  metric: TrendMetric;
  /** First cell: the Sunday on or before the window's first day, so every column is a whole week. */
  from: string;
  to: string;
  weeks: number;
  /** Largest daily value in the window; the colour ramp's top step. 0 when every day is empty. */
  max: number;
  total: number;
  /** One entry per day of [from, to] in order; `null` for a day the data does not cover. */
  days: ActivityDay[];
}

/**
 * The activity calendar's data: a trailing window of whole weeks ending on `to`. A day before the
 * data starts is `null`, never 0, so the calendar can leave it blank instead of drawing a quiet day.
 * Money metrics come back in cents, like every other DTO.
 */
export async function getActivity(db: AnyDb, to: string, metric: TrendMetric, weeks = 53): Promise<ActivityDto> {
  const earliest = addDays(to, -(weeks * 7 - 1));
  const from = addDays(earliest, -dayOfWeek(earliest));
  const rows = rowsOf<{ d: string; v: unknown }>(
    await db.execute(sql`select date::text as d, ${sql.raw(METRIC_COLUMN[metric])} as v from daily_metrics where date between ${from} and ${to}`),
  );
  const byDay = new Map(rows.map((r) => [r.d, metric === "booking_value" ? toCents(r.v) : n(r.v)]));
  const days = eachDay(from, to).map((date) => ({ date, value: byDay.has(date) ? (byDay.get(date) as number) : null }));
  const values = days.flatMap((d) => (d.value === null ? [] : [d.value]));
  return {
    metric, from, to,
    weeks: Math.ceil(days.length / 7),
    max: values.length ? Math.max(...values) : 0,
    total: values.reduce((a, b) => a + b, 0),
    days,
  };
}
