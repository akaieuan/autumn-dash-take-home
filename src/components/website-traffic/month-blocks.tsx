"use client";
import type { MonthBlock } from "@/lib/activity";
import { heatLevel } from "@/lib/activity";
import { bucketLabel, count, monthShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LEVEL, EMPTY } from "./heat-classes";

/** How wide the grid gets. The two big ones name their own narrow fallback, so one grid serves both widths. */
export type BlockColumns = 3 | 4 | 6 | 12;
const GRID: Record<BlockColumns, string> = {
  3: "grid-cols-3",
  4: "grid-cols-4",
  6: "grid-cols-3 @2xl:grid-cols-6",
  12: "grid-cols-6 @2xl:grid-cols-12",   // "all": a year a row where there is room, half a year where there is not
};
/** A block keeps its proportions rather than a fixed height, so twenty-four of them fill the same width as nine. */
const SHAPE: Record<BlockColumns, string> = {
  3: "aspect-[4/3] p-2",
  4: "aspect-[4/3] min-h-14 p-1.5",   // at 70px wide a 4:3 block is 52px tall, exactly its two lines: the floor keeps the total whole on a phone
  6: "aspect-square p-1",
  12: "aspect-square p-1",
};

/**
 * The calendar's block stage: one block per calendar month the range holds, oldest top-left. A square
 * standing for four days still read as a day and hid the distance (owner, 2026-09-17, D40), so where
 * a day square cannot be 12px the unit becomes a month — big enough to carry a name, a total and,
 * where there is room, how it moved on the month before. "all" is blocks at every width: two years
 * is 105 weeks, and a 7px square is not a calendar.
 *
 * It renders inside the calendar's delegated pointer and click handlers: a block carries its busiest
 * day in `data-busiest`, which the calendar reads exactly as it reads a tile's `data-date`, so
 * pointing at a block fills the same readout and the same day band, and tapping it keeps that day.
 */
export function MonthBlocks({ blocks, columns, unit, pinnedDate, max }: { blocks: MonthBlock[]; columns: BlockColumns; unit: string; pinnedDate: string | null; max: number }) {
  const tight = columns >= 4;
  const dense = columns >= 6;
  return (
    <div data-grid="blocks" className={cn("grid grid-flow-row gap-1.5", GRID[columns])}>
      {blocks.map((b, i) => {
        const level = heatLevel(b.total, max);
        const ink = level !== null && level >= 3 ? "text-card" : "text-foreground";
        const quiet = level !== null && level >= 3 ? "text-card/80" : "text-muted-foreground";
        const isPinned = pinnedDate !== null && pinnedDate.slice(0, 7) === b.key;
        // The year is only worth the room where it changes: on January, and on the oldest block.
        const label = `${monthShort(`${b.key}-01`)}${b.key.endsWith("-01") || i === 0 ? ` ${b.key.slice(2, 4)}` : ""}`;
        return (
          <button
            key={b.key}
            type="button"
            data-busiest={b.busiest ?? undefined}
            data-level={level ?? undefined}
            aria-label={`${bucketLabel(`${b.key}-01`, "month")}: ${b.total === null ? "no data" : `${count(b.total)} ${unit}`}`}
            aria-pressed={isPinned}
            disabled={b.busiest === null}
            tabIndex={isPinned ? 0 : -1}
            // 1.02, not the tiles' 1.10: a block is a tenth of the stage, and a tenth grown that far collides with its neighbour.
            className={cn(
              "flex flex-col justify-between overflow-hidden rounded-(--r-in) text-left transition-transform motion-safe:hover:scale-[1.02]",
              SHAPE[columns],
              level === null ? `${EMPTY} border border-border` : LEVEL[level],
              ink,
              isPinned && "ring-2 ring-foreground ring-offset-1 ring-offset-card",
            )}
          >
            <span className="flex w-full items-start justify-between gap-1">
              <span className={cn("truncate font-semibold", dense ? "text-[10px] leading-none" : tight ? "text-[11px]" : "text-xs")}>{label}</span>
              {!tight && b.deltaPct !== null ? (
                <span className={cn("text-[11px] tabular-nums", level !== null && level >= 3 ? "text-card/80" : b.deltaPct < 0 ? "text-watch" : "text-positive")}>
                  {b.deltaPct > 0 ? "+" : ""}{b.deltaPct}%
                </span>
              ) : null}
            </span>
            <span className={cn("w-full truncate text-right font-semibold leading-none tabular-nums", dense ? "text-[11px]" : tight ? "text-sm" : "text-lg", b.total === null && quiet)}>
              {b.total === null ? "–" : count(b.total)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
