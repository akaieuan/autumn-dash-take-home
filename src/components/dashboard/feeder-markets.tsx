import { ArrowRight } from "lucide-react";
import type { MarketDto } from "@/lib/db/queries";
import { Panel, PanelHeader, PanelBody, EmptyState } from "@/components/layout";
import { ShareBar, ShareLegend, seriesColor, OTHER_COLOR } from "@/components/charts";
import { MarketRow, MARKET_COLS } from "./market-row";

const th = "text-[11px] font-medium uppercase tracking-wide text-muted-foreground";
const FOLDED = "Everywhere else";

export function FeederMarkets({ markets }: { markets: MarketDto[] }) {
  const total = markets.reduce((sum, m) => sum + m.bookings, 0);
  // The four biggest cities get their own colour; the folded remainder is neutral so it never competes.
  const colorOf = (m: MarketDto, i: number) => (m.name === FOLDED ? OTHER_COLOR : seriesColor(i));
  const segments = markets.map((m, i) => ({ label: m.name, share: total ? m.bookings / total : 0, color: colorOf(m, i) }));
  return (
    <Panel id="markets" className="@container scroll-mt-20">
      <PanelHeader
        headingId="markets-h"
        title="Where your guests come from"
        description="Cities sending bookings, biggest first."
        action={
          <a href="/website-traffic#markets" className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline">
            All markets <ArrowRight className="size-3" aria-hidden="true" />
          </a>
        }
      />
      <PanelBody className="flex-1 gap-4">
        {markets.length === 0 ? (
          <EmptyState title="No bookings in this period yet" />
        ) : (
          <>
            <div className="flex flex-col gap-2.5">
              <ShareBar segments={segments} label="Share of bookings by city" />
              <ShareLegend segments={segments} />
            </div>
            {/* Rows share the panel's spare height (the campaigns beside it are taller), so the list never stops short. */}
            <div role="table" aria-labelledby="markets-h" className="flex flex-1 flex-col divide-y divide-border [&>[role=row]:not(:first-child)]:flex-1 [&>[role=row]:not(:first-child)]:items-center">
              <div role="row" className={`grid gap-x-4 pb-2 ${MARKET_COLS}`}>
                <span role="columnheader" className={th}>City</span>
                <span role="columnheader" className={`hidden text-right @md:block ${th}`}>Clicks</span>
                <span role="columnheader" className={`hidden text-right @md:block ${th}`}>Bookings</span>
                <span role="columnheader" className={`text-right ${th}`}>Value</span>
              </div>
              {markets.map((m, i) => (
                <MarketRow key={m.name} market={m} color={colorOf(m, i)} />
              ))}
            </div>
          </>
        )}
      </PanelBody>
    </Panel>
  );
}
