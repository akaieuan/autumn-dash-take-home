import type { ActivityDay } from "@/lib/db/queries";
import { count, deltaText, delta, oneIn, weekdayDate } from "@/lib/format";
import { weekdayOf } from "@/lib/activity";
import { Meter } from "@/components/charts";
import { cn } from "@/lib/utils";

const WEEKDAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DASH = "—";
const EYEBROW = "text-[11px] font-medium uppercase tracking-wide text-muted-foreground";

function Stat({ label, value, note, tone }: { label: string; value: string; note?: string | null; tone?: "positive" | "watch" }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={EYEBROW}>{label}</span>
      <span className="text-[22px] font-semibold leading-tight tabular-nums">{value}</span>
      {note ? <span className={cn("text-[11px]", tone === "positive" ? "text-positive" : tone === "watch" ? "text-watch" : "text-muted-foreground")}>{note}</span> : null}
    </div>
  );
}

/**
 * The one day the reader is looking at, in words. Its height is fixed, so moving the pointer across
 * the calendar never moves the page under the pointer.
 */
export interface DayRank { day: number; days: number; weekday: number; weekdays: number }

const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th"}`;

export function DayCard({ day, typical, mode, unit, rank = null }: { day: ActivityDay | null; typical: number | null; mode: "hover" | "pinned"; unit: string; rank?: DayRank | null }) {
  const eyebrow = mode === "hover" ? "Pointing at" : "Kept open";
  const shell = "flex min-h-[19rem] min-w-0 flex-col gap-3.5 rounded-(--r-in) bg-background p-(--panel-pad)";

  if (day === null) {
    return (
      <aside aria-label="Selected day" className={shell}>
        <span className={EYEBROW}>{eyebrow}</span>
        <p className="text-[18px] font-semibold leading-tight">Pick a day</p>
      </aside>
    );
  }

  const weekday = WEEKDAY_FULL[weekdayOf(day.date)];
  const short = weekdayDate(day.date).split(",")[0];
  const hasTypical = typical !== null && typical > 0;
  const vsTypical = hasTypical && day.value !== null ? deltaText(day.value, typical, `a typical ${short}`) : null;
  const tone = hasTypical && day.value !== null ? delta(day.value, typical).direction : "flat";
  const share = hasTypical && day.value !== null ? day.value / (typical * 1.6) : 0;

  return (
    <aside aria-label="Selected day" className={shell}>
      <div className="flex flex-col gap-0.5">
        <span className={EYEBROW}>{eyebrow}</span>
        <p className="text-[18px] font-semibold leading-tight tabular-nums">{`${weekdayDate(day.date)}, ${day.date.slice(0, 4)}`}</p>
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <Stat
          label="Visits"
          value={day.value === null ? DASH : count(day.value)}
          note={vsTypical}
          tone={tone === "up" ? "positive" : tone === "down" ? "watch" : undefined}
        />
        <Stat
          label="New visitors"
          value={day.newVisitors === null ? DASH : count(day.newVisitors)}
          note={day.newVisitors !== null ? "from any source" : null}
        />
        <Stat
          label="Bookings"
          value={day.bookings === null ? DASH : count(day.bookings)}
          note={day.bookings === null ? null : day.bookings === 0 ? "none that day" : day.value ? `${oneIn(day.bookings / day.value)} visits booked` : null}
        />
        <Stat
          label="Pages per visit"
          value={day.pagesPerSession === null ? DASH : day.pagesPerSession.toFixed(1)}
          note={day.pagesPerSession === null ? null : "per visit"}
        />
      </div>

      {hasTypical ? (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <span className={EYEBROW}>{`Against a typical ${weekday}`}</span>
          <Meter
            share={share}
            label={`This ${weekday} against a typical one`}
            color={day.value !== null && day.value >= (typical as number) ? "var(--chart-1)" : "var(--chart-2)"}
          />
          <p className="text-xs text-muted-foreground">{`A typical ${weekday} brings ${count(typical as number)} ${unit}.`}</p>
        </div>
      ) : null}
      {rank && day.value !== null ? (
        // Where the day sits in the year and among its own weekdays: the two questions a busy day raises.
        <dl className="grid grid-cols-2 gap-3 border-t border-border pt-3">
          <div className="flex flex-col gap-0.5">
            <dt className={EYEBROW}>In the year</dt>
            <dd className="text-sm font-semibold tabular-nums">{rank.day === 1 ? "Busiest day" : `${ordinal(rank.day)} busiest`}</dd>
            <dd className="text-[11px] text-muted-foreground">of {count(rank.days)} days</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className={EYEBROW}>Among {weekday}s</dt>
            <dd className="text-sm font-semibold tabular-nums">{rank.weekday === 1 ? "Busiest" : `${ordinal(rank.weekday)} busiest`}</dd>
            <dd className="text-[11px] text-muted-foreground">of {count(rank.weekdays)} {weekday}s</dd>
          </div>
        </dl>
      ) : null}
    </aside>
  );
}
