import type { Insight } from "@/lib/insights";
import { Panel, PanelHeader, PanelBody, EmptyState } from "@/components/layout";
import { InsightCard } from "./insight-card";

export function InsightList({ insights }: { insights: Insight[] }) {
  return (
    <Panel>
      <PanelHeader headingId="insights-h" title="What's happening" description="Computed from the numbers on this page." />
      <PanelBody className="divide-y divide-border">
        {insights.length === 0 ? (
          <EmptyState title="Nothing needs your attention this period" description="Autumn will flag anything that changes." />
        ) : (
          insights.map((i) => <InsightCard key={i.id} insight={i} />)
        )}
      </PanelBody>
    </Panel>
  );
}
