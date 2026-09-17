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
