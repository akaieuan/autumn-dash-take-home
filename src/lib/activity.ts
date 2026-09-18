import { monthShort, shortDate } from "./format";

/**
 * The arithmetic behind the activity calendar: heat steps, month labels, weekday rhythm, and the
 * week, month and ranks a picked day sits inside. The calendar draws the page range (D43), so
 * nothing here picks a window any more, and every range is the same geometry — weeks as columns —
 * so nothing here lays out a month either. Pure and UI-free, so every rule is proved by
 * `tests/activity.test.ts` rather than by a rendered DOM.
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

/** Calendar months a range touches, both ends counted: "2026-01-01".."2026-09-16" is 9, two days across a month boundary are 2. */
export function monthsBetween(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty * 12 + tm) - (fy * 12 + fm) + 1;
}

/**
 * One block per calendar month the range touches. Capped at 24: "all" is two years and a day on the
 * seeded data, and a 25th block would hang alone under a 12 x 2 grid, so the oldest stub month is
 * dropped rather than given a row of its own. `monthBlocks` pads any month the data never reached.
 */
export function monthBlocksInRange(days: DayLike[], from: string, to: string): MonthBlock[] {
  return monthBlocks(days, Math.min(monthsBetween(from, to), 24));
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
  /** The month before, by its short name, so a note can say "+8% vs Aug" in the room it has. Null with no month before. */
  before: string | null;
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
    before: before === null ? null : monthShort(`${before.key}-01`),
  };
}

/** The week around the picked day, or nothing at all while no day is picked. */
export function weekContext<T extends DayLike>(days: T[], date: string | null): (T | null)[] {
  return date === null ? [] : weekOf(days, date);
}

/**
 * The picked day's own week, as the band under the calendar reads it out: the Sunday it starts on,
 * what the seven days came to, and which of them was busiest. A day the data does not cover is
 * skipped rather than counted as nothing, so a week half outside the range still totals honestly;
 * a week with no data at all has no total to give.
 */
export interface WeekSummary {
  label: string;
  total: number | null;
  busiest: string | null;
}

export function weekSummary(days: DayLike[], date: string | null): WeekSummary | null {
  if (date === null) return null;
  let total: number | null = null;
  let busiest: string | null = null;
  let best = -Infinity;
  for (const d of weekOf(days, date)) {
    if (d === null || d.value === null) continue;
    total = (total ?? 0) + d.value;
    if (d.value > best) {
      best = d.value;
      busiest = d.date;
    }
  }
  return { label: shortDate(addUtcDays(date, -weekdayOf(date))), total, busiest };
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
