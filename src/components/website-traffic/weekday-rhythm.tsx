import { count, weekdayShort } from "@/lib/format";
import { Panel, PanelHeader, PanelBody } from "@/components/layout";
import { cn } from "@/lib/utils";

const WEEKDAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** Monday first: an innkeeper reads a week as work-week then weekend, not Sunday first like a wall calendar. */
const ORDER = [1, 2, 3, 4, 5, 6, 0];
const BAR_ROOM = 88; // px of the h-32 column left once the value and the label have their lines

/** Which weekdays carry the traffic, averaged over the whole year, so one odd Saturday cannot claim the crown. */
export function WeekdayRhythm({ averages, unit = "visits" }: { averages: { weekday: number; average: number }[]; unit?: string }) {
  const byWeekday = new Map(averages.map((a) => [a.weekday, a.average]));
  const rows = ORDER.map((weekday) => ({ weekday, average: byWeekday.get(weekday) ?? 0 }));
  const max = Math.max(0, ...rows.map((r) => r.average));
  const min = Math.min(...rows.map((r) => r.average));
  const top = [...rows].sort((a, b) => b.average - a.average).slice(0, 2).map((r) => r.weekday);
  const busiest = rows.reduce((b, r) => (r.average > b.average ? r : b), rows[0]);
  const quietest = rows.reduce((q, r) => (r.average < q.average ? r : q), rows[0]);

  return (
    <Panel id="rhythm" className="scroll-mt-20">
      <PanelHeader headingId="rhythm-h" title="Which days are busiest" description={`Average ${unit} per weekday, over the last year.`} />
      <PanelBody className="gap-3">
        <div className="grid h-32 grid-cols-7 items-end gap-1.5">
          {rows.map((r) => (
            <div key={r.weekday} className="flex h-full flex-col items-center justify-end gap-1">
              <span className="text-[11px] leading-none tabular-nums text-muted-foreground">{count(r.average)}</span>
              <span
                aria-hidden="true"
                className={cn("w-full shrink-0 rounded-t-(--radius-min)", top.includes(r.weekday) ? "bg-(--chart-1)" : "bg-(--heat-2)")}
                style={{ height: `${max > 0 ? Math.max(4, Math.round((BAR_ROOM * r.average) / max)) : 4}px` }}
              />
              <span className="text-[11px] leading-none text-muted-foreground">{weekdayShort(r.weekday)}</span>
            </div>
          ))}
        </div>
        {min > 0 ? (
          <p className="text-sm text-muted-foreground">
            {`${WEEKDAY_FULL[busiest.weekday]}s bring ${(max / min).toFixed(1)}× a ${WEEKDAY_FULL[quietest.weekday]}.`}
          </p>
        ) : null}
      </PanelBody>
    </Panel>
  );
}
