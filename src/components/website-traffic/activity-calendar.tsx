"use client";
import { useState } from "react";
import type { ActivityDay, ActivityDto } from "@/lib/db/queries";
import { count, longDate, monthShort, weekdayDate, weekdayShort } from "@/lib/format";
import { Panel, PanelHeader, PanelBody } from "@/components/layout";
import { cn } from "@/lib/utils";

/** Five static classes so Tailwind can see them; the tokens follow the theme. */
const LEVEL = ["bg-(--heat-0)", "bg-(--heat-1)", "bg-(--heat-2)", "bg-(--heat-3)", "bg-(--heat-4)"] as const;
const EMPTY = "bg-transparent";

/** 0 for a quiet day, then quartiles of the window's own maximum, so any hotel gets a readable spread. */
export function heatLevel(value: number | null, max: number): number | null {
  if (value === null) return null;
  if (value <= 0 || max <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((value / max) * 4)));
}

/** Column index (1-based) → label, for weeks whose first day starts a new month; a stub month at the left edge is skipped. */
export function monthColumns(days: ActivityDay[]): { column: number; label: string }[] {
  const out: { column: number; label: string }[] = [];
  let last = "";
  for (let i = 0; i * 7 < days.length; i++) {
    const m = days[i * 7].date.slice(0, 7);
    if (m !== last) {
      if (last !== "" || i === 0 && days[Math.min(days.length - 1, 21)].date.slice(0, 7) === m) out.push({ column: i + 1, label: monthShort(days[i * 7].date) });
      last = m;
    }
  }
  return out;
}

/**
 * A year of days as a heatmap, one column per week, Sunday at the top. The grid's columns are `1fr`,
 * so the whole year always fits its panel and the squares shrink instead of the page scrolling sideways.
 * One delegated pointer handler writes the hovered day into a fixed-height readout in the header, so
 * nothing floats and nothing can overflow the page.
 */
export function ActivityCalendar({ activity, unit = "visits", title = "Every day of the last year" }: { activity: ActivityDto; unit?: string; title?: string }) {
  const [hover, setHover] = useState<ActivityDay | null>(null);
  const { days, weeks, max, total, from, to } = activity;
  const busiest = days.reduce<ActivityDay | null>((b, d) => (d.value !== null && (b === null || d.value > (b.value ?? 0)) ? d : b), null);
  const columns = { gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` };
  const summary = `${count(total)} ${unit} from ${longDate(from)} to ${longDate(to)}${busiest ? `; busiest day ${longDate(busiest.date)} with ${count(busiest.value ?? 0)}` : ""}`;

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-date]");
    if (!el) return setHover(null);
    const v = el.dataset.value;
    setHover({ date: el.dataset.date as string, value: v === undefined || v === "" ? null : Number(v) });
  };

  return (
    <Panel id="activity" className="scroll-mt-20">
      <PanelHeader
        headingId="activity-h"
        title={title}
        description={`Website ${unit}, day by day, up to ${longDate(to)}. Darker is busier.`}
        action={
          <p aria-live="polite" className="flex h-8 items-center whitespace-nowrap tabular-nums text-muted-foreground">
            {hover ? (
              <>
                <span className="text-foreground">{weekdayDate(hover.date)}</span>
                <span aria-hidden="true" className="px-1.5">·</span>
                {hover.value === null ? "no data" : `${count(hover.value)} ${unit}`}
              </>
            ) : (
              `Point at a day`
            )}
          </p>
        }
      />
      <PanelBody className="@container gap-3">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-1">
          <div aria-hidden="true" />
          <div aria-hidden="true" className="col-start-2 grid h-4 text-[10px] leading-4 text-muted-foreground" style={columns}>
            {monthColumns(days).map((m, i) => (
              <span key={m.column} className={cn("whitespace-nowrap", i % 2 === 1 && "hidden @md:inline")} style={{ gridColumnStart: m.column }}>{m.label}</span>
            ))}
          </div>
          <div aria-hidden="true" className="col-start-1 row-start-2 hidden grid-rows-7 gap-[2px] text-[10px] leading-none text-muted-foreground @md:grid">
            {[0, 1, 2, 3, 4, 5, 6].map((r) => (
              <span key={r} className="flex items-center">{r % 2 === 1 ? weekdayShort(r) : ""}</span>
            ))}
          </div>
          <div
            role="img"
            aria-label={summary}
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={() => setHover(null)}
            className="col-start-2 row-start-2 grid grid-flow-col grid-rows-7 gap-[2px]"
            style={columns}
          >
            {days.map((d) => {
              const level = heatLevel(d.value, max);
              return (
                <span
                  key={d.date}
                  data-date={d.date}
                  data-value={d.value ?? ""}
                  data-level={level ?? undefined}
                  className={cn("aspect-square w-full rounded-(--radius-min)", level === null ? EMPTY : LEVEL[level], hover?.date === d.date && "ring-2 ring-foreground/60")}
                />
              );
            })}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            <span className="font-medium tabular-nums text-foreground">{count(total)}</span> {unit} in the last year
            {busiest ? <>, busiest on <span className="text-foreground">{longDate(busiest.date)}</span></> : null}
          </span>
          <span aria-hidden="true" className="inline-flex items-center gap-1">
            Fewer
            {LEVEL.map((c) => <span key={c} className={cn("size-2.5 rounded-(--radius-min)", c)} />)}
            More
          </span>
        </div>
      </PanelBody>
    </Panel>
  );
}
