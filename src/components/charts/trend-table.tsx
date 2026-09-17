import type { Granularity } from "@/lib/date-range";
import { bucketLabel, money, count, delta } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DataTable, type DataColumn } from "./data-table";
import { METRIC_LABELS, metricKind, type ChartMetric, type ChartPoint } from "./chart-config";

export interface TrendProps {
  metric: ChartMetric;
  granularity: Granularity;
  points: ChartPoint[];
  prevLabel: string | null;
  lastYearLabel: string | null;
}

const sum = (xs: (number | null)[]) => xs.reduce<number>((a, b) => a + (b ?? 0), 0);

/**
 * The chart's twin, in exactly the chart's box: `fill` gives it the panel's spare height and it
 * scrolls inside a pinned header and footer, so switching Chart ↔ Table never leaves a band of
 * dead space. Each row carries a bar under its value, scaled to the largest bucket, so the shape
 * survives the switch too. The table itself is `DataTable` (design audit item 2).
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

  const compare: DataColumn<ChartPoint>[] = prevLabel
    ? [
        {
          key: "previous",
          header: prevLabel,
          align: "right",
          className: "text-muted-foreground",
          cell: (p) => (p.previous === null ? "—" : fmt(p.previous)),
          foot: fmt(totals.previous),
        },
        { key: "change", header: "Change", align: "right", cell: (p) => change(p.current, p.previous), foot: change(totals.current, totals.previous) },
      ]
    : [];
  const lastYear: DataColumn<ChartPoint>[] = lastYearLabel
    ? [
        {
          key: "lastYear",
          header: lastYearLabel,
          align: "right",
          hideBelow: "xl",
          className: "text-muted-foreground",
          cell: (p) => (p.lastYear === null ? "—" : fmt(p.lastYear)),
          foot: fmt(totals.lastYear),
        },
      ]
    : [];

  const columns: DataColumn<ChartPoint>[] = [
    {
      key: "period",
      header: "Period",
      className: "text-muted-foreground",
      cell: (p) => bucketLabel(p.bucket, granularity),
      foot: <span className="text-foreground">Total</span>,
    },
    { key: "value", header: METRIC_LABELS[metric], align: "right", className: "font-medium", cell: (p) => fmt(p.current), foot: fmt(totals.current) },
    {
      key: "bar",
      header: <span className="sr-only">Relative size</span>,
      hideBelow: "lg",
      width: "28%",
      cell: (p) => (
        <span aria-hidden="true" className="block h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <span className="block h-full rounded-full bg-(--chart-1)" style={{ width: `${Math.round((p.current / max) * 100)}%` }} />
        </span>
      ),
    },
    ...compare,
    ...lastYear,
  ];

  return (
    <DataTable
      label={`${METRIC_LABELS[metric]}, one row per period`}
      columns={columns}
      rows={points}
      rowKey={(p) => p.bucket}
      rowLabel={(p) => bucketLabel(p.bucket, granularity)}
      fill
    />
  );
}
