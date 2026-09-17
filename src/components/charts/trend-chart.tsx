"use client";
import { useMemo, useState } from "react";
import { Area, Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { bucketLabel, money, moneyCompact, compact, count } from "@/lib/format";
import { cn } from "@/lib/utils";
import { trendChartConfig, METRIC_LABELS, metricKind } from "./chart-config";
import { useChartStyle } from "./use-chart-style";
import { usePrefersReducedMotion } from "./use-reduced-motion";
import { ChartLegend } from "./chart-legend";
import { TrendTable, type TrendProps } from "./trend-table";

const GRAN = { day: "day by day", week: "week by week", month: "month by month" } as const;
type View = "chart" | "table";

/**
 * One metric, three periods. Style (area | bars | line) is the viewer's preference; the plot fills the
 * panel it sits in and never drops below --plot-height, so switching style or view never moves the page.
 * Only this period animates (once, briefly); the grey comparisons are context and draw at once.
 */
export function TrendChart({ metric, granularity, points, prevLabel, lastYearLabel }: TrendProps) {
  const [style] = useChartStyle();
  const [view, setView] = useState<View>("chart");
  const reducedMotion = usePrefersReducedMotion();
  const kind = metricKind(metric);
  const axis = kind === "money" ? (v: number) => moneyCompact(v) : (v: number) => compact(v);
  const full = kind === "money" ? money : count;
  const title = `${METRIC_LABELS[metric]}, ${GRAN[granularity]}`;
  const data = useMemo(() => points.map((p) => ({ ...p, label: bucketLabel(p.bucket, granularity) })), [points, granularity]);
  const hasComparison = prevLabel !== null;
  const curve = granularity === "day" ? "linear" : "monotone";
  const anim = { isAnimationActive: !reducedMotion, animationDuration: 450, animationEasing: "ease-out" as const, animationBegin: 0 };

  return (
    <figure aria-label={title} className="flex min-h-0 flex-1 flex-col gap-3">
      {view === "table" ? (
        <TrendTable metric={metric} granularity={granularity} points={points} prevLabel={prevLabel} lastYearLabel={lastYearLabel} />
      ) : (
        <ChartContainer config={trendChartConfig} className="aspect-auto min-h-(--plot-height) w-full flex-1">
          <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barCategoryGap="24%">
            <CartesianGrid vertical={false} strokeDasharray="0" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={32} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={axis} allowDecimals={kind === "money"} domain={[0, "auto"]} />
            <ChartTooltip
              cursor
              content={
                <ChartTooltipContent
                  className="rounded-(--radius-float) p-(--float-pad)"
                  formatter={(v, name) => [full(Number(v)), trendChartConfig[name as keyof typeof trendChartConfig]?.label ?? name]}
                />
              }
            />
            {hasComparison && lastYearLabel ? (
              <Line type={curve} dataKey="lastYear" stroke="var(--color-lastYear)" strokeWidth={2} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
            ) : null}
            {hasComparison ? <Line type={curve} dataKey="previous" stroke="var(--color-previous)" strokeWidth={2} dot={false} isAnimationActive={false} /> : null}
            {style === "bars" ? (
              <Bar dataKey="current" fill="var(--color-current)" radius={[4, 4, 0, 0]} maxBarSize={24} {...anim} />
            ) : style === "line" ? (
              <Line type={curve} dataKey="current" stroke="var(--color-current)" strokeWidth={2} dot={false} activeDot={{ r: 5, strokeWidth: 2 }} {...anim} />
            ) : (
              <Area type={curve} dataKey="current" stroke="var(--color-current)" fill="var(--color-current)" fillOpacity={0.12} strokeWidth={2} dot={false} activeDot={{ r: 5, strokeWidth: 2 }} {...anim} />
            )}
          </ComposedChart>
        </ChartContainer>
      )}
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <ChartLegend
          items={[
            { label: trendChartConfig.current.label, kind: style === "bars" ? "rect" : "line", color: "var(--chart-1)" },
            ...(prevLabel ? [{ label: prevLabel, kind: "line" as const, color: "var(--chart-2)" }] : []),
            ...(lastYearLabel ? [{ label: lastYearLabel, kind: "dashed" as const, color: "var(--chart-3)" }] : []),
          ]}
        />
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => { if (v === "chart" || v === "table") setView(v); }}
          aria-label="Show as"
          className="rounded-full border border-border bg-card p-0.5"
        >
          {(["chart", "table"] as const).map((v) => (
            <ToggleGroupItem key={v} value={v} aria-label={v === "chart" ? "Chart" : "Table"} className={cn("h-6 rounded-full px-2.5 text-[11px] font-medium text-muted-foreground data-[state=on]:bg-foreground data-[state=on]:text-card")}>
              {v === "chart" ? "Chart" : "Table"}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </figcaption>
    </figure>
  );
}
