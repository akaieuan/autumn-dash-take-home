"use client";
import { useRef, useState } from "react";
import type { ActivityDay, ActivityDto } from "@/lib/db/queries";
import { addDays, type DateRange } from "@/lib/date-range";
import { count, longDate, rangeLabel, weekdayDate, weekdayShort } from "@/lib/format";
import { dayRank, heatLevel, monthBlocks, monthBlocksInRange, monthColumns, monthContext, weekSummary, weekdayAverages, weekdayOf } from "@/lib/activity";
import { Panel, PanelHeader, PanelBody } from "@/components/layout";
import { cn } from "@/lib/utils";
import { DayCard } from "./day-card";
import { MonthBlocks, type BlockColumns } from "./month-blocks";
import { LEVEL, EMPTY } from "./heat-classes";

/** The barrel takes these from here; the arithmetic itself lives in `@/lib/activity`. */
export { heatLevel, monthColumns } from "@/lib/activity";

/** Everything the calendar needs of the page range: the preset picks the stage, the dates label it. */
export type CalendarRange = Pick<DateRange, "preset" | "from" | "to">;

/**
 * What a range is drawn as (D41). A square is always a day where it can be at least 12px; where it
 * cannot, the unit becomes a month and the legend says so. "both" means the panel decides by its own
 * width: day squares from 42rem, month blocks below it. Two years is 105 weeks, so it is blocks at
 * every width — a 7px square is not a calendar.
 */
type Stage = "squares" | "both" | "blocks";
const STAGE: Record<DateRange["preset"], Stage> = { "30d": "squares", "90d": "squares", ytd: "both", "12m": "both", all: "blocks" };

/** A square is never wider than this: five columns of thirty days must not become five 150px slabs (owner, 2026-09-17). */
const TILE_MAX_REM = 1.5;
/** The weekday gutter (w-7) plus its gap (gap-x-2), so the capped width covers the whole grid row. */
const GUTTER_REM = 2.25;

const STEP: Record<string, number> = { ArrowRight: 7, ArrowLeft: -7, ArrowDown: 1, ArrowUp: -1, PageDown: 28, PageUp: -28 };

const dayLabel = (day: ActivityDay, unit: string) => `${weekdayDate(day.date)}: ${day.value === null ? "no data" : `${count(day.value)} ${unit}`}`;

/**
 * The days of the page's own range as a GitHub-style heatmap: one column per week, Sunday at the top,
 * small squares that never stretch. The calendar follows `?range=` like every other panel on the
 * screen (owner, 2026-09-17, D41), so it has no span control of its own: thirty days are five
 * columns, ninety are thirteen, a year fifty-three; a panel too narrow for 12px squares, and the
 * whole two-year history, fall back to month blocks by container query, with both stages in the DOM
 * and CSS showing exactly one.
 *
 * One delegated pointer handler writes the day under the pointer into a fixed-height readout and the
 * band under the grid, which reads out the day, its week and its month together; a click keeps a day
 * open so the keyboard has something to walk from.
 */
