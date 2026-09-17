import { ArrowRight } from "lucide-react";
import type { MarketDto } from "@/lib/db/queries";
import { Panel, PanelHeader, PanelBody, EmptyState } from "@/components/layout";
import { MarketRow, MARKET_COLS } from "./market-row";

const th = "text-[11px] font-medium uppercase tracking-wide text-muted-foreground";

export function FeederMarkets({ markets }: { markets: MarketDto[] }) {
  return (
    <Panel id="markets" className="@container scroll-mt-20">
      <PanelHeader
        headingId="markets-h"
        title="Where your guests come from"
        description="Cities sending visitors and bookings, ranked by bookings."
        action={
          <a href="/website-traffic#markets" className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline">
            All markets <ArrowRight className="size-3" aria-hidden="true" />
          </a>
        }
      />
      <PanelBody>
        {markets.length === 0 ? (
          <EmptyState title="No bookings in this period yet" />
        ) : (
          <div role="table" aria-labelledby="markets-h" className="divide-y divide-border">
            <div role="row" className={`grid gap-3 pb-2 ${MARKET_COLS}`}>
              <span role="columnheader" className={th}>Market</span>
              <span role="columnheader" className={`hidden text-right @md:block ${th}`}>Visits</span>
              <span role="columnheader" className={`text-right ${th}`}>Bookings</span>
              <span role="columnheader" className={`text-right ${th}`}>Value</span>
            </div>
            {markets.map((m) => (
              <MarketRow key={m.name} market={m} />
            ))}
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}
