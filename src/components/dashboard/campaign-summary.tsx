import type { CampaignSummaryDto } from "@/lib/db/queries";
import { count, money, oneIn } from "@/lib/format";
import { Panel, PanelHeader, PanelBody, EmptyState } from "@/components/layout";
import { LiveDot } from "@/components/copy";
import { ShareBar, ShareLegend, seriesColor } from "@/components/charts";
import { CampaignRow, CAMPAIGN_COLS } from "./campaign-row";

const th = "text-[11px] font-medium uppercase tracking-wide text-muted-foreground";

export function CampaignSummary({ summary: s }: { summary: CampaignSummaryDto }) {
  const live = s.campaigns.filter((c) => c.live).length;
  const segments = s.campaigns.map((c, i) => ({ label: c.name, share: c.share, color: seriesColor(i) }));
  return (
    <Panel id="campaigns" className="@container scroll-mt-20">
      <PanelHeader
        headingId="campaigns-h"
        title="What each campaign is doing"
        description="Each campaign's share of your direct bookings."
        action={
          <span className="inline-flex h-7 items-center rounded-full border border-border px-2.5">
            <LiveDot label={`${live} live`} />
          </span>
        }
      />
      <PanelBody className="gap-4">
        {s.campaigns.length === 0 ? (
          <EmptyState title="No campaigns ran in this period" />
        ) : (
          <>
            <div className="flex flex-col gap-2.5">
              <ShareBar segments={segments} label="Share of bookings by campaign" />
              <ShareLegend segments={segments} />
            </div>
            <div role="table" aria-labelledby="campaigns-h" className="divide-y divide-border">
              <div role="row" className={`grid items-end gap-x-4 pb-2 ${CAMPAIGN_COLS}`}>
                <span role="columnheader" className={th}>Campaign</span>
                <span role="columnheader" className={`hidden text-right @lg:block ${th}`}>Shown</span>
                <span role="columnheader" className={`hidden text-right @lg:block ${th}`}>Clicks</span>
                <span role="columnheader" className={`hidden text-right @lg:block ${th}`} title="How many people who saw the ad clicked it">Clicked</span>
                <span role="columnheader" className={`text-right ${th}`}>Bookings</span>
              </div>
              {s.campaigns.map((c, i) => (
                <CampaignRow key={c.name} campaign={c} color={seriesColor(i)} />
              ))}
              <div role="row" aria-label="All campaigns" className={`grid items-center gap-x-4 pt-3 ${CAMPAIGN_COLS}`}>
                <span role="cell" className="text-sm font-semibold">All campaigns</span>
                <span role="cell" className="hidden text-right text-sm tabular-nums @lg:block">{count(s.total.shown)}</span>
                <span role="cell" className="hidden text-right text-sm tabular-nums @lg:block">{count(s.total.visits)}</span>
                <span role="cell" className="hidden text-right text-sm tabular-nums @lg:block">{oneIn(s.total.ctr)}</span>
                <span role="cell" className="flex flex-col items-end text-right text-sm tabular-nums">
                  <span className="font-semibold">{count(s.total.bookings)}</span>
                  <span className="text-xs text-muted-foreground">{money(s.total.bookingValueCents)}</span>
                </span>
              </div>
            </div>
          </>
        )}
      </PanelBody>
    </Panel>
  );
}
