import { monthShort } from "./format";

/**
 * The arithmetic behind the activity calendar: heat steps, month labels, weekday rhythm,
 * and the two window helpers the span toggle needs. Pure and UI-free, so every rule here
 * is proved by `tests/activity.test.ts` rather than by a rendered DOM.
 */

export interface DayLike {
  date: string;
  value: number | null;
}

const toUTC = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

/** 0 = Sunday … 6 = Saturday, from the ISO date in UTC (never the wall clock). */
export const weekdayOf = (date: string): number => new Date(toUTC(date)).getUTCDay();

const addUtcDays = (iso: string, n: number) => new Date(toUTC(iso) + n * 86_400_000).toISOString().slice(0, 10);

/** 0 for a quiet day, then quartiles of the window's own maximum, so any hotel gets a readable spread. */
export function heatLevel(value: number | null, max: number): number | null {
  if (value === null) return null;
  if (value <= 0 || max <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((value / max) * 4)));
}

/** Column index (1-based) → label, for weeks whose first day starts a new month; a stub month at the left edge is skipped. */
export function monthColumns(days: { date: string }[]): { column: number; label: string }[] {
  const out: { column: number; label: string }[] = [];
  let last = "";
  for (let i = 0; i * 7 < days.length; i++) {
    const m = days[i * 7].date.slice(0, 7);
    if (m !== last) {
      if (last !== "" || (i === 0 && days[Math.min(days.length - 1, 21)].date.slice(0, 7) === m)) out.push({ column: i + 1, label: monthShort(days[i * 7].date) });
      last = m;
    }
  }
  return out;
}

/** Average of the non-null values of each weekday, [Sun..Sat]; a weekday with no data averages 0. */
export function weekdayAverages(days: DayLike[]): { weekday: number; average: number }[] {
  const sums = Array.from({ length: 7 }, () => ({ total: 0, n: 0 }));
  for (const d of days) {
    if (d.value === null) continue;
    const w = sums[weekdayOf(d.date)];
    w.total += d.value;
    w.n += 1;
  }
  return sums.map((w, weekday) => ({ weekday, average: w.n === 0 ? 0 : w.total / w.n }));
}

/** Sum of the non-null values of each calendar month, in order of appearance; key "YYYY-MM". */
export function monthTotals(days: DayLike[]): { key: string; total: number }[] {
  const out: { key: string; total: number }[] = [];
  const index = new Map<string, number>();
  for (const d of days) {
    const key = d.date.slice(0, 7);
    let at = index.get(key);
    if (at === undefined) {
      at = out.length;
      index.set(key, at);
      out.push({ key, total: 0 });
    }
    if (d.value !== null) out[at].total += d.value;
  }
  return out;
}

/** The Sunday..Saturday week containing `date`, taken from `days`; a slot the array does not cover is null. */
export function weekOf<T extends DayLike>(days: T[], date: string): (T | null)[] {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const sunday = addUtcDays(date, -weekdayOf(date));
  return Array.from({ length: 7 }, (_, i) => byDate.get(addUtcDays(sunday, i)) ?? null);
}

/**
 * The last `weeks` columns of `days`, starting on a Sunday. It walks back from the naive cut to the
 * week's Sunday, then forward a week at a time if that overshot: a trailing partial week must not
 * buy an extra column, or the "13 weeks" span would quietly draw fourteen.
 * `weeks >= ceil(days.length / 7)` returns all of `days`.
 */
export function lastWeeks<T extends DayLike>(days: T[], weeks: number): T[] {
  if (weeks <= 0 || days.length === 0) return [];
  const columns = Math.ceil(days.length / 7);
  if (weeks >= columns) return days;
  let start = days.length - weeks * 7;
  while (start > 0 && weekdayOf(days[start].date) !== 0) start -= 1;
  while (start + 7 < days.length && Math.ceil((days.length - start) / 7) > weeks) start += 7;
  return days.slice(start);
}

/** How far back the calendar draws. The toggle's own type lives beside the hook; this is its arithmetic. */
export type ActivitySpan = "year" | "half" | "quarter";
const SPAN_WEEKS: Record<ActivitySpan, number> = { year: 0, half: 26, quarter: 13 };

