import type { Granularity } from "@/lib/date-range";
import { bucketLabel, money, count } from "@/lib/format";
import { METRIC_LABELS, metricKind, type ChartMetric, type ChartPoint } from "./chart-config";

export interface TrendProps {
  metric: ChartMetric;
  granularity: Granularity;
  points: ChartPoint[];
  prevLabel: string | null;
  lastYearLabel: string | null;
}

/** The chart's twin. Native <details>, closed by default: no JS, no hydration shift, every value reachable without hover. */
export function TrendTable({ metric, granularity, points, prevLabel, lastYearLabel }: TrendProps) {
  const fmt = metricKind(metric) === "money" ? money : count;
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-primary underline-offset-4 hover:underline">View as table</summary>
      <div className="pt-2">
        <table className="w-full tabular-nums">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th scope="col" className="py-1 font-medium">
                Period
              </th>
              <th scope="col" className="py-1 text-right font-medium">
                {METRIC_LABELS[metric]}
              </th>
              {prevLabel ? (
                <th scope="col" className="py-1 text-right font-medium">
                  {prevLabel}
                </th>
              ) : null}
              {lastYearLabel ? (
                <th scope="col" className="py-1 text-right font-medium">
                  {lastYearLabel}
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.bucket} aria-label={bucketLabel(p.bucket, granularity)} className="border-t border-border">
                <th scope="row" className="py-1 font-normal">
                  {bucketLabel(p.bucket, granularity)}
                </th>
                <td className="py-1 text-right">{fmt(p.current)}</td>
                {prevLabel ? <td className="py-1 text-right">{p.previous === null ? "—" : fmt(p.previous)}</td> : null}
                {lastYearLabel ? <td className="py-1 text-right">{p.lastYear === null ? "—" : fmt(p.lastYear)}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
