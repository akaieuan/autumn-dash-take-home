import type { ActivityDay } from "@/lib/db/queries";
import { cap, count, deltaText, delta, oneIn, ordinal, perVisit, weekdayDate } from "@/lib/format";
import { weekdayOf } from "@/lib/activity";
import type { DayRank, MonthContext, WeekSummary } from "@/lib/activity";
import { Eyebrow } from "@/components/copy";
import { cn } from "@/lib/utils";

const WEEKDAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DASH = "—";

function Stat({ label, value, note, tone, size = "lg" }: { label: string; value: string; note?: string | null; tone?: "positive" | "watch"; size?: "lg" | "md" }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <Eyebrow className="truncate">{label}</Eyebrow>
      <span className={cn("truncate font-semibold leading-tight tabular-nums", size === "lg" ? "text-[22px]" : "text-lg")}>{value}</span>
      {/* Always one line, so a day without a note is the same height as one with it: hovering never re-flows the band. */}
      <span className={cn("min-h-4 truncate text-[11px]", tone === "positive" ? "text-positive" : tone === "watch" ? "text-watch" : "text-muted-foreground")}>{note ?? " "}</span>
    </div>
  );
}

/**
 * The one day the reader is looking at, in words — a band under the grid rather than a column beside
 * it (owner, 2026-09-17: the click information belongs under the tiles, and the tiles want the whole
 * panel). Two rows: the day, its rank and its four readings; then what it sits inside — a typical
 * day of its weekday, its week and its month — as figures, not a second chart (owner, the same day:
 * "we don't need a chart for that"). Its height is fixed and every cell always renders, so moving the
 * pointer across the calendar never moves the page under the pointer. It is laid out by its own
 * container width, because the calendar sets it beside a short grid and under a long one.
 */
export function DayCard({
  day,
  typical,
  mode,
  unit,
  rank = null,
  week = null,
  month = null,
  className,
}: {
  day: ActivityDay | null;
  typical: number | null;
  mode: "hover" | "pinned";
  unit: string;
  rank?: DayRank | null;
  week?: WeekSummary | null;
  month?: MonthContext | null;
  className?: string;
}) {
  const eyebrow = mode === "hover" ? "Pointing at" : "Kept open";
  const shell = cn("flex min-h-(--card-day-stacked) min-w-0 flex-col gap-3 rounded-(--r-in) bg-background p-(--panel-pad) @lg:min-h-(--card-day)", className);
  // Two abreast when narrow; from 32rem the date takes a line of its own over four readings; from 42rem one row of five.
  const row1 = "grid grid-cols-2 gap-3 @lg:grid-cols-4 @2xl:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))]";
  const row2 = "grid grid-cols-2 gap-3 border-t border-border pt-3 @md:grid-cols-3";

  if (day === null) {
    return (
      <aside aria-label="Selected day" className={shell}>
        <div className="flex flex-col gap-0.5">
          <Eyebrow>{eyebrow}</Eyebrow>
          <p className="text-[18px] font-semibold leading-tight">Pick a day</p>
          <p className="text-xs text-muted-foreground">Point at a tile to read it; click to keep it open.</p>
        </div>
      </aside>
    );
  }

  const weekday = WEEKDAY_FULL[weekdayOf(day.date)];
  const short = weekdayDate(day.date).split(",")[0];
  const hasTypical = typical !== null && typical > 0;
  const vsTypical = hasTypical && day.value !== null ? deltaText(day.value, typical, `a typical ${short}`) : null;
  const tone = hasTypical && day.value !== null ? delta(day.value, typical).direction : "flat";
  // One line, both ranks: where the day sits in the range the page is showing, and among its own weekday.
  const rankLine = rank
    ? `${ordinal(rank.day)} of ${count(rank.days)} days · ${ordinal(rank.weekday)} of ${count(rank.weekdays)} ${weekday}s`
    : "No ranking for a day without data";

  const weekNote = week?.busiest ? `busiest on ${WEEKDAY_FULL[weekdayOf(week.busiest)]}` : week ? "no data that week" : null;
  // Short enough for a third of the band: "Busiest month · +8% vs Aug", "3rd of 9 months · -4% vs Jul".
  const monthNote = month
    ? `${month.rank === 1 ? "Busiest month" : `${ordinal(month.rank)} of ${count(month.count)} months`}${
        month.deltaPct === null || month.before === null ? "" : ` · ${month.deltaPct > 0 ? "+" : ""}${month.deltaPct}% vs ${month.before}`
      }`
    : null;

  return (
    <aside aria-label="Selected day" className={shell}>
      <div className={row1}>
        <div className="col-span-2 flex min-w-0 flex-col gap-0.5 @lg:col-span-4 @2xl:col-span-1">
          <Eyebrow>{eyebrow}</Eyebrow>
          <p className="truncate text-[18px] font-semibold leading-tight tabular-nums">{`${weekdayDate(day.date)}, ${day.date.slice(0, 4)}`}</p>
          <span className="min-h-4 truncate text-[11px] text-muted-foreground">{rankLine}</span>
        </div>
        <Stat
          label={cap(unit)}
          value={day.value === null ? DASH : count(day.value)}
          note={vsTypical}
          tone={tone === "up" ? "positive" : tone === "down" ? "watch" : undefined}
        />
        <Stat label="New visitors" value={day.newVisitors === null ? DASH : count(day.newVisitors)} note={day.newVisitors !== null ? "from any source" : null} />
        <Stat
          label="Bookings"
          value={day.bookings === null ? DASH : count(day.bookings)}
          note={day.bookings === null ? null : day.bookings === 0 ? "none that day" : day.value ? `${oneIn(day.bookings / day.value)} visits booked` : null}
        />
        <Stat label="Pages per visit" value={day.pagesPerSession === null ? DASH : perVisit(day.pagesPerSession)} note={day.pagesPerSession === null ? null : "per visit"} />
      </div>

      {/* What the day sits inside. A cell with nothing to say still renders, so the band is one height for every day. */}
      <div className={row2}>
        <Stat
          size="md"
          label={`A typical ${weekday}`}
          value={hasTypical ? count(typical as number) : DASH}
          note={hasTypical ? `${unit} on an average ${weekday}` : `No typical ${weekday} to compare with yet.`}
        />
        <Stat
          size="md"
          label={week ? `The week of ${week.label}` : "This week"}
          value={week?.total === null || week === null ? DASH : count(week.total)}
          note={weekNote}
        />
        <Stat
          size="md"
          label={month ? month.label : "This month"}
          value={month ? count(month.total) : DASH}
          note={monthNote}
          tone={month?.deltaPct !== null && month?.deltaPct !== undefined ? (month.deltaPct < 0 ? "watch" : "positive") : undefined}
        />
      </div>
    </aside>
  );
}
