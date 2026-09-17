import type { CampaignEfficiencyDto } from "@/lib/db/queries";
import { campaignKey, glossary } from "@/lib/glossary";
import { count, moneyExact, oneIn, times } from "@/lib/format";
import { Panel, PanelHeader, EmptyState } from "@/components/layout";
import { Meter, DataTable, campaignColor, type DataColumn } from "@/components/charts";

type EfficiencyRow = CampaignEfficiencyDto["rows"][number];

const dash = (cents: number | null) => (cents === null ? "—" : moneyExact(cents));

/**
 * Where the next dollar goes: what each campaign costs per visit and per booking, and what a visit
 * gives back. Ranked by value per visit, so the top row is the answer. Per-unit figures are "—" when
 * the divisor is zero — never "$0", which would read as free.
 */
export function CampaignEfficiencyTable({ data }: { data: CampaignEfficiencyDto }) {
  const { rows, total } = data;
  const top = rows[0];
  const bottom = rows[rows.length - 1];
  const summary =
    rows.length >= 2 && top.valuePerVisitCents !== null && bottom.valuePerVisitCents !== null && bottom.valuePerVisitCents > 0
      ? `A ${top.label} visit brings back ${moneyExact(top.valuePerVisitCents)}, ${times(top.valuePerVisitCents / bottom.valuePerVisitCents)} a ${bottom.label} visit.`
      : null;

  const columns: DataColumn<EfficiencyRow>[] = [
    {
      key: "campaign",
      header: "Campaign",
      width: "34%",
      className: "align-top",
      cell: (r) => {
        const key = campaignKey(r.name);
        return (
          <>
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: campaignColor(r.name) }} />
              <span className="font-medium">{r.label}</span>
            </span>
            {key && glossary[key].purpose ? <span className="hidden leading-snug text-muted-foreground @md:block">{glossary[key].purpose}</span> : null}
          </>
        );
      },
      foot: "All campaigns",
    },
    {
      key: "visits",
      header: "Visits",
      align: "right",
      cell: (r) => (
        <>
          <span className="block">{count(r.visits)}</span>
          <span className="hidden @md:block">
            <Meter share={r.shareOfVisits} label={`${r.label} share of visits`} color={campaignColor(r.name)} />
          </span>
        </>
      ),
      foot: count(total.visits),
    },
    // The two cost columns need about 1000px of table; they join only when the panel can hold them.
    { key: "costPerVisit", header: "Cost per visit", align: "right", hideBelow: "3xl", className: "text-muted-foreground", cell: (r) => dash(r.costPerVisitCents), foot: dash(total.costPerVisitCents) },
    { key: "costPerBooking", header: "Cost per booking", align: "right", hideBelow: "3xl", className: "text-muted-foreground", cell: (r) => dash(r.costPerBookingCents), foot: dash(total.costPerBookingCents) },
    { key: "booked", header: "Booked", align: "right", className: "text-muted-foreground", cell: (r) => oneIn(r.conversion), foot: oneIn(total.conversion) },
    { key: "valuePerVisit", header: "Value per visit", align: "right", className: "font-medium", cell: (r) => dash(r.valuePerVisitCents), foot: dash(total.valuePerVisitCents) },
  ];

  return (
    <Panel id="efficiency" className="@container">
      <PanelHeader
        headingId="efficiency-h"
        title="Where the next dollar goes"
        description="What each campaign costs per visit, and what a visit gives back."
      />
      {rows.length === 0 ? (
        <EmptyState title="No campaign spend in this period" />
      ) : (
        <div className="flex flex-col gap-3">
          {summary ? <p className="text-sm">{summary}</p> : null}
          <DataTable
            label="What each campaign costs and gives back"
            columns={columns}
            rows={rows}
            rowKey={(r) => r.name}
            rowLabel={(r) => r.label}
            footLabel="All campaigns"
            /* Spend is Autumn's money, not the hotel's: say so once, over both cost columns. */
            group={{ label: "What Autumn spent", from: "costPerVisit", to: "costPerBooking", hideBelow: "3xl" }}
          />
        </div>
      )}
    </Panel>
  );
}