/** The days a span shows: the year is everything, the others are the last whole 26 or 13 columns. */
export function visibleWindow<T extends DayLike>(days: T[], span: ActivitySpan): T[] {
  return span === "year" ? days : lastWeeks(days, SPAN_WEEKS[span]);
}

/** Where a day sits among every day with data, and among its own weekday; 1 is the busiest. */
export interface DayRank {
  day: number;
  days: number;
  weekday: number;
  weekdays: number;
}

export function dayRank(days: DayLike[], date: string): DayRank | null {
  const picked = days.find((d) => d.date === date);
  if (picked === undefined || picked.value === null) return null;
  const value = picked.value;
  const withData = days.filter((d) => d.value !== null);
  const sameWeekday = withData.filter((d) => weekdayOf(d.date) === weekdayOf(date));
  const above = (xs: DayLike[]) => xs.filter((d) => (d.value as number) > value).length + 1;
  return { day: above(withData), days: withData.length, weekday: above(sameWeekday), weekdays: sameWeekday.length };
}

/** The month a day belongs to, ranked in the year and compared with the month before it. */
export interface MonthContext {
  label: string;
  total: number;
  rank: number;
  count: number;
  deltaPct: number | null;
}

export function monthContext(days: DayLike[], date: string | null): MonthContext | null {
  if (date === null) return null;
  const months = monthTotals(days);
  const at = months.findIndex((m) => m.key === date.slice(0, 7));
  if (at === -1) return null;
  const month = months[at];
  const before = at > 0 ? months[at - 1] : null;
  return {
    label: `${monthShort(`${month.key}-01`)} ${month.key.slice(0, 4)}`,
    total: month.total,
    rank: months.filter((m) => m.total > month.total).length + 1,
    count: months.length,
    deltaPct: before === null || before.total === 0 ? null : Math.round(((month.total - before.total) / before.total) * 100),
  };
}

/** The week around the picked day, or nothing at all while no day is picked. */
export function weekContext<T extends DayLike>(days: T[], date: string | null): (T | null)[] {
  return date === null ? [] : weekOf(days, date);
}

/** "2026-01" back two months is "2025-11": month keys are arithmetic on y × 12 + m, never a Date. */
const monthKeyBack = (key: string, n: number): string => {
  const [y, m] = key.split("-").map(Number);
  const t = y * 12 + (m - 1) - n;
  return `${String(Math.floor(t / 12)).padStart(4, "0")}-${String((t % 12) + 1).padStart(2, "0")}`;
};

/**
 * For a narrow calendar: the last `count` calendar months, oldest first, ending with the month of the
 * last day in `days`. A square that means four days still reads as a day and hides the distance
 * (owner, 2026-09-17), so a phone gets month blocks instead — big enough to carry a name, a total and
 * a change. A month the data never reached is padded rather than dropped, so the grid stays 6 or 12.
 * Each block carries its busiest day, so tapping it keeps that day open exactly as a tile does.
 */
export interface MonthBlock { key: string; total: number | null; busiest: string | null; deltaPct: number | null }
export function monthBlocks(days: DayLike[], count: number): MonthBlock[] {
  if (days.length === 0 || count <= 0) return [];
  const months = new Map<string, { total: number | null; busiest: string | null; best: number }>();
  for (const d of days) {
    const key = d.date.slice(0, 7);
    let m = months.get(key);
    if (m === undefined) {
      m = { total: null, busiest: null, best: -Infinity };
      months.set(key, m);
    }
    if (d.value === null) continue;
    m.total = (m.total ?? 0) + d.value;
    if (d.value > m.best) {
      m.best = d.value;
      m.busiest = d.date;
    }
  }
  const last = days[days.length - 1].date.slice(0, 7);
  const out: MonthBlock[] = [];
  for (let back = count - 1; back >= 0; back--) {
    const key = monthKeyBack(last, back);
    const total = months.get(key)?.total ?? null;
    // The month before it in the calendar, even when that month sits outside the window being drawn.
    const before = months.get(monthKeyBack(key, 1))?.total ?? null;
    out.push({
      key,
      total,
      busiest: months.get(key)?.busiest ?? null,
      deltaPct: total === null || before === null || before === 0 ? null : Math.round(((total - before) / before) * 100),
    });
  }
  return out;
}
