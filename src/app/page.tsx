import { Suspense } from "react";
import { db } from "@/lib/db/client";
import { parseRange, type DateRange } from "@/lib/date-range";
import { PROPERTY } from "@/lib/property";
import { computeInsights } from "@/lib/insights";
import {
  getAllBreakdowns,
  getCampaigns,
  getDataBounds,
  getFunnel,
  getMarkets,
  getOverview,
  getQuickAnalytics,
  getTrend,
  isTrendMetric,
  type OverviewDto,
  type TrendMetric,
} from "@/lib/db/queries";
import { AppShell, Grid, Stack, Panel, PanelHeader } from "@/components/layout";
import {
  Headline,
  QuickAnalytics,
  InsightList,
  GlossarySection,
  OverviewBodySkeleton,
  FeederMarkets,
  CampaignSummary,
  FunnelSection,
} from "@/components/dashboard";
import { TrendChart, StyleSegment, MetricSelect } from "@/components/charts";
import { AssistantPopover } from "@/components/assistant";

export const dynamic = "force-dynamic";

type Search = Promise<{ range?: string; metric?: string }>;

export default async function OverviewPage({ searchParams }: { searchParams: Search }) {
  const { range: rangeParam, metric: metricParam } = await searchParams;
  const bounds = await getDataBounds(db);
  const range = parseRange(rangeParam, bounds.min, bounds.max);
  const metric: TrendMetric = isTrendMetric(metricParam) ? metricParam : "booking_value";
  const [overview, quick] = await Promise.all([
    getOverview(db, range, PROPERTY.feeRateBps),
    getQuickAnalytics(db, range),
  ]);
  return (
    <AppShell
      active="overview"
      range={range.preset}
      dataThrough={bounds.max}
      basePath="/"
      metric={metric === "booking_value" ? undefined : metric}
    >
      <Headline overview={overview} range={range} />
      <QuickAnalytics data={quick} />
      <Suspense fallback={<OverviewBodySkeleton />}>
        <OverviewBody range={range} metric={metric} overview={overview} />
      </Suspense>
      <AssistantPopover />
    </AppShell>
  );
}

/** Legend wording comes from the range itself, so "year to date" does not claim a "previous 260 days". */
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The slower half of the page, streamed behind one Suspense boundary; five queries in one round trip. */
async function OverviewBody({
  range,
  metric,
  overview,
}: {
  range: DateRange;
  metric: TrendMetric;
  overview: OverviewDto;
}) {
  const [trend, markets, campaigns, funnel, breakdowns] = await Promise.all([
    getTrend(db, range, metric),
    getMarkets(db, range),
    getCampaigns(db, range),
    getFunnel(db, range),
    getAllBreakdowns(db, range),
  ]);
  const insights = computeInsights({ overview, breakdowns, range }, 3);
  const prevLabel = range.comparison ? cap(range.comparison.prevLabel) : null;
  const lastYearLabel = range.comparison ? cap(range.comparison.lastYearLabel) : null;
  return (
    <Stack>
      <Grid variant="sidebar">
        <Panel id="trend" className="scroll-mt-20">
          <PanelHeader
            headingId="trend-h"
            title="Day by day"
            description="This period in colour, comparisons in grey."
            action={
              <div className="flex items-center gap-2">
                <MetricSelect metric={metric} range={range.preset} basePath="/" />
                <StyleSegment />
              </div>
            }
          />
          <TrendChart
            metric={metric}
            granularity={range.granularity}
            points={trend}
            prevLabel={prevLabel}
            lastYearLabel={lastYearLabel}
          />
        </Panel>
        <InsightList insights={insights} />
      </Grid>
      <Grid variant="wide-three">
        <FeederMarkets markets={markets} />
        <CampaignSummary summary={campaigns} />
        <FunnelSection funnel={funnel} />
      </Grid>
      <GlossarySection
        keys={[
          "direct_bookings",
          "booking_value",
          "autumn_fee",
          "net_revenue",
          "impressions",
          "clicks",
          "website_visits",
          "ctr",
          "conversion",
          "new_visitors",
          "pages_per_session",
        ]}
      />
    </Stack>
  );
}
