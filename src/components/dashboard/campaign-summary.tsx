import type { CampaignSummaryDto } from "@/lib/db/queries";
import { count, money, oneIn } from "@/lib/format";
import { Panel, PanelHeader, PanelBody, EmptyState } from "@/components/layout";
import { MetricLabel, LiveDot } from "@/components/copy";
import { CampaignRow, CAMPAIGN_COLS } from "./campaign-row";

const th = "text-[11px] font-medium uppercase tracking-wide text-muted-foreground";

export function CampaignSummary({ summary: s }: { summary: CampaignSummaryDto }) {
  const live = s.campaigns.filter((c) => c.live).length;
  return (
    <Panel id="campaigns" className="@container scroll-mt-20">
      <PanelHeader
        headingId="campaigns-h"
        title="What each campaign is doing"
        description="Bars show each campaign's share of your direct bookings."
        action={
          <span className="inline-flex h-7 items-center rounded-full border border-border px-2.5">
            <LiveDot label={`${live} live`} />
          </span>
        }
      />
      <PanelBody>
        {s.campaigns.length === 0 ? (
          <EmptyState title="No campaigns ran in this period" />
        ) : (
          <div role="table" aria-labelledby="campaigns-h" className="divide-y divide-border">
            <div role="row" className={`grid gap-3 pb-2 ${CAMPAIGN_COLS}`}>
              <span role="columnheader" className={th}>Campaign</span>
              <span role="columnheader" className={`hidden text-right @lg:block ${th}`}>Shown</span>
              <span role="columnheader" className={`hidden text-right @lg:block ${th}`}>Visits</span>
              <span role="columnheader" className="hidden justify-end @lg:flex">
                <MetricLabel glossaryKey="ctr" className="text-[11px]" />
              </span>
              <span role="columnheader" className={`text-right ${th}`}>Bookings</span>
            </div>
            {s.campaigns.map((c) => (
              <CampaignRow key={c.name} campaign={c} />
            ))}
            <div role="row" aria-label="All campaigns" className={`grid items-center gap-3 pt-3 ${CAMPAIGN_COLS}`}>
              <span role="cell" className="text-sm font-semibold">All campaigns</span>
              <span role="cell" className="hidden text-right text-sm tabular-nums @lg:block">{count(s.total.shown)}</span>
              <span role="cell" className="hidden text-right text-sm tabular-nums @lg:block">{count(s.total.visits)}</span>
              <span role="cell" className="hidden text-right text-sm tabular-nums @lg:block">{oneIn(s.total.ctr)}</span>
              <span role="cell" className="text-right text-sm tabular-nums">
                <span className="font-semibold">{count(s.total.bookings)}</span>{" "}
                <span className="text-muted-foreground">· {money(s.total.bookingValueCents)}</span>
              </span>
            </div>
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}
