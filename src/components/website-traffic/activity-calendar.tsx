"use client";
import { useRef, useState } from "react";
import type { ActivityDay, ActivityDto } from "@/lib/db/queries";
import { count, longDate, monthShort, weekdayDate, weekdayShort } from "@/lib/format";
import { dayRank, heatLevel, monthBlocks, monthColumns, monthContext, visibleWindow, weekContext, weekdayAverages, weekdayOf } from "@/lib/activity";
import { Panel, PanelHeader, PanelBody } from "@/components/layout";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { CALENDAR_SPANS, useCalendarSpan, type CalendarSpan } from "./use-calendar-span";
import { DayCard } from "./day-card";
import { MonthSummary, WeekStrip } from "./day-context";
import { MonthBlocks } from "./month-blocks";
import { LEVEL, EMPTY } from "./heat-classes";

/** The barrel takes these from here; the arithmetic itself lives in `@/lib/activity`. */
export { heatLevel, monthColumns } from "@/lib/activity";

const SPAN_LABEL: Record<CalendarSpan, string> = { year: "Year", half: "6 months", quarter: "13 weeks" };
/** How many month blocks a span shows on a narrow panel; 13 weeks is short enough to stay day tiles. */
const SPAN_BLOCKS: Record<CalendarSpan, number> = { year: 12, half: 6, quarter: 0 };
const STEP: Record<string, number> = { ArrowRight: 7, ArrowLeft: -7, ArrowDown: 1, ArrowUp: -1, PageDown: 28, PageUp: -28 };

/**
 * The stage is one box at every span on a narrow panel: the block grid is exactly as tall as the
 * 13-week day grid at the same width, so switching span never moves the panel. The 13-week grid
 * there is 13 square columns with a 3px gap and no weekday column, so its height is
 * (W − 12 × 3) / 13 × 7 + 6 × 3, and `cqw` resolves against the tile column's own `@container`.
 */
const STAGE_HEIGHT = "h-[calc((100cqw_-_36px)/13*7_+_18px)]";

const dayLabel = (day: ActivityDay, unit: string) => `${weekdayDate(day.date)}: ${day.value === null ? "no data" : `${count(day.value)} ${unit}`}`;

