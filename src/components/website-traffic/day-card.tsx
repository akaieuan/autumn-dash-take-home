import type { ActivityDay } from "@/lib/db/queries";
import { count, deltaText, delta, oneIn, ordinal, perVisit, weekdayDate } from "@/lib/format";
import { weekdayOf } from "@/lib/activity";
import type { DayRank } from "@/lib/activity";
import { Eyebrow } from "@/components/copy";
import { Meter } from "@/components/charts";
import { cn } from "@/lib/utils";

const WEEKDAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DASH = "—";

function Stat({ label, value, note, tone }: { label: string; value: string; note?: string | null; tone?: "positive" | "watch" }) {
  return (
    <div className="flex flex-col gap-0.5">
      <Eyebrow>{label}</Eyebrow>
      <span className="text-[22px] font-semibold leading-tight tabular-nums">{value}</span>
      {/* Always one line, so a day without a note is the same height as one with it: hovering never re-flows the card. */}
      <span className={cn("min-h-4 truncate text-[11px]", tone === "positive" ? "text-positive" : tone === "watch" ? "text-watch" : "text-muted-foreground")}>{note ?? "\u00a0"}</span>
    </div>
  );
}

/**
 * The one day the reader is looking at, in words. Its height is fixed, so moving the pointer across
 * the calendar never moves the page under the pointer. The rank it shows is `DayRank`, computed in
 * `@/lib/activity` (design audit item 9) rather than declared a second time here.
 */

export function DayCard({ day, typical, mode, unit, rank = null, className }: { day: ActivityDay | null; typical: number | null; mode: "hover" | "pinned"; unit: string; rank?: DayRank | null; className?: string }) {
  const eyebrow = mode === "hover" ? "Pointing at" : "Kept open";
  const shell = cn("flex min-h-(--card-day) min-w-0 flex-col gap-3.5 rounded-(--r-in) bg-background p-(--panel-pad)", className);

  if (day === null) {
    return (
      <aside aria-label="Selected day" className={shell}>
        <div className="flex flex-col gap-0.5">
          <Eyebrow>{eyebrow}</Eyebrow>
          <p className="text-[18px] font-semibold leading-tight">Pick a day</p>
        </div>
        <p className="text-xs text-muted-foreground">Point at a tile to read it; click to keep it open.</p>
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
        <Eyebrow>{eyebrow}</Eyebrow>
        <p className="truncate text-[18px] font-semibold leading-tight tabular-nums">{`${weekdayDate(day.date)}, ${day.date.slice(0, 4)}`}</p>
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
          value={day.pagesPerSession === null ? DASH : perVisit(day.pagesPerSession)}
          note={day.pagesPerSession === null ? null : "per visit"}
        />
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <Eyebrow>{`Against a typical ${weekday}`}</Eyebrow>
        <Meter
          share={share}
          label={`This ${weekday} against a typical one`}
          color={hasTypical && day.value !== null && day.value >= (typical as number) ? "var(--chart-1)" : "var(--chart-2)"}
        />
        <p className="truncate text-xs text-muted-foreground">{hasTypical ? `A typical ${weekday} brings ${count(typical as number)} ${unit}.` : `No typical ${weekday} to compare with yet.`}</p>
      </div>
      <dl className="grid grid-cols-2 gap-3 border-t border-border pt-3">
        <div className="flex flex-col gap-0.5">
          <Eyebrow as="dt">In the year</Eyebrow>
          <dd className="text-sm font-semibold tabular-nums">{rank ? (rank.day === 1 ? "Busiest day" : `${ordinal(rank.day)} busiest`) : DASH}</dd>
          <dd className="text-[11px] text-muted-foreground">{rank ? `of ${count(rank.days)} days` : "no data"}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <Eyebrow as="dt">{`Among ${weekday}s`}</Eyebrow>
          <dd className="text-sm font-semibold tabular-nums">{rank ? (rank.weekday === 1 ? "Busiest" : `${ordinal(rank.weekday)} busiest`) : DASH}</dd>
          <dd className="text-[11px] text-muted-foreground">{rank ? `of ${count(rank.weekdays)} ${weekday}s` : "no data"}</dd>
        </div>
      </dl>
    </aside>
  );
}
