import { DsSection, DsGrid, Spec, SwatchGrid, RadiusDemo, SpacingDemo, TypeScale } from "@/components/design-system";
import { Grid, Stack, Panel, PanelHeader, PanelBody, EmptyState, RangeSegment, RangeSelect, ThemeToggle } from "@/components/layout";
import { MetricLabel, Value, DeltaText, InsightTag, LiveDot, GlossaryEntry, Eyebrow } from "@/components/copy";
import { Sparkline, Meter, ShareBar, ShareLegend, ChartLegend, StyleSegment, MetricSelect, TrendChart, TrendTable, seriesColor } from "@/components/charts";
import { Headline, QuickAnalytics, QuickStat, InsightList, InsightCard, FeederMarkets, CampaignSummary, FunnelSection, GlossaryPanel, OverviewBodySkeleton } from "@/components/dashboard";
import { ActivityCalendar, DayCard, MonthBlocks, WeekStrip, MonthSummary, WeekdayRhythm, TrafficIntro, TrafficMetricSelect, TrafficStory, CampaignTrafficChart, CampaignTrafficTable, EventImpactCard, WhatAutumnDid, CampaignEfficiencyTable, DeviceConversion } from "@/components/website-traffic";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { range, overview, quick, trend, markets, campaigns, funnel, insights, activity, campaignSeries, impacts, efficiency, deviceRows } from "./fixtures";
import { monthBlocks, weekdayAverages, weekOf } from "@/lib/activity";

export const dynamic = "force-static";

const CHAPTERS = [
  ["tokens", "Tokens"], ["primitives", "Primitives"], ["atoms", "Atoms"], ["molecules", "Molecules"], ["organisms", "Organisms"], ["layout", "Layout"],
] as const;

const SURFACES = [
  { name: "--background", note: "page" }, { name: "--card", note: "panels" }, { name: "--muted", note: "insets, tracks" }, { name: "--sidebar", note: "sidebar" },
  { name: "--foreground", note: "ink" }, { name: "--muted-foreground", note: "secondary ink" }, { name: "--primary", note: "brand green" }, { name: "--border", note: "hairlines" },
];
const CHART = [
  { name: "--chart-1", note: "this period" }, { name: "--chart-2", note: "previous period" }, { name: "--chart-3", note: "last year, dashed" },
  { name: "--series-1", note: "identity 1" }, { name: "--series-2", note: "identity 2" }, { name: "--series-3", note: "identity 3" }, { name: "--series-4", note: "identity 4" }, { name: "--series-other", note: "folded remainder" },
];
const HEAT = [{ name: "--heat-0" }, { name: "--heat-1" }, { name: "--heat-2" }, { name: "--heat-3" }, { name: "--heat-4" }];

/** The calendar's narrow stage, rendered on its own: six months in 3 × 2, twelve in 4 × 3. */
const halfBlocks = monthBlocks(activity.days, 6);
const yearBlocks = monthBlocks(activity.days, 12);
const blockMax = (bs: { total: number | null }[]) => Math.max(0, ...bs.map((b) => b.total ?? 0));
const busiestDay = activity.days.reduce((b, d) => ((d.value ?? -1) > (b.value ?? -1) ? d : b)).date;

const devices = funnel.devices.map((d, i) => ({ label: ["Phone", "Computer", "Tablet"][i], share: d.share, color: seriesColor(i) }));

