"use client";
import { useEffect, useMemo, useState } from "react";
import { Area, Bar, CartesianGrid, ComposedChart, ReferenceArea, ReferenceLine, XAxis, YAxis } from "recharts";
import { bucketLabel, compact, count, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EmptyState } from "@/components/layout";
import { ChartLegend, campaignColor, usePrefersReducedMotion } from "@/components/charts";
import { TRAFFIC_METRIC_LABELS } from "./traffic-config";
import { EventMarker, type MarkerEvent } from "./event-marker";
import { CampaignTrafficTable, bucketSpan, type CampaignTrafficProps } from "./campaign-traffic-table";

const GRAN = { day: "day by day", week: "week by week", month: "month by month" } as const;
type View = "chart" | "table";

/** Bars while the buckets are few enough to count; a stacked area once the shape matters more than the bar. */
const AREA_FROM_BUCKETS = 14;
const ANIM_MS = 450;

/**
 * Paid visits over time, stacked by the campaign that brought them, with a dashed line wherever Autumn
 * changed something — so "it went up in May" and "Autumn raised the budget in May" are one picture.
 * Colour is the campaign's identity (Discovery is the same amber here as on the Overview), never its rank.
 */
/** The change the owner has picked in the list beside the chart: its id and the after-window it is measured on. */
export interface EventHighlight { id: number; from: string; to: string }

/** Bucket start containing a date, from the chart's own bucket list. */
const bucketOf = (buckets: string[], date: string) => buckets.reduce((hit, b) => (b <= date ? b : hit), buckets[0]);

