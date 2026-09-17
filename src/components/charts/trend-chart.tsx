"use client";
import { Area, Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { bucketLabel, money, moneyCompact, compact, count } from "@/lib/format";
import { trendChartConfig, METRIC_LABELS, metricKind } from "./chart-config";
import { useChartStyle } from "./use-chart-style";
import { ChartLegend } from "./chart-legend";
import { TrendTable, type TrendProps } from "./trend-table";

const GRAN = { day: "day by day", week: "week by week", month: "month by month" } as const;

/**
 * One metric, three periods. Style (area | bars | line) is the viewer's preference; the box height is
 * fixed by --plot-height so switching never shifts the page. All three styles are the same
 * ComposedChart so a bar series and a comparison line can share one plot.
 */
export function TrendChart({ metric, granularity, points, prevLabel, lastYearLabel }: TrendProps) {
  const [style] = useChartStyle();
  const kind = metricKind(metric);
  const axis = kind === "money" ? (v: number) => moneyCompact(v) : (v: number) => compact(v);
  const full = kind === "money" ? money : count;
  const title = `${METRIC_LABELS[metric]}, ${GRAN[granularity]}`;
  const data = points.map((p) => ({ ...p, label: bucketLabel(p.bucket, granularity) }));
  const hasComparison = prevLabel !== null;
  return (
    <figure aria-label={title} className="flex flex-col gap-3">
      <ChartContainer config={trendChartConfig} className="aspect-auto h-(--plot-height) w-full">
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="0" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={32} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={axis} />
          <ChartTooltip
            cursor
            content={
              <ChartTooltipContent
                className="rounded-(--radius-float) p-(--float-pad)"
                formatter={(v, name) => [
                  full(Number(v)),
                  trendChartConfig[name as keyof typeof trendChartConfig]?.label ?? name,
                ]}
              />
            }
          />
          {hasComparison && lastYearLabel && style !== "bars" ? (
            <Line
              type="monotone"
              dataKey="lastYear"
              stroke="var(--color-lastYear)"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
            />
          ) : null}
          {hasComparison ? (
            <Line type="monotone" dataKey="previous" stroke="var(--color-previous)" strokeWidth={2} dot={false} />
          ) : null}
          {style === "bars" ? (
            <Bar dataKey="current" fill="var(--color-current)" radius={[4, 4, 0, 0]} maxBarSize={24} />
          ) : style === "line" ? (
            <Line
              type="monotone"
              dataKey="current"
              stroke="var(--color-current)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2 }}
            />
          ) : (
            <Area
              type="monotone"
              dataKey="current"
              stroke="var(--color-current)"
              fill="var(--color-current)"
              fillOpacity={0.12}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2 }}
            />
          )}
        </ComposedChart>
      </ChartContainer>
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <ChartLegend
          items={[
            { label: trendChartConfig.current.label, kind: style === "bars" ? "rect" : "line", color: "var(--chart-1)" },
            ...(prevLabel ? [{ label: prevLabel, kind: "line" as const, color: "var(--chart-2)" }] : []),
            ...(lastYearLabel && style !== "bars" ? [{ label: lastYearLabel, kind: "dashed" as const, color: "var(--chart-3)" }] : []),
          ]}
        />
        <TrendTable
          metric={metric}
          granularity={granularity}
          points={points}
          prevLabel={prevLabel}
          lastYearLabel={lastYearLabel}
        />
      </figcaption>
    </figure>
  );
}
