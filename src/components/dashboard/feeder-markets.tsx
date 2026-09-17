import { ArrowRight } from "lucide-react";
import type { MarketDto } from "@/lib/db/queries";
import { count, money } from "@/lib/format";
import { Panel, PanelHeader, PanelBody, EmptyState } from "@/components/layout";
import { ShareBar, ShareLegend, Meter, DataTable, seriesColor, OTHER_COLOR, type DataColumn } from "@/components/charts";

const FOLDED = "Everywhere else";

export function FeederMarkets({ markets }: { markets: MarketDto[] }) {
  const total = markets.reduce((sum, m) => sum + m.bookings, 0);
  // The four biggest cities get their own colour; the folded remainder is neutral so it never competes.
  const colorOf = (m: MarketDto, i: number) => (m.name === FOLDED ? OTHER_COLOR : seriesColor(i));
  const segments = markets.map((m, i) => ({ label: m.name, share: total ? m.bookings / total : 0, color: colorOf(m, i) }));
  const colorByName = new Map(markets.map((m, i) => [m.name, colorOf(m, i)]));

  const columns: DataColumn<MarketDto>[] = [
    {
      key: "city",
      header: "City",
      cell: (m) => (
        <span className="flex min-w-0 flex-col gap-1.5">
          <span className="flex min-w-0 items-center gap-2">
            <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: colorByName.get(m.name) }} />
            <span className="truncate font-medium">{m.name}</span>
            {m.hint ? <span className="shrink-0 text-muted-foreground">· {m.hint}</span> : null}
          </span>
          <Meter share={m.share} label={`${m.name} share of bookings`} color={colorByName.get(m.name)} />
        </span>
      ),
    },
    { key: "visits", header: "Clicks", align: "right", hideBelow: "md", className: "text-muted-foreground", cell: (m) => count(m.visits) },
    { key: "bookings", header: "Bookings", align: "right", hideBelow: "md", className: "font-semibold", cell: (m) => count(m.bookings) },
    {
      key: "value",
      header: "Value",
      align: "right",
      // On a phone the two hidden columns fold into this one, so the value cell carries the count.
      cell: (m) => (
        <span className="flex flex-col items-end">
          <span className="font-semibold @md:font-normal">{money(m.bookingValueCents)}</span>
          <span className="text-muted-foreground @md:hidden">{count(m.bookings)} bookings</span>
        </span>
      ),
    },
  ];

  return (
    <Panel id="markets" className="@container">
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
            <DataTable
              fill
              label="Bookings by city"
              columns={columns}
              rows={markets}
              rowKey={(m) => m.name}
              rowLabel={(m) => m.name}
            />
          </>
        )}
      </PanelBody>
    </Panel>
  );
}