/** The design system as it is built: every token from globals.css, every primitive and component from src/components, rendered with fixture data. */
export default function DesignSystemPage() {
  return (
    <div className="grid grid-cols-1 gap-(--stack-gap) px-(--page-gutter) py-8 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-12">
      <nav aria-label="Chapters" className="flex flex-col gap-3 lg:sticky lg:top-8 lg:self-start">
        <div className="flex flex-col gap-1">
          <Eyebrow>Autumn dashboard</Eyebrow>
          <span className="text-base font-semibold">Design system</span>
          <span className="text-xs text-muted-foreground">Rendered from the code, with fixture numbers. Not linked from the product.</span>
        </div>
        <ul className="flex flex-wrap gap-1 lg:flex-col">
          {CHAPTERS.map(([id, label]) => (
            <li key={id}><a href={`#${id}`} className="inline-flex h-8 items-center rounded-(--r-in) px-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">{label}</a></li>
          ))}
        </ul>
        <ThemeToggle />
      </nav>

      <Stack gap="lg">
        <DsSection id="tokens" title="Tokens" description="Colour, radius, spacing and type come from globals.css. Every swatch reads its live variable, so light and dark are both true here.">
          <Spec name="Surfaces and ink" file="src/app/globals.css"><SwatchGrid tokens={SURFACES} /></Spec>
          <Spec name="Chart and identity colours" file="src/app/globals.css" note="One coloured series, comparisons in amber and grey; identity colours follow the entity, never its rank."><SwatchGrid tokens={CHART} /></Spec>
          <Spec name="Heat ramp" file="src/app/globals.css" note="Five steps mixed in oklab from the card surface to --chart-1."><SwatchGrid tokens={HEAT} /></Spec>
          <DsGrid>
            <Spec name="Concentric corners" file="--radius-panel · --r-in · --radius-float" note="Inner radius = outer radius − inset, floored at --radius-min. No literal radii in components."><RadiusDemo /></Spec>
            <Spec name="Spacing" file="--page-gutter · --stack-gap · --panel-pad" note="Gap and token padding only; margin utilities are gated out."><SpacingDemo /></Spec>
          </DsGrid>
          <Spec name="Type scale" file="Geist · tabular numerals" note="One family. Numbers are always tabular so columns line up."><TypeScale /></Spec>
        </DsSection>

        <DsSection id="primitives" title="Primitives" description="shadcn-generated, CLI-owned. Tokens and variants are edited; semantics are not.">
          <DsGrid columns={3}>
            <Spec name="Button" file="ui/button.tsx"><div className="flex flex-wrap gap-2"><Button>Default</Button><Button variant="outline">Outline</Button><Button variant="ghost">Ghost</Button><Button size="sm">Small</Button></div></Spec>
            <Spec name="Badge" file="ui/badge.tsx"><div className="flex flex-wrap gap-2"><Badge>Default</Badge><Badge variant="secondary">Secondary</Badge><Badge variant="outline">Outline</Badge></div></Spec>
            <Spec name="Skeleton" file="ui/skeleton.tsx"><div className="flex flex-col gap-2"><Skeleton className="h-4 w-40 rounded-(--r-in)" /><Skeleton className="h-8 w-64 rounded-(--r-in)" /></div></Spec>
            <Spec name="Tabs" file="ui/tabs.tsx"><Tabs defaultValue="a"><TabsList><TabsTrigger value="a">Overview</TabsTrigger><TabsTrigger value="b">Traffic</TabsTrigger></TabsList><TabsContent value="a" className="pt-2 text-sm text-muted-foreground">First tab.</TabsContent><TabsContent value="b" className="pt-2 text-sm text-muted-foreground">Second tab.</TabsContent></Tabs></Spec>
            <Spec name="ToggleGroup" file="ui/toggle-group.tsx"><ToggleGroup type="single" defaultValue="chart" aria-label="Show as" className="rounded-full border border-border bg-card p-0.5"><ToggleGroupItem value="chart" className="h-6 rounded-full px-2.5 text-[11px] data-[state=on]:bg-foreground data-[state=on]:text-card">Chart</ToggleGroupItem><ToggleGroupItem value="table" className="h-6 rounded-full px-2.5 text-[11px] data-[state=on]:bg-foreground data-[state=on]:text-card">Table</ToggleGroupItem></ToggleGroup></Spec>
          </DsGrid>
        </DsSection>

        <DsSection id="atoms" title="Atoms" description="Copy atoms read the glossary; chart atoms take numbers and a colour. None fetches.">
          <DsGrid columns={3}>
            <Spec name="MetricLabel" file="copy/metric-label.tsx" note="Label plus the glossary tooltip."><MetricLabel glossaryKey="direct_bookings" /></Spec>
            <Spec name="Value" file="copy/value.tsx"><div className="flex items-baseline gap-4"><Value kind="money" value={3799300} size="lg" /><Value kind="count" value={1548} /></div></Spec>
            <Spec name="DeltaText" file="copy/delta-text.tsx"><div className="flex flex-col gap-1"><DeltaText current={78} previous={66} vsLabel="previous" /><DeltaText current={60} previous={66} vsLabel="last year" /></div></Spec>
            <Spec name="InsightTag" file="copy/insight-tag.tsx"><div className="flex gap-2"><InsightTag kind="win" /><InsightTag kind="watch" /><InsightTag kind="action" /></div></Spec>
            <Spec name="LiveDot" file="copy/live-dot.tsx"><LiveDot /></Spec>
            <Spec name="GlossaryEntry" file="copy/glossary-entry.tsx"><GlossaryEntry glossaryKey="ctr" /></Spec>
            <Spec name="Sparkline" file="charts/sparkline.tsx"><div className="flex gap-4"><Sparkline points={[9, 11, 10, 12, 13, 11, 12]} /><Sparkline points={[13, 11, 12, 10, 9, 10, 8]} tone="muted" /></div></Spec>
            <Spec name="Meter" file="charts/meter.tsx"><div className="flex flex-col gap-2"><Meter share={0.72} label="Example share" /><Meter share={0.36} label="Second share" color="var(--series-2)" /></div></Spec>
            <Spec name="ShareBar + ShareLegend" file="charts/share-bar.tsx"><ShareBar segments={devices} label="Share by device" /><ShareLegend segments={devices} /></Spec>
            <Spec name="ChartLegend" file="charts/chart-legend.tsx"><ChartLegend items={[{ label: "This period", kind: "rect", color: "var(--chart-1)" }, { label: "Previous period", kind: "line", color: "var(--chart-2)" }, { label: "Last year", kind: "dashed", color: "var(--chart-3)" }]} /></Spec>
          </DsGrid>
        </DsSection>

        <DsSection id="molecules" title="Molecules" description="Panels and controls. Controls write the URL without scrolling; the page keeps its place.">
          <DsGrid>
            <Spec name="Panel · PanelHeader · PanelBody" file="layout/panel.tsx" note="Radius and padding from tokens; a child using rounded-(--r-in) is concentric."><Panel><PanelHeader title="Where your guests come from" description="Cities sending bookings, biggest first." action={<span className="text-primary">All markets →</span>} /><PanelBody><div className="h-16 rounded-(--r-in) bg-muted" /></PanelBody></Panel></Spec>
            <Spec name="EmptyState" file="layout/empty-state.tsx"><Panel><EmptyState title="No bookings in this period yet" description="Autumn will flag anything that changes." /></Panel></Spec>
            <Spec name="RangeSegment · RangeSelect" file="layout/range-segment.tsx · layout/range-select.tsx" note="Pills from xl, dropdown below; CSS decides."><div className="flex flex-wrap items-center gap-3"><RangeSegment current="30d" basePath="/design-system" /><RangeSelect current="30d" basePath="/design-system" /></div></Spec>
            <Spec name="MetricSelect · StyleSegment" file="charts/metric-select.tsx · charts/style-segment.tsx"><div className="flex flex-wrap items-center gap-3"><MetricSelect metric="booking_value" range="30d" basePath="/design-system" /><StyleSegment /></div></Spec>
            <Spec name="QuickStat" file="dashboard/quick-stat.tsx" note="Container query: the sparkline yields to the number under 15rem." surface="card"><QuickStat stat={quick.stats[1]} /></Spec>
            <Spec name="InsightCard" file="dashboard/insight-card.tsx" note="Tag, title, sentence, and the insight's own graph." surface="card"><InsightCard insight={insights[0]} /></Spec>
            <Spec name="DayCard" file="website-traffic/day-card.tsx" note="The calendar's kept-open day; fixed min height so hovering never moves the grid." surface="card"><DayCard day={activity.days[activity.days.length - 12]} typical={41} mode="pinned" unit="visits" rank={{ day: 12, days: 371, weekday: 2, weekdays: 53 }} /></Spec>
            <Spec name="WeekStrip · MonthSummary" file="website-traffic/day-context.tsx" note="What the chosen day sits inside, from the same click." surface="card"><WeekStrip days={weekOf(activity.days, activity.days[activity.days.length - 12].date)} pinned={activity.days[activity.days.length - 12].date} unit="visits" /><MonthSummary label="Sep 2026" total={1628} rank={2} count={13} deltaPct={18} unit="visits" /></Spec>
            <Spec name="EventImpactCard" file="website-traffic/event-impact-card.tsx" note="One change Autumn made, the same days before and after; under seven days it says so instead of comparing." surface="card"><EventImpactCard impact={impacts[0]} /><EventImpactCard impact={impacts[1]} /></Spec>
            <Spec name="MonthBlocks" file="website-traffic/month-blocks.tsx" note="The calendar's narrow stage: six or twelve calendar months in the box the 13-week grid would fill. Oldest top-left; only the roomier 3 × 2 has space for the change on the month before." surface="card"><div className="@container h-52 max-w-sm"><MonthBlocks blocks={halfBlocks} columns={3} unit="visits" pinnedDate={busiestDay} max={blockMax(halfBlocks)} /></div><div className="@container h-52 max-w-sm"><MonthBlocks blocks={yearBlocks} columns={4} unit="visits" pinnedDate={busiestDay} max={blockMax(yearBlocks)} /></div></Spec>
            <Spec name="TrafficMetricSelect" file="website-traffic/traffic-metric-select.tsx" note="Visits · Saw your hotel · Booked, on PillSelect."><TrafficMetricSelect metric="clicks" range="30d" /></Spec>
          </DsGrid>
        </DsSection>

        <DsSection id="organisms" title="Organisms" description="Whole panels as the pages compose them, fed the fixture DTOs. What you see here is what the query layer's shape produces.">
          <Spec name="Headline" file="dashboard/headline.tsx"><Headline overview={overview} range={range} /></Spec>
          <Spec name="QuickAnalytics" file="dashboard/quick-analytics.tsx"><QuickAnalytics data={quick} /></Spec>
          <DsGrid>
            <Spec name="TrendChart" file="charts/trend-chart.tsx" note="Area, bars or line; only this period animates."><Panel className="h-full"><PanelHeader title="Day by day" description="This period in green, the one before it in amber." /><TrendChart metric="booking_value" granularity="day" points={trend} prevLabel="The previous 10 days" lastYearLabel="This time last year" /></Panel></Spec>
            <Spec name="TrendTable" file="charts/trend-table.tsx" note="The chart's twin in the chart's box: pinned header and footer, a bar per row."><Panel className="h-full"><TrendTable metric="booking_value" granularity="day" points={trend} prevLabel="The previous 10 days" lastYearLabel="This time last year" /></Panel></Spec>
            <Spec name="InsightList" file="dashboard/insight-list.tsx"><InsightList insights={insights} /></Spec>
            <Spec name="FeederMarkets" file="dashboard/feeder-markets.tsx"><FeederMarkets markets={markets} /></Spec>
            <Spec name="CampaignSummary" file="dashboard/campaign-summary.tsx"><CampaignSummary summary={campaigns} /></Spec>
            <Spec name="FunnelSection" file="dashboard/funnel-section.tsx"><FunnelSection funnel={funnel} /></Spec>
            <Spec name="DeviceConversion" file="website-traffic/device-conversion.tsx" note="Share of visits by device, and what each one books."><DeviceConversion devices={deviceRows} /></Spec>
            <Spec name="WeekdayRhythm" file="website-traffic/weekday-rhythm.tsx" note="Monday first; the two busiest days in the chart green."><WeekdayRhythm averages={weekdayAverages(activity.days)} /></Spec>
            <Spec name="CampaignTrafficChart" file="website-traffic/campaign-traffic-chart.tsx" note="Stacked by campaign identity colour; an amber marker per event Autumn made."><Panel className="h-full"><PanelHeader title="Visits by campaign" description="Which ads brought people." /><CampaignTrafficChart data={campaignSeries} range={range} /></Panel></Spec>
            <Spec name="CampaignTrafficTable" file="website-traffic/campaign-traffic-table.tsx" note="The chart's twin: buckets × campaigns with totals."><Panel className="h-full"><CampaignTrafficTable data={campaignSeries} range={range} /></Panel></Spec>
            <Spec name="WhatAutumnDid" file="website-traffic/what-autumn-did.tsx"><WhatAutumnDid impacts={impacts} /></Spec>
          </DsGrid>
          <Spec name="TrafficStory" file="website-traffic/traffic-story.tsx" note="The composed row: chart and list share one chosen change. Page through the changes; the row never changes height."><TrafficStory data={campaignSeries} impacts={impacts} range={range} metric="clicks" /></Spec>
          <Spec name="CampaignEfficiencyTable" file="website-traffic/campaign-efficiency-table.tsx" note="Ranked by value per visit; the total row reads daily_metrics, so it never drifts from the Overview."><CampaignEfficiencyTable data={efficiency} /></Spec>
          <Spec name="GlossaryPanel" file="dashboard/glossary-panel.tsx"><GlossaryPanel /></Spec>
          <Spec name="ActivityCalendar" file="website-traffic/activity-calendar.tsx" note="Wide: a square is a day, 13/26/53 columns. Under 28rem (42rem for a year) the same 13:7 stage holds 6 or 12 month blocks instead; the header stacks readout left, toggle right."><ActivityCalendar activity={activity} /></Spec>
          <Spec name="TrafficIntro" file="website-traffic/traffic-intro.tsx"><TrafficIntro range={range} totals={{ visits: 1548, allVisits: 12679, newVisitors: 1116, previousVisits: 1402 }} /></Spec>
          <Spec name="OverviewBodySkeleton" file="dashboard/overview-skeleton.tsx" note="Reserves the plot height so the chart never shifts the page."><OverviewBodySkeleton /></Spec>
        </DsSection>

        <DsSection id="layout" title="Layout" description="Page grids are breakpoint classes only. Never a JS viewport check.">
          <Spec name="Grid · sidebar" file="layout/grid.tsx" note="2fr / 1fr from lg."><Grid variant="sidebar"><div className="h-16 rounded-(--r-in) bg-muted" /><div className="h-16 rounded-(--r-in) bg-muted" /></Grid></Spec>
          <Spec name="Grid · two" file="layout/grid.tsx"><Grid variant="two"><div className="h-16 rounded-(--r-in) bg-muted" /><div className="h-16 rounded-(--r-in) bg-muted" /></Grid></Spec>
          <Spec name="Grid · detail" file="layout/grid.tsx" note="1fr / 1.5fr from xl; stacked below so the wider panel is never one tall column."><Grid variant="detail"><div className="h-16 rounded-(--r-in) bg-muted" /><div className="h-16 rounded-(--r-in) bg-muted" /></Grid></Spec>
          <Spec name="Grid · wide-three" file="layout/grid.tsx" note="Two columns from lg, three from 2xl."><Grid variant="wide-three"><div className="h-16 rounded-(--r-in) bg-muted" /><div className="h-16 rounded-(--r-in) bg-muted" /><div className="h-16 rounded-(--r-in) bg-muted" /></Grid></Spec>
        </DsSection>
      </Stack>
    </div>
  );
}
