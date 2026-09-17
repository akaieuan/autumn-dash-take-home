import type { Granularity } from "@/lib/date-range";
import { bucketLabel, money, count, delta } from "@/lib/format";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { METRIC_LABELS, metricKind, type ChartMetric, type ChartPoint } from "./chart-config";

export interface TrendProps {
  metric: ChartMetric;
  granularity: Granularity;
  points: ChartPoint[];
  prevLabel: string | null;
  lastYearLabel: string | null;
}

const HEAD = "h-9 text-[11px] font-medium uppercase tracking-wide text-muted-foreground";
const num = "text-right tabular-nums";
const sum = (xs: (number | null)[]) => xs.reduce<number>((a, b) => a + (b ?? 0), 0);

/**
 * The chart's twin, in exactly the chart's box: it fills the panel (flex-1, min-h-0) and scrolls inside
 * a pinned header and footer, so switching Chart ↔ Table never leaves a band of dead space. Each row
 * carries a bar under its value, scaled to the largest bucket, so the shape survives the switch too.
 */
export function TrendTable({ metric, granularity, points, prevLabel, lastYearLabel }: TrendProps) {
  const fmt = metricKind(metric) === "money" ? money : count;
  const max = Math.max(1, ...points.map((p) => p.current));
  const totals = { current: sum(points.map((p) => p.current)), previous: sum(points.map((p) => p.previous)), lastYear: sum(points.map((p) => p.lastYear)) };
  const change = (cur: number, prev: number | null) => {
    const d = delta(cur, prev);
    if (d.pct === null) return <span className="text-muted-foreground">—</span>;
    return <span className={cn(d.direction === "up" && "text-positive", d.direction === "down" && "text-watch")}>{d.pct > 0 ? "+" : ""}{d.pct}%</span>;
  };
  return (
    // This box is the only scroll container: shadcn's own wrapper is made overflow-visible so the pinned header and footer stick to it.
    <div className="min-h-(--plot-height) min-w-0 flex-1 basis-0 overflow-auto rounded-(--r-in) border border-border [&>[data-slot=table-container]]:overflow-visible">
      <Table className="text-xs">
        <TableHeader className="sticky top-0 z-10 bg-card shadow-[inset_0_-1px_0_var(--color-border)]">
          <TableRow className="border-0 hover:bg-transparent">
            <TableHead className={HEAD}>Period</TableHead>
            <TableHead className={cn(HEAD, num)}>{METRIC_LABELS[metric]}</TableHead>
            <TableHead className={cn(HEAD, "hidden w-[28%] @lg:table-cell")}>
              <span className="sr-only">Relative size</span>
            </TableHead>
            {prevLabel ? <TableHead className={cn(HEAD, num)}>{prevLabel}</TableHead> : null}
            {prevLabel ? <TableHead className={cn(HEAD, num)}>Change</TableHead> : null}
            {lastYearLabel ? <TableHead className={cn(HEAD, num, "hidden @xl:table-cell")}>{lastYearLabel}</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {points.map((p) => (
            <TableRow key={p.bucket} aria-label={bucketLabel(p.bucket, granularity)}>
              <TableCell className="py-2 text-muted-foreground">{bucketLabel(p.bucket, granularity)}</TableCell>
              <TableCell className={cn("py-2 font-medium", num)}>{fmt(p.current)}</TableCell>
              <TableCell className="hidden py-2 @lg:table-cell">
                <span aria-hidden="true" className="block h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-(--chart-1)" style={{ width: `${Math.round((p.current / max) * 100)}%` }} />
                </span>
              </TableCell>
              {prevLabel ? <TableCell className={cn("py-2 text-muted-foreground", num)}>{p.previous === null ? "—" : fmt(p.previous)}</TableCell> : null}
              {prevLabel ? <TableCell className={cn("py-2", num)}>{change(p.current, p.previous)}</TableCell> : null}
              {lastYearLabel ? <TableCell className={cn("hidden py-2 text-muted-foreground @xl:table-cell", num)}>{p.lastYear === null ? "—" : fmt(p.lastYear)}</TableCell> : null}
            </TableRow>
          ))}
        </TableBody>
        <TableFooter className="sticky bottom-0 bg-card shadow-[inset_0_1px_0_var(--color-border)]">
          <TableRow className="border-0 hover:bg-transparent">
            <TableCell className="py-2.5 font-semibold">Total</TableCell>
            <TableCell className={cn("py-2.5 font-semibold", num)}>{fmt(totals.current)}</TableCell>
            <TableCell className="hidden py-2.5 @lg:table-cell" />
            {prevLabel ? <TableCell className={cn("py-2.5 text-muted-foreground", num)}>{fmt(totals.previous)}</TableCell> : null}
            {prevLabel ? <TableCell className={cn("py-2.5 font-semibold", num)}>{change(totals.current, totals.previous)}</TableCell> : null}
            {lastYearLabel ? <TableCell className={cn("hidden py-2.5 text-muted-foreground @xl:table-cell", num)}>{fmt(totals.lastYear)}</TableCell> : null}
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
