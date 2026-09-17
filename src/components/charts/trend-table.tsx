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

const num = "text-right tabular-nums";
const sum = (xs: (number | null)[]) => xs.reduce<number>((a, b) => a + (b ?? 0), 0);

/**
 * The chart's twin, in the chart's box: a scrolling table with a pinned header, one row per bucket,
 * a change column against the previous period, and totals. Every value the plot shows is here.
 */
export function TrendTable({ metric, granularity, points, prevLabel, lastYearLabel }: TrendProps) {
  const fmt = metricKind(metric) === "money" ? money : count;
  const totals = { current: sum(points.map((p) => p.current)), previous: sum(points.map((p) => p.previous)), lastYear: sum(points.map((p) => p.lastYear)) };
  const change = (cur: number, prev: number | null) => {
    const d = delta(cur, prev);
    if (d.pct === null) return <span className="text-muted-foreground">—</span>;
    return <span className={cn(d.direction === "up" && "text-positive", d.direction === "down" && "text-watch")}>{d.pct > 0 ? "+" : ""}{d.pct}%</span>;
  };
  return (
    <div className="min-h-(--plot-height) flex-1 overflow-auto rounded-(--r-in) border border-border" style={{ maxHeight: "var(--plot-height)" }}>
      <Table className="text-xs">
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-9 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Period</TableHead>
            <TableHead className={cn("h-9 text-[11px] font-medium uppercase tracking-wide text-muted-foreground", num)}>{METRIC_LABELS[metric]}</TableHead>
            {prevLabel ? <TableHead className={cn("h-9 text-[11px] font-medium uppercase tracking-wide text-muted-foreground", num)}>{prevLabel}</TableHead> : null}
            {prevLabel ? <TableHead className={cn("h-9 text-[11px] font-medium uppercase tracking-wide text-muted-foreground", num)}>Change</TableHead> : null}
            {lastYearLabel ? <TableHead className={cn("h-9 text-[11px] font-medium uppercase tracking-wide text-muted-foreground", num)}>{lastYearLabel}</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {points.map((p) => (
            <TableRow key={p.bucket} aria-label={bucketLabel(p.bucket, granularity)}>
              <TableCell className="py-1.5 text-muted-foreground">{bucketLabel(p.bucket, granularity)}</TableCell>
              <TableCell className={cn("py-1.5 font-medium", num)}>{fmt(p.current)}</TableCell>
              {prevLabel ? <TableCell className={cn("py-1.5 text-muted-foreground", num)}>{p.previous === null ? "—" : fmt(p.previous)}</TableCell> : null}
              {prevLabel ? <TableCell className={cn("py-1.5", num)}>{change(p.current, p.previous)}</TableCell> : null}
              {lastYearLabel ? <TableCell className={cn("py-1.5 text-muted-foreground", num)}>{p.lastYear === null ? "—" : fmt(p.lastYear)}</TableCell> : null}
            </TableRow>
          ))}
        </TableBody>
        <TableFooter className="sticky bottom-0 bg-card">
          <TableRow className="hover:bg-transparent">
            <TableCell className="py-2 font-semibold">Total</TableCell>
            <TableCell className={cn("py-2 font-semibold", num)}>{fmt(totals.current)}</TableCell>
            {prevLabel ? <TableCell className={cn("py-2 text-muted-foreground", num)}>{fmt(totals.previous)}</TableCell> : null}
            {prevLabel ? <TableCell className={cn("py-2 font-semibold", num)}>{change(totals.current, totals.previous)}</TableCell> : null}
            {lastYearLabel ? <TableCell className={cn("py-2 text-muted-foreground", num)}>{fmt(totals.lastYear)}</TableCell> : null}
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
