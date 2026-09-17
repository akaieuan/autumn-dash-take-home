import type { CampaignDto, CampaignSummaryDto } from "@/lib/db/queries";
import { glossary } from "@/lib/glossary";
import { count, money, oneIn } from "@/lib/format";
import { Panel, PanelHeader, PanelBody, EmptyState } from "@/components/layout";
import { LiveDot } from "@/components/copy";
import { ShareBar, ShareLegend, Meter, DataTable, campaignKeyColor, type DataColumn } from "@/components/charts";

/** Bookings and what they were worth, stacked, because the pair is one answer. */
const booked = (bookings: number, valueCents: number) => (
  <span className="flex flex-col items-end">
    <span className="font-semibold">{count(bookings)}</span>
    <span className="text-muted-foreground">{money(valueCents)}</span>
  </span>
);

export function CampaignSummary({ summary: s }: { summary: CampaignSummaryDto }) {
  const live = s.campaigns.filter((c) => c.live).length;
  // Colour is the campaign's identity, not its rank here: the same amber follows Discovery onto the traffic screen, where the rows are ranked by visits instead of bookings.
  const segments = s.campaigns.map((c) => ({ label: c.name, share: c.share, color: campaignKeyColor(c.key) }));

  const columns: DataColumn<CampaignDto>[] = [
    {
      key: "campaign",
      header: "Campaign",
      cell: (c) => {
        const purpose = c.key ? glossary[c.key].purpose : undefined;
        return (
          <span className="flex min-w-0 flex-col gap-1.5">
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: campaignKeyColor(c.key) }} />
              <span className="truncate font-medium">{c.name}</span>
              {c.live ? <LiveDot /> : null}
            </span>
            {purpose ? <span className="block leading-snug text-muted-foreground">{purpose}</span> : null}
            <Meter share={c.share} label={`${c.name} share of bookings`} color={campaignKeyColor(c.key)} />
          </span>
        );
      },
      foot: "All campaigns",
    },
    { key: "shown", header: "Shown", align: "right", hideBelow: "lg", className: "text-muted-foreground", cell: (c) => count(c.shown), foot: count(s.total.shown) },
    { key: "visits", header: "Clicks", align: "right", hideBelow: "lg", className: "text-muted-foreground", cell: (c) => count(c.visits), foot: count(s.total.visits) },
    {
      key: "ctr",
      header: <span title="How many people who saw the ad clicked it">Clicked</span>,
      align: "right",
      hideBelow: "lg",
      className: "text-muted-foreground",
      cell: (c) => oneIn(c.ctr),
      foot: oneIn(s.total.ctr),
    },
    { key: "bookings", header: "Bookings", align: "right", cell: (c) => booked(c.bookings, c.bookingValueCents), foot: booked(s.total.bookings, s.total.bookingValueCents) },
  ];

  return (
    <Panel id="campaigns" className="@container">
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
            <DataTable
              label="Bookings by campaign"
              columns={columns}
              rows={s.campaigns}
              rowKey={(c) => c.name}
              rowLabel={(c) => c.name}
              footLabel="All campaigns"
            />
          </>
        )}
      </PanelBody>
    </Panel>
  );
}