export function CampaignTrafficChart({ data, range, highlight = null, onPickEvent }: CampaignTrafficProps & { highlight?: EventHighlight | null; onPickEvent?: (id: number) => void }) {
  const [view, setView] = useState<View>("chart");
  const reducedMotion = usePrefersReducedMotion();
  // Animate the first draw only: switching metric or range should feel like a correction, not a replay.
  // The flag drops after the animation has finished, so the re-render it causes never cuts one short.
  const [firstDraw, setFirstDraw] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setFirstDraw(false), ANIM_MS + 50);
    return () => clearTimeout(t);
  }, []);

  const { buckets, series, granularity, metric } = data;
  const title = `${TRAFFIC_METRIC_LABELS[metric]} by campaign, ${GRAN[granularity]}`;
  const keyOf = (i: number) => `s${i}`;

  const config = useMemo<ChartConfig>(
    () => Object.fromEntries(series.map((s, i) => [keyOf(i), { label: s.label, color: campaignColor(s.name) }])),
    [series],
  );
  const rows = useMemo(
    () =>
      buckets.map((b, i) => {
        const end = bucketSpan(buckets, i, range.to);
        return {
          label: bucketLabel(b, granularity),
          span: granularity === "day" || end === b ? shortDate(b) : `${shortDate(b)} – ${shortDate(end)}`,
          total: series.reduce((s, c) => s + (c.values[i] ?? 0), 0),
          ...Object.fromEntries(series.map((s, si) => [keyOf(si), s.values[i] ?? 0])),
        };
      }),
    [buckets, series, granularity, range.to],
  );
  // Several changes on one bucket share one line; the marker then carries their count.
  const marks = useMemo(() => {
    const byBucket = new Map<string, MarkerEvent[]>();
    for (const e of data.events) byBucket.set(e.bucket, [...(byBucket.get(e.bucket) ?? []), { id: e.id, kindLabel: e.kindLabel, title: e.title }]);
    return [...byBucket.entries()];
  }, [data.events]);

  const anim = { isAnimationActive: firstDraw && !reducedMotion, animationDuration: ANIM_MS, animationEasing: "ease-out" as const, animationBegin: 0 };
  const stacked = buckets.length >= AREA_FROM_BUCKETS;
  const curve = granularity === "day" ? "linear" : "monotone";

  return (
    <figure aria-label={title} className="@container flex min-h-0 flex-1 flex-col gap-3">
      {series.length === 0 ? (
        <div className="flex min-h-(--plot-height) flex-1 items-center justify-center">
          <EmptyState title="No paid visits in this period" />
        </div>
      ) : view === "table" ? (
        <CampaignTrafficTable data={data} range={range} />
      ) : (
        <ChartContainer config={config} className="aspect-auto min-h-(--plot-height) w-full flex-1">
          <ComposedChart data={rows} margin={{ top: 12, right: 12, left: 0, bottom: 0 }} barCategoryGap="24%">
            <CartesianGrid vertical={false} strokeDasharray="0" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={32} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={compact} allowDecimals={false} domain={[0, "auto"]} />
            <ChartTooltip
              cursor
              content={
                <ChartTooltipContent
                  className="min-w-48 rounded-(--radius-float) p-(--float-pad)"
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.span ?? ""}
                  formatter={(v, name, item, index) => (
                    <>
                      <span className="flex w-full items-center gap-2">
                        <span aria-hidden="true" className="size-2.5 shrink-0 rounded-(--radius-min)" style={{ background: item.color }} />
                        <span className="flex-1 text-muted-foreground">{config[name as string]?.label ?? name}</span>
                        <span className="font-medium tabular-nums text-foreground">{count(Number(v))}</span>
                      </span>
                      {index === series.length - 1 ? (
                        <span className="flex w-full items-center gap-2 border-t border-border pt-1.5">
                          <span aria-hidden="true" className="size-2.5 shrink-0" />
                          <span className="flex-1 text-muted-foreground">All campaigns</span>
                          <span className="font-semibold tabular-nums text-foreground">{count(Number(item.payload?.total ?? 0))}</span>
                        </span>
                      ) : null}
                    </>
                  )}
                />
              }
            />
            {series.map((s, i) =>
              stacked ? (
                <Area
                  key={s.name}
                  type={curve}
                  dataKey={keyOf(i)}
                  stackId="traffic"
                  stroke="var(--card)"
                  strokeWidth={1}
                  fill={campaignColor(s.name)}
                  fillOpacity={0.9}
                  dot={false}
                  {...anim}
                />
              ) : (
                <Bar
                  key={s.name}
                  dataKey={keyOf(i)}
                  stackId="traffic"
                  fill={campaignColor(s.name)}
                  maxBarSize={28}
                  radius={i === series.length - 1 ? [4, 4, 0, 0] : undefined}
                  {...anim}
                />
              ),
            )}
            {/* The picked change's after-window, shaded, so "after" on the card is a region on the chart. */}
            {highlight && buckets.length > 0 ? (
              <ReferenceArea
                x1={bucketLabel(bucketOf(buckets, highlight.from), granularity)}
                x2={bucketLabel(bucketOf(buckets, highlight.to < range.to ? highlight.to : range.to), granularity)}
                fill="var(--chart-2)"
                fillOpacity={0.1}
                stroke="none"
              />
            ) : null}
            {marks.map(([bucket, events]) => {
              const active = highlight !== null && events.some((e) => e.id === highlight.id);
              return (
                <ReferenceLine
                  key={bucket}
                  x={bucketLabel(bucket, granularity)}
                  stroke="var(--chart-2)"
                  strokeWidth={active ? 1.5 : 1}
                  strokeOpacity={highlight && !active ? 0.45 : 1}
                  strokeDasharray={active ? undefined : "3 3"}
                  label={<EventMarker events={events} active={active} onPick={onPickEvent} />}
                />
              );
            })}
          </ComposedChart>
        </ChartContainer>
      )}
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <ChartLegend
          items={[
            ...series.map((s) => ({ label: s.label, kind: "rect" as const, color: campaignColor(s.name) })),
            ...(data.events.length > 0 ? [{ label: "What Autumn did", kind: "dashed" as const, color: "var(--chart-2)" }] : []),
          ]}
        />
        {series.length === 0 ? null : (
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
        )}
      </figcaption>
    </figure>
  );
}
