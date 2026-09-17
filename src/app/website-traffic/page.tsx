import { db } from "@/lib/db/client";
import { parseRange } from "@/lib/date-range";
import { getDataBounds, getFunnel, getMarkets, getTrend } from "@/lib/db/queries";
import { AppShell, Grid, Panel, PanelHeader } from "@/components/layout";
import { FeederMarkets } from "@/components/dashboard";
import { TrendChart } from "@/components/charts";
import { AssistantPopover } from "@/components/assistant";
import { TrafficIntro, SectionPlaceholder, DeviceSplit } from "@/components/website-traffic";

export const dynamic = "force-dynamic";

type Search = Promise<{ range?: string }>;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Scaffold of the second screen (D31). Real data where the query layer already has it; placeholders mark what the artboard pass will design. */
export default async function WebsiteTrafficPage({ searchParams }: { searchParams: Search }) {
  const { range: rangeParam } = await searchParams;
  const bounds = await getDataBounds(db);
  const range = parseRange(rangeParam, bounds.min, bounds.max);
  const [visits, markets, funnel] = await Promise.all([
    getTrend(db, range, "website_visits"),
    getMarkets(db, range, 8),
    getFunnel(db, range),
  ]);
  const prevLabel = range.comparison ? cap(range.comparison.prevLabel) : null;
  const lastYearLabel = range.comparison ? cap(range.comparison.lastYearLabel) : null;

  return (
    <AppShell active="website-traffic" range={range.preset} dataThrough={bounds.max} basePath="/website-traffic">
      <TrafficIntro range={range} />
      <Grid variant="sidebar">
        <Panel id="visits" className="scroll-mt-20 h-full">
          <PanelHeader title="Visits to your site" description="This period in colour, comparisons in grey." />
          <TrendChart metric="website_visits" granularity={range.granularity} points={visits} prevLabel={prevLabel} lastYearLabel={lastYearLabel} />
        </Panel>
        <SectionPlaceholder
          id="channels"
          title="Where visits come from"
          description="The routes people take to your website."
          planned={["Search and Google Hotels", "Typed in directly", "Social and email", "AI search (ChatGPT, Perplexity)"]}
        />
      </Grid>
      <Grid variant="two">
        <FeederMarkets markets={markets} />
        <div className="flex flex-col gap-(--stack-gap)">
          <DeviceSplit devices={funnel.devices} />
          <SectionPlaceholder
            id="pages"
            title="What they look at"
            description="The pages visitors read before they book."
            planned={["Most-viewed pages", "Time of day visitors arrive", "Pages per visit over time"]}
          />
        </div>
      </Grid>
      <AssistantPopover />
    </AppShell>
  );
}