export function ActivityCalendar({ activity, range, unit = "visits", title = "Every day people visited" }: { activity: ActivityDto; range: CalendarRange; unit?: string; title?: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const { days, total, from, to } = activity;

  const stage = STAGE[range.preset];
  const max = Math.max(0, ...days.map((d) => d.value ?? 0));
  const busiest = days.reduce<ActivityDay | null>((b, d) => (d.value !== null && (b === null || d.value > (b.value ?? 0)) ? d : b), null);

  const byDate = new Map(days.map((d) => [d.date, d]));
  const pinnedDate = pin !== null && byDate.has(pin) ? pin : busiest?.date ?? null;
  const pinned = pinnedDate === null ? null : byDate.get(pinnedDate) ?? null;
  const hovered = hover === null ? null : byDate.get(hover) ?? null;
  const shown = hovered ?? pinned;
  const shownDate = shown?.date ?? null;

  // Every figure below is arithmetic on the days, proved in tests/activity.test.ts: this component
  // keeps the state, the handlers and the markup, and asks @/lib/activity for the rest.
  const typical = shown === null ? null : weekdayAverages(days)[weekdayOf(shown.date)].average;
  const rank = shown === null ? null : dayRank(days, shown.date);
  const week = weekSummary(days, shownDate);
  const month = monthContext(days, shownDate);

  // The grid pads its first column so day one sits under its own weekday; the columns are the weeks
  // the padded days fill. Fifty-three columns of squares are 10px wide: a 4px corner reads as a
  // circle and a 3px gap eats the tile, so past twenty-six columns both tighten.
  const leading = days.length === 0 ? 0 : weekdayOf(days[0].date);
  const columns = Math.ceil((leading + days.length) / 7);
  const lead = days.length === 0 ? [] : Array.from({ length: leading }, (_, i) => addDays(days[0].date, i - leading));
  const dense = columns > 26;
  const gapPx = dense ? 2 : 3;
  // One inline size, computed from the column count, never from the viewport: the cap that keeps a
  // square a square. Thirty days are a compact five columns; a year still uses the whole width.
  const gridMax = `calc(${columns} * ${TILE_MAX_REM}rem + ${Math.max(0, columns - 1)} * ${gapPx}px + ${GUTTER_REM}rem)`;

  // A month block is drawn wherever a day square cannot be. "12m" is 365 days, which touch thirteen
  // calendar months; the grid draws the twelve whole ones, so 4 x 3 never hangs a block alone.
  const blocks = stage === "squares" ? [] : range.preset === "12m" ? monthBlocks(days, 12) : monthBlocksInRange(days, from, to);
  const blockMax = Math.max(0, ...blocks.map((b) => b.total ?? 0));
  const blockColumns: BlockColumns = stage === "blocks" ? 12 : blocks.length <= 6 ? 3 : 4;

  // One cell per column for the month row: the label sits on the column its month starts in, blank otherwise.
  const monthByColumn = new Map(monthColumns([...lead.map((date) => ({ date })), ...days]).map((m, i) => [m.column, { label: m.label, odd: i % 2 === 1 }]));
  const columnCells = Array.from({ length: columns }, (_, i) => ({ column: i + 1, month: monthByColumn.get(i + 1) ?? null }));
  const summary = `${count(total)} ${unit} from ${longDate(from)} to ${longDate(to)}`;

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
    if (days.length === 0) return;
    const at = Math.max(0, days.findIndex((d) => d.date === pinnedDate));
    let next: number;
    if (e.key === "Home") next = 0;
    else if (e.key === "End") next = days.length - 1;
    else if (e.key in STEP) next = at + STEP[e.key];
    else return;
    e.preventDefault();
    const date = days[Math.min(days.length - 1, Math.max(0, next))].date;
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

  const pointer = { onPointerMove: onMove, onPointerDown: onDown, onPointerLeave: () => setHover(null), onClick };

  return (
    <Panel id="activity">
      <PanelHeader
        headingId="activity-h"
        title={title}
        action={
          // Under sm the readout takes its own line and reads from the left, under the title (owner,
          // 2026-09-17). From sm it is a fixed width with its text kept to the right: the day under
          // the pointer changes length, and the header must not move while it does.
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
        }
      />
      <PanelBody>
        {/* One wrapping row, no measuring: the grid comes first at its capped width with its legend
            under it; the band takes whatever is left beside a short grid (thirty or ninety days) and
            drops under a long one (a year fills the row). The row is its own container, so a year
            becomes month blocks by the room it actually has, never by the viewport (CLAUDE.md §2). */}
        <div className="@container flex min-w-0 flex-wrap items-start gap-x-8 gap-y-5">
          <div className="flex min-w-0 grow flex-col gap-3" style={{ flexBasis: gridMax, maxWidth: `max(${gridMax}, 18rem)` }}>
            {stage === "blocks" ? null : (
              <div
                data-stage="days"
                style={{ maxWidth: gridMax }}
                className={cn("grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-1", stage === "both" && "hidden @2xl:grid")}
              >
                <div aria-hidden="true" className="col-start-2 row-start-1 grid h-4 grid-flow-col auto-cols-[minmax(0,1fr)] text-[10px] leading-4 text-muted-foreground" style={{ gap: gapPx }}>
                  {columnCells.map((w) => (
                    <span key={w.column} className="min-w-0 overflow-visible whitespace-nowrap">
                      {w.month ? <span className={cn(w.month.odd && "hidden @md:inline")}>{w.month.label}</span> : null}
                    </span>
                  ))}
                </div>
                <div aria-hidden="true" className="col-start-1 row-start-2 grid w-7 grid-rows-7 text-[10px] leading-none text-muted-foreground" style={{ gap: gapPx }}>
                  {[0, 1, 2, 3, 4, 5, 6].map((r) => (
                    <span key={r} className="flex items-center">{r % 2 === 1 ? weekdayShort(r) : ""}</span>
                  ))}
                </div>
                <div
                  ref={gridRef}
                  data-grid="days"
                  role="group"
                  aria-label={summary}
                  onKeyDown={onKeyDown}
                  {...pointer}
                  className="col-start-2 row-start-2 grid grid-flow-col grid-rows-7 auto-cols-[minmax(0,1fr)]"
                  style={{ gap: gapPx }}
                >
                  {lead.map((d) => (
                    <div key={d} aria-hidden="true" data-blank="" className="invisible aspect-square w-full" />
                  ))}
                  {days.map((d) => {
                    const level = heatLevel(d.value, max);
                    return (
                      <button
                        key={d.date}
                        type="button"
                        data-date={d.date}
                        data-level={level ?? undefined}
                        aria-label={dayLabel(d, unit)}
                        aria-pressed={d.date === pinnedDate}
                        tabIndex={d.date === pinnedDate ? 0 : -1}
                        className={cn(
                          "aspect-square w-full transition-transform motion-safe:hover:scale-110",
                          dense ? "rounded-(--radius-tile)" : "rounded-(--radius-min)",
                          level === null ? EMPTY : LEVEL[level],
                          d.date === pinnedDate && "ring-2 ring-foreground ring-offset-1 ring-offset-card",
                          d.date !== pinnedDate && hover === d.date && "ring-2 ring-foreground/50",
                        )}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {blocks.length > 0 ? (
              <div
                data-stage="blocks"
                role="group"
                aria-label={`Each block is a month: ${summary}`}
                {...pointer}
                className={cn("min-w-0", stage === "both" && "@2xl:hidden")}
              >
                <MonthBlocks blocks={blocks} columns={blockColumns} unit={unit} pinnedDate={pinnedDate} max={blockMax} />
              </div>
            ) : null}

            {/* What the window holds, what a block stands for while blocks are showing, and the ramp. */}
            <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span data-legend="">
                <span className="font-medium tabular-nums text-foreground">{count(total)}</span> {unit} · {rangeLabel(from, to)}
              </span>
              {blocks.length > 0 ? <span className={cn(stage === "both" && "@2xl:hidden")}>Each block is a month.</span> : null}
              <span aria-hidden="true" className="inline-flex items-center gap-1">
                Fewer
                {LEVEL.map((c) => (
                  <span key={c} className={cn("size-2.5", dense ? "rounded-(--radius-tile)" : "rounded-(--radius-min)", c)} />
                ))}
                More
              </span>
            </div>
          </div>

          {/* The band is its own container: five readings abreast when it has the room, two when it does not. */}
          <div className="@container min-w-0 grow basis-[30rem]">
            <DayCard day={shown} typical={typical} mode={hovered ? "hover" : "pinned"} unit={unit} rank={rank} week={week} month={month} />
          </div>
        </div>
      </PanelBody>
    </Panel>
  );
}
