"use client";
import type { MonthBlock } from "@/lib/activity";
import { heatLevel } from "@/lib/activity";
import { bucketLabel, count, monthShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LEVEL, EMPTY } from "./heat-classes";

/**
 * The calendar's narrow-screen stage: the last six or twelve calendar months as blocks, oldest
 * top-left. A square standing for four days still read as a day and hid the distance (owner,
 * 2026-09-17, D40), so the phone gets blocks big enough to carry a month's name, its total and — in
 * the roomier 3 × 2 layout — how it moved on the month before.
 *
 * It renders inside the calendar's delegated pointer and click handlers: a block carries its busiest
 * day in `data-busiest`, which the calendar reads exactly as it reads a tile's `data-date`, so
 * pointing at a block fills the same readout and the same day card, and tapping it keeps that day.
 */
export function MonthBlocks({ blocks, columns, unit, pinnedDate, max }: { blocks: MonthBlock[]; columns: 3 | 4; unit: string; pinnedDate: string | null; max: number }) {
  const tight = columns === 4;
  return (
    <div className={cn("grid h-full grid-flow-row gap-1.5", tight ? "grid-cols-4 grid-rows-3" : "grid-cols-3 grid-rows-2")}>
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
              "flex flex-col justify-between overflow-hidden rounded-(--r-in) p-2 text-left transition-transform motion-safe:hover:scale-[1.02]",
              level === null ? `${EMPTY} border border-border` : LEVEL[level],
              ink,
              isPinned && "ring-2 ring-foreground ring-offset-1 ring-offset-card",
            )}
          >
            <span className="flex w-full items-start justify-between gap-1">
              <span className={cn("truncate font-semibold", tight ? "text-[11px]" : "text-xs")}>{label}</span>
              {!tight && b.deltaPct !== null ? (
                <span className={cn("text-[11px] tabular-nums", level !== null && level >= 3 ? "text-card/80" : b.deltaPct < 0 ? "text-watch" : "text-positive")}>
                  {b.deltaPct > 0 ? "+" : ""}{b.deltaPct}%
                </span>
              ) : null}
            </span>
            <span className={cn("w-full text-right font-semibold leading-none tabular-nums", tight ? "text-sm" : "text-lg", b.total === null && quiet)}>
              {b.total === null ? "–" : count(b.total)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
