"use client";
import type { ActivityDay } from "@/lib/db/queries";
import { count, shortDate, weekdayDate, weekdayShort } from "@/lib/format";
import { cn } from "@/lib/utils";

const EYEBROW = "text-[11px] font-medium uppercase tracking-wide text-muted-foreground";
const BAR_ROOM = 56; // px left for a bar once the value and the weekday letters have their lines

const dayLabel = (day: ActivityDay, unit: string) => `${weekdayDate(day.date)}: ${day.value === null ? "no data" : `${count(day.value)} ${unit}`}`;

/**
 * The seven days around the one being read, so a spike has a week to stand against. Each column is a
 * button: the fastest way to step sideways without learning the keyboard.
 */
export function WeekStrip({ days, pinned, onPick, unit }: { days: (ActivityDay | null)[]; pinned: string | null; onPick?: (date: string) => void; unit: string }) {
  const first = days.find((d) => d !== null) ?? null;
  const max = Math.max(0, ...days.map((d) => d?.value ?? 0));
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className={EYEBROW}>The week of {first ? shortDate(first.date) : "—"}</span>
      <div className="grid h-24 grid-cols-7 items-end gap-1">
        {days.map((d, i) =>
          d === null ? (
            <div key={`empty-${i}`} aria-hidden="true" />
          ) : (
            <button
              key={d.date}
              type="button"
              aria-pressed={pinned === d.date}
              aria-label={dayLabel(d, unit)}
              onClick={() => onPick?.(d.date)}
              className="flex h-full flex-col items-center justify-end gap-1"
            >
              <span className="text-[11px] leading-none tabular-nums text-muted-foreground">{d.value === null ? "—" : count(d.value)}</span>
              <span
                aria-hidden="true"
                className={cn("w-full max-w-8 shrink-0 rounded-t-(--radius-min)", pinned === d.date ? "bg-(--chart-1)" : "bg-(--heat-2)")}
                style={{ height: `${max > 0 ? Math.max(4, Math.round((BAR_ROOM * (d.value ?? 0)) / max)) : 4}px` }}
              />
              <span className="text-[11px] leading-none text-muted-foreground">{weekdayShort(i).slice(0, 2)}</span>
            </button>
          ),
        )}
      </div>
    </div>
  );
}

const ordinal = (n: number) => {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
};

/** Where the day's month sits in the year: a total, a rank, and the month before it. */
export function MonthSummary({
  label,
  total,
  rank,
  count: months,
  deltaPct,
  unit,
}: {
  label: string;
  total: number;
  rank: number;
  count: number;
  deltaPct: number | null;
  unit: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className={EYEBROW}>{label}</span>
      <p className="flex items-baseline gap-1.5">
        <span className="text-[22px] font-semibold leading-tight tabular-nums">{count(total)}</span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </p>
      <p className="text-xs text-muted-foreground">{rank === 1 ? "Your busiest month of the year" : `${ordinal(rank)} busiest of ${months} months`}</p>
      <p className={cn("text-xs", deltaPct === null ? "text-muted-foreground" : deltaPct < 0 ? "text-watch" : "text-positive")}>
        {deltaPct === null ? "No month before it in the data" : `${deltaPct > 0 ? "+" : ""}${deltaPct}% vs the month before`}
      </p>
    </div>
  );
}
