"use client";
import { useRef, useState } from "react";
import type { ActivityDay, ActivityDto } from "@/lib/db/queries";
import { count, longDate, shortDate, weekdayDate, weekdayShort } from "@/lib/format";
import { dayRank, heatLevel, monthColumns, monthContext, bucketGrid, visibleWindow, weekContext, weekdayAverages, weekdayOf } from "@/lib/activity";
import { Panel, PanelHeader, PanelBody } from "@/components/layout";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { CALENDAR_SPANS, useCalendarSpan, type CalendarSpan } from "./use-calendar-span";
import { DayCard } from "./day-card";
import { MonthSummary, WeekStrip } from "./day-context";

/** The barrel takes these from here; the arithmetic itself lives in `@/lib/activity`. */
export { heatLevel, monthColumns } from "@/lib/activity";

/** Five static classes so Tailwind can see them; the tokens follow the theme. */
const LEVEL = ["bg-(--heat-0)", "bg-(--heat-1)", "bg-(--heat-2)", "bg-(--heat-3)", "bg-(--heat-4)"] as const;
const EMPTY = "bg-transparent";
const SPAN_LABEL: Record<CalendarSpan, string> = { year: "Year", half: "6 months", quarter: "13 weeks" };
/** Narrow screens get the same three choices in two characters; the long label stays in `aria-label`. */
const SPAN_SHORT: Record<CalendarSpan, string> = { year: "1y", half: "6m", quarter: "13w" };
const STEP: Record<string, number> = { ArrowRight: 7, ArrowLeft: -7, ArrowDown: 1, ArrowUp: -1, PageDown: 28, PageUp: -28 };

/**
 * How many weeks a calendar of a given width can show and still keep every tile a thumb-sized square:
 * under 28rem the last 13, under 42rem the last 26, wider the chosen span. Columns are auto-placed
 * with no explicit count, so a hidden week simply gives its width to the rest. Static classes, so
 * Tailwind can see them; the same rule covers a week's tiles and its month label.
 */
const weekVisibility = (weeksBack: number) => (weeksBack >= 26 ? "@max-2xl:hidden" : weeksBack >= 13 ? "@max-md:hidden" : "");

const dayLabel = (day: ActivityDay, unit: string) => `${weekdayDate(day.date)}: ${day.value === null ? "no data" : `${count(day.value)} ${unit}`}`;

/**
 * A year of days as a heatmap, one column per week, Sunday at the top. The grid's columns are `1fr`,
 * so whichever span is chosen the whole window fits its panel: fewer weeks simply means bigger tiles,
 * and the year never scrolls sideways. One delegated pointer handler writes the day under the pointer
 * into a fixed-height readout and the day card beside it; a click keeps a day open so the keyboard,
 * the week strip and the month summary all have something to talk about.
 */