/** "Apr – Sep 2026" within one year, "Oct 2025 – Sep 2026" across one: the distance the blocks cover. */
function blockDistance(keys: string[]): string {
  const [a, z] = [keys[0], keys[keys.length - 1]];
  const name = (k: string) => monthShort(`${k}-01`);
  return a.slice(0, 4) === z.slice(0, 4) ? `${name(a)} – ${name(z)} ${z.slice(0, 4)}` : `${name(a)} ${a.slice(0, 4)} – ${name(z)} ${z.slice(0, 4)}`;
}

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

  // Under 28rem a year or six months of day tiles is a field of dots. Squares standing for two or
  // four days were tried and rejected the same day (owner, 2026-09-17, D40): a square still reads as
  // a day, and folding days hides how far back the span reaches. Six or twelve month blocks fill the
  // same stage instead, name their months and carry their totals. 13 weeks keeps its day tiles.
  const blocks = SPAN_BLOCKS[span] === 0 ? [] : monthBlocks(days, SPAN_BLOCKS[span]);
  const blockMax = Math.max(0, ...blocks.map((b) => b.total ?? 0));
  // Blocks hide the dates a day tile carries, so the row above them says the distance out loud.
  const distance = blocks.length === 0 ? "" : blockDistance(blocks.map((b) => b.key));
  // The note is one line at every span, so the legend row is the same height whichever stage shows.
  const stageNote = span === "quarter" ? "Each square is a day." : "Each block is a month.";
  // One cell per week for the month row: the label sits on the week its month starts in, blank otherwise.
  const monthByColumn = new Map(monthColumns(visible).map((m, i) => [m.column, { label: m.label, odd: i % 2 === 1 }]));
  const weekCells = Array.from({ length: weeks }, (_, i) => ({ column: i + 1, back: weeks - 1 - i, month: monthByColumn.get(i + 1) ?? null }));
  const summary = `${count(total)} ${unit} from ${longDate(from)} to ${longDate(to)}${busiest ? `; busiest day ${longDate(busiest.date)} with ${count(busiest.value ?? 0)}` : ""}`;

  // A day tile carries data-date; a month block carries data-busiest (its busiest day). Either pins that day.
  const dateUnder = (e: React.SyntheticEvent<HTMLDivElement>) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-date],[data-busiest]");
    return el?.dataset.date ?? el?.dataset.busiest ?? null;
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
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            {/* Under sm the readout takes its own line and reads from the left, under the title, with the
                toggle on the line below at the right (owner, 2026-09-17). From sm it is a fixed width with
                its text kept to the right: the day under the pointer changes length, the toggle must not move. */}
            <p aria-live="polite" className="flex h-8 basis-full items-center truncate whitespace-nowrap tabular-nums text-muted-foreground sm:w-52 sm:basis-auto sm:justify-end">
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
            <div className="flex basis-full justify-end sm:basis-auto">
              <ToggleGroup
                type="single"
                value={span}
                onValueChange={(v) => {
                  if (CALENDAR_SPANS.includes(v as CalendarSpan)) setSpan(v as CalendarSpan);
                }}
                aria-label="How far back"
                className="rounded-full border border-border bg-card p-0.5"
              >
                {/* The full label at every width: "1y" needed an aria-label to be readable, and the
                    three pills fit a 375px panel on their own line anyway (owner, 2026-09-17). */}
                {CALENDAR_SPANS.map((s) => (
                  <ToggleGroupItem
                    key={s}
                    value={s}
                    className="h-7 rounded-full px-3 text-xs font-medium text-muted-foreground data-[state=on]:bg-foreground data-[state=on]:text-card"
                  >
                    {SPAN_LABEL[s]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </div>
        }
      />
      <PanelBody className="@container gap-(--stack-gap)">
        {/* Source order is tiles, day card, context: on a phone the day card sits right under the tiles it describes; from lg it stands beside them and spans both rows. */}
        <div className="grid grid-cols-1 gap-(--stack-gap) lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:grid-rows-[auto_auto]">
          {/* This column is its own container: the weeks it shows depend on the width the tiles actually get. */}
          <div className="@container flex min-w-0 flex-col gap-1.5 lg:col-start-1 lg:row-start-1">
            {blocks.length > 0 ? (
              <div className={cn("grid grid-cols-1 gap-y-1", span === "year" ? "@2xl:hidden" : "@md:hidden")}>
                {/* Where the day grid puts month labels, the block stage puts the whole distance. */}
                <p className="h-4 truncate text-[10px] leading-4 text-muted-foreground">{distance}</p>
                <div
                  role="group"
                  aria-label={`Each block is a month: ${count(total)} ${unit} in the last year`}
                  onPointerMove={onMove}
                  onPointerDown={onDown}
                  onPointerLeave={() => setHover(null)}
                  onClick={onClick}
                  className={STAGE_HEIGHT}
                >
                  <MonthBlocks blocks={blocks} columns={span === "year" ? 4 : 3} unit={unit} pinnedDate={pinnedDate} max={blockMax} />
                </div>
              </div>
            ) : null}
            {/* One column under @md, so the tile grid is exactly 100cqw there and the 13-week stage is
                the height the block stage copies. The weekday names and the second column start at @md. */}
            <div className={cn("grid grid-cols-1 gap-y-1 @md:grid-cols-[auto_minmax(0,1fr)] @md:gap-x-2", span === "half" && "hidden @md:grid", span === "year" && "hidden @2xl:grid")}>
              <div aria-hidden="true" className={cn("grid h-4 grid-flow-col auto-cols-[minmax(0,1fr)] text-[10px] leading-4 text-muted-foreground @md:col-start-2 @md:row-start-1", span === "year" ? "gap-[2px]" : "gap-[3px]")}>
                {weekCells.map((w) => (
                  <span key={w.column} className="min-w-0 overflow-visible whitespace-nowrap">
                    {w.month ? <span className={cn(w.month.odd && "hidden @md:inline")}>{w.month.label}</span> : null}
                  </span>
                ))}
              </div>
              <div aria-hidden="true" className="hidden grid-rows-7 gap-[2px] text-[10px] leading-none text-muted-foreground @md:col-start-1 @md:row-start-2 @md:grid">
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
                className={cn("grid grid-flow-col grid-rows-7 auto-cols-[minmax(0,1fr)] @md:col-start-2 @md:row-start-2", span === "year" ? "gap-[2px]" : "gap-[3px]")}
              >
                {visible.map((d) => {
                  const level = heatLevel(d.value, visibleMax);
                  const isPinned = d.date === pinnedDate;
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
              {/* Visible exactly when the stage it describes is: the year's blocks hold to 42rem. */}
              <span className={span === "year" ? "@2xl:hidden" : "@md:hidden"}>{stageNote}</span>
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