export function ActivityCalendar({ activity, unit = "visits", title = "Every day people visited", initialSpan = "half" }: { activity: ActivityDto; unit?: string; title?: string; initialSpan?: CalendarSpan }) {
  const [span, setSpan] = useCalendarSpan(initialSpan);
  const [hover, setHover] = useState<string | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const { days, total, from, to } = activity;

  const visible = visibleWindow(days, span);
  const visibleMax = Math.max(0, ...visible.map((d) => d.value ?? 0));
  const weeks = Math.max(1, Math.ceil(visible.length / 7));
  const busiest = visible.reduce<ActivityDay | null>((b, d) => (d.value !== null && (b === null || d.value > (b.value ?? 0)) ? d : b), null);

  const byDate = new Map(days.map((d) => [d.date, d]));
  const pinnedDate = pin !== null && visible.some((d) => d.date === pin) ? pin : busiest?.date ?? null;
  const pinned = pinnedDate === null ? null : byDate.get(pinnedDate) ?? null;
  const hovered = hover === null ? null : byDate.get(hover) ?? null;
  const shown = hovered ?? pinned;

  // Every figure below is arithmetic on the days, proved in tests/activity.test.ts: this component
  // keeps the state, the handlers and the markup, and asks @/lib/activity for the rest.
  const typical = shown === null ? null : weekdayAverages(days)[weekdayOf(shown.date)].average;
  const rank = shown === null ? null : dayRank(days, shown.date);
  const month = monthContext(days, pinnedDate);

  // Under 28rem a year or six months of day tiles is a field of dots, and month tiles broke the look
  // (owner, 2026-09-17). So every span keeps the 13-week geometry there, 7 rows by 13 columns of the
  // same squares, and only what a square means changes: a day, two days, four days. Same size, same
  // card height, nothing moves when the span changes. A tap keeps the square's busiest day open.
  const daysPerSquare = span === "year" ? 4 : span === "half" ? 2 : 1;
  // The same line at every span, so the three states are the same height on a phone (13 weeks kept the note too).
  const squareNote = daysPerSquare === 1 ? "Each square is a day." : daysPerSquare === 2 ? "Each square is two days." : "Each square is four days.";
  const buckets = daysPerSquare === 1 ? [] : bucketGrid(days, 91, daysPerSquare);
  const bucketMax = Math.max(0, ...buckets.map((b) => b.total ?? 0));
  const bucketColumns = buckets.length > 0 ? monthColumns(buckets.map((b) => ({ date: b.from }))) : [];
  // One cell per week for the month row: the label sits on the week its month starts in, blank otherwise.
  const monthByColumn = new Map(monthColumns(visible).map((m, i) => [m.column, { label: m.label, odd: i % 2 === 1 }]));
  const weekCells = Array.from({ length: weeks }, (_, i) => ({ column: i + 1, back: weeks - 1 - i, month: monthByColumn.get(i + 1) ?? null }));
  const summary = `${count(total)} ${unit} from ${longDate(from)} to ${longDate(to)}${busiest ? `; busiest day ${longDate(busiest.date)} with ${count(busiest.value ?? 0)}` : ""}`;

  // A day tile carries data-date; a narrow-screen square carries data-bucket (its busiest day). Either pins that day.
  const dateUnder = (e: React.SyntheticEvent<HTMLDivElement>) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-date],[data-bucket]");
    return el?.dataset.date ?? el?.dataset.bucket ?? null;
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => setHover(dateUnder(e));
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const date = dateUnder(e);
    setHover(date);
    if (date !== null) setPin(date);
  };

  const focusDay = (date: string) => gridRef.current?.querySelector<HTMLElement>(`[data-date="${date}"]`)?.focus();
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (visible.length === 0) return;
    const at = Math.max(0, visible.findIndex((d) => d.date === pinnedDate));
    let next: number;
    if (e.key === "Home") next = 0;
    else if (e.key === "End") next = visible.length - 1;
    else if (e.key in STEP) next = at + STEP[e.key];
    else return;
    e.preventDefault();
    const date = visible[Math.min(visible.length - 1, Math.max(0, next))].date;
    setPin(date);
    setHover(null);
    focusDay(date);
  };

  const pick = (date: string) => {
    setPin(date);
    setHover(null);
    focusDay(date);
  };
  // Enter and Space on a tile arrive here as a click; one handler on the group serves every tile.
  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const date = dateUnder(e);
    if (date !== null) pick(date);
  };

  return (
    <Panel id="activity">
      <PanelHeader
        headingId="activity-h"
        title={title}
        description="Darker is busier. Point at a day to read it, click to keep it open."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {/* Fixed width, text kept to the right: the day under the pointer changes length, the toggle beside it must not move. */}
            <p aria-live="polite" className="flex h-8 w-52 items-center justify-end truncate whitespace-nowrap tabular-nums text-muted-foreground">
              {shown ? (
                <>
                  <span className="text-foreground">{weekdayDate(shown.date)}</span>
                  <span aria-hidden="true" className="px-1.5">·</span>
                  {shown.value === null ? "no data" : `${count(shown.value)} ${unit}`}
                </>
              ) : (
                "Point at a day"
              )}
            </p>
            <ToggleGroup
              type="single"
              value={span}
              onValueChange={(v) => {
                if (CALENDAR_SPANS.includes(v as CalendarSpan)) setSpan(v as CalendarSpan);
              }}
              aria-label="How far back"
              className="rounded-full border border-border bg-card p-0.5"
            >
              {CALENDAR_SPANS.map((s) => (
                <ToggleGroupItem
                  key={s}
                  value={s}
                  // The accessible name carries both the short and the long label, so the visible text is always part of it.
                  aria-label={`${SPAN_SHORT[s]} ${SPAN_LABEL[s]}`}
                  className="h-7 rounded-full px-2.5 text-xs font-medium text-muted-foreground data-[state=on]:bg-foreground data-[state=on]:text-card sm:px-3"
                >
                  <span className="sm:hidden">{SPAN_SHORT[s]}</span>
                  <span className="hidden sm:inline">{SPAN_LABEL[s]}</span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        }
      />
      <PanelBody className="@container gap-(--stack-gap)">
        {/* Source order is tiles, day card, context: on a phone the day card sits right under the tiles it describes; from lg it stands beside them and spans both rows. */}
        <div className="grid grid-cols-1 gap-(--stack-gap) lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:grid-rows-[auto_auto]">
          {/* This column is its own container: the weeks it shows depend on the width the tiles actually get. */}
          <div className="@container flex min-w-0 flex-col gap-1.5 lg:col-start-1 lg:row-start-1">
            {buckets.length > 0 ? (
              <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-1 @md:hidden">
                <div aria-hidden="true" />
                <div aria-hidden="true" className="grid h-4 grid-flow-col auto-cols-[minmax(0,1fr)] gap-[3px] text-[10px] leading-4 text-muted-foreground">
                  {Array.from({ length: 13 }, (_, c) => {
                    const m = bucketColumns.find((x) => x.column === c + 1);
                    return <span key={c} className="min-w-0 overflow-visible whitespace-nowrap">{m ? m.label : null}</span>;
                  })}
                </div>
                <div aria-hidden="true" />
                <div
                  role="group"
                  aria-label={`Each square is ${daysPerSquare} days: ${count(total)} ${unit} in the last year`}
                  onPointerMove={onMove}
                  onPointerDown={onDown}
                  onPointerLeave={() => setHover(null)}
                  onClick={onClick}
                  className="grid grid-flow-col grid-rows-7 auto-cols-[minmax(0,1fr)] gap-[3px]"
                >
                  {buckets.map((b) => {
                    const level = heatLevel(b.total, bucketMax);
                    const isPinned = pinnedDate !== null && b.from <= pinnedDate && pinnedDate <= b.to;
                    return (
                      <button
                        key={b.from}
                        type="button"
                        data-bucket={b.busiest ?? undefined}
                        data-level={level ?? undefined}
                        aria-label={`${shortDate(b.from)} – ${shortDate(b.to)}: ${b.total === null ? "no data" : `${count(b.total)} ${unit}`}`}
                        aria-pressed={isPinned}
                        disabled={b.busiest === null}
                        tabIndex={-1}
                        className={cn(
                          "aspect-square w-full rounded-(--radius-min) transition-transform motion-safe:hover:scale-110",
                          level === null ? EMPTY : LEVEL[level],
                          isPinned && "ring-2 ring-foreground ring-offset-1 ring-offset-card",
                        )}
                      />
                    );
                  })}
                </div>
              </div>
            ) : null}
            <div className={cn("grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-1", buckets.length > 0 && "hidden @md:grid")}>
              <div aria-hidden="true" />
              <div aria-hidden="true" className={cn("col-start-2 row-start-1 grid h-4 grid-flow-col auto-cols-[minmax(0,1fr)] text-[10px] leading-4 text-muted-foreground", span === "year" ? "gap-[2px]" : "gap-[3px]")}>
                {weekCells.map((w) => (
                  <span key={w.column} className={cn("min-w-0 overflow-visible whitespace-nowrap", weekVisibility(w.back))}>
                    {w.month ? <span className={cn(w.month.odd && "hidden @md:inline")}>{w.month.label}</span> : null}
                  </span>
                ))}
              </div>
              <div aria-hidden="true" className="col-start-1 row-start-2 hidden grid-rows-7 gap-[2px] text-[10px] leading-none text-muted-foreground @md:grid">
                {[0, 1, 2, 3, 4, 5, 6].map((r) => (
                  <span key={r} className="flex items-center">{r % 2 === 1 ? weekdayShort(r) : ""}</span>
                ))}
              </div>
              <div
                ref={gridRef}
                role="group"
                aria-label={summary}
                onPointerMove={onMove}
                onPointerDown={onDown}
                onPointerLeave={() => setHover(null)}
                onClick={onClick}
                onKeyDown={onKeyDown}
                className={cn("col-start-2 row-start-2 grid grid-flow-col grid-rows-7 auto-cols-[minmax(0,1fr)]", span === "year" ? "gap-[2px]" : "gap-[3px]")}
              >
                {visible.map((d, i) => {
                  const level = heatLevel(d.value, visibleMax);
                  const isPinned = d.date === pinnedDate;
                  const back = weeks - 1 - Math.floor(i / 7);
                  return (
                    <button
                      key={d.date}
                      type="button"
                      data-date={d.date}
                      data-level={level ?? undefined}
                      aria-label={dayLabel(d, unit)}
                      aria-pressed={isPinned}
                      tabIndex={isPinned ? 0 : -1}
                      className={cn(
                        "flex aspect-square w-full items-end justify-end overflow-hidden transition-transform motion-safe:hover:scale-110",
                        // A 4px corner on a year's ~10px tile reads as a circle, so the year gets 2px (owner, 2026-09-17).
                        span === "year" ? "rounded-(--radius-tile)" : "rounded-(--radius-min)",
                        level === null ? EMPTY : LEVEL[level],
                        weekVisibility(back),
                        isPinned && "ring-2 ring-foreground ring-offset-1 ring-offset-card",
                        !isPinned && hover === d.date && "ring-2 ring-foreground/50",
                      )}
                    >
                      {span === "quarter" && d.value !== null ? (
                        <span className={cn("hidden px-1 pb-0.5 text-[10px] font-medium leading-none tabular-nums @lg:inline", level === 4 ? "text-card" : "text-foreground")}>
                          {count(d.value)}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                <span className="font-medium tabular-nums text-foreground">{count(total)}</span> {unit} in the last year
                {busiest ? (
                  <>
                    , busiest on <span className="text-foreground">{longDate(busiest.date)}</span>
                  </>
                ) : null}
              </span>
              <span className="@md:hidden">{squareNote}</span>
              <span aria-hidden="true" className="inline-flex items-center gap-1">
                Fewer
                {LEVEL.map((c) => (
                  <span key={c} className={cn("size-2.5", span === "year" ? "rounded-(--radius-tile)" : "rounded-(--radius-min)", c)} />
                ))}
                More
              </span>
            </div>
          </div>

          <DayCard day={shown} typical={typical} mode={hovered ? "hover" : "pinned"} unit={unit} rank={rank} className="lg:col-start-2 lg:row-start-1 lg:row-span-2" />

          <div className="grid grid-cols-1 gap-4 border-t border-border pt-3 md:grid-cols-[minmax(0,1fr)_15rem] lg:col-start-1 lg:row-start-2">
            <div className="min-w-0">
              <WeekStrip days={weekContext(days, pinnedDate)} pinned={pinnedDate} onPick={pick} unit={unit} />
            </div>
            {month ? (
              <div className="min-w-0 md:border-l md:border-border md:pl-4">
                <MonthSummary {...month} unit={unit} />
              </div>
            ) : null}
          </div>
        </div>
      </PanelBody>
    </Panel>
  );
}
