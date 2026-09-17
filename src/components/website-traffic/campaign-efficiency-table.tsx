import type { CampaignEfficiencyDto } from "@/lib/db/queries";
import { campaignKey, glossary } from "@/lib/glossary";
import { count, moneyExact, oneIn } from "@/lib/format";
import { Panel, PanelHeader, EmptyState } from "@/components/layout";
import { Meter, campaignColor } from "@/components/charts";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const HEAD = "h-auto py-2 text-[11px] font-medium uppercase leading-tight tracking-wide whitespace-normal text-muted-foreground";
const num = "text-right tabular-nums";
/** Autumn's money: both cost columns travel together, under one header, and hide together on a phone. */
// The two cost columns need about 1000px of table; they join only when the panel can hold them.
const COST = "hidden @3xl:table-cell";

const dash = (cents: number | null) => (cents === null ? "—" : moneyExact(cents));
/** "4.2×", but "4×" when the decimal says nothing. */
const times = (ratio: number) => `${ratio.toFixed(1).replace(/\.0$/, "")}×`;

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
      ? `Every dollar on ${top.label} brought back ${moneyExact(top.valuePerVisitCents)} per visit, ${times(top.valuePerVisitCents / bottom.valuePerVisitCents)} ${bottom.label}.`
      : null;
  return (
    <Panel id="efficiency" className="@container scroll-mt-20">
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
          <div className="min-w-0 overflow-auto rounded-(--r-in) border border-border [&>[data-slot=table-container]]:overflow-visible">
            <Table className="table-fixed text-xs">
              <TableHeader>
                {/* The group header only exists while the two cost columns are on screen. */}
                <TableRow className="hidden border-0 hover:bg-transparent @3xl:table-row">
                  <TableHead colSpan={2} />
                  {/* Spend is Autumn's money, not the hotel's: say so once, over both cost columns. */}
                  <TableHead colSpan={2} className={cn(HEAD, "text-center", COST)}>What Autumn spent</TableHead>
                  <TableHead colSpan={2} />
                </TableRow>
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead className={cn(HEAD, "w-[38%] @md:w-[34%]")}>Campaign</TableHead>
                  <TableHead className={cn(HEAD, num)}>Visits</TableHead>
                  <TableHead className={cn(HEAD, num, COST)}>Cost per visit</TableHead>
                  <TableHead className={cn(HEAD, num, COST)}>Cost per booking</TableHead>
                  <TableHead className={cn(HEAD, num)}>Booked</TableHead>
                  <TableHead className={cn(HEAD, num)}>Value per visit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const key = campaignKey(r.name);
                  const color = campaignColor(r.name);
                  return (
                    <TableRow key={r.name} aria-label={r.label}>
                      <TableCell className="py-2.5 whitespace-normal align-top">
                        <span className="flex items-center gap-2">
                          <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                          <span className="font-medium">{r.label}</span>
                        </span>
                        {key && glossary[key].purpose ? (
                          <span className="hidden text-xs leading-snug text-muted-foreground @md:block">{glossary[key].purpose}</span>
                        ) : null}
                      </TableCell>
                      <TableCell className={cn("py-2.5", num)}>
                        <span className="block">{count(r.visits)}</span>
                        <span className="hidden @md:block">
                          <Meter share={r.shareOfVisits} label={`${r.label} share of visits`} color={color} />
                        </span>
                      </TableCell>
                      <TableCell className={cn("py-2.5 text-muted-foreground", num, COST)}>{dash(r.costPerVisitCents)}</TableCell>
                      <TableCell className={cn("py-2.5 text-muted-foreground", num, COST)}>{dash(r.costPerBookingCents)}</TableCell>
                      <TableCell className={cn("py-2.5 text-muted-foreground", num)}>{oneIn(r.conversion)}</TableCell>
                      <TableCell className={cn("py-2.5 font-medium", num)}>{dash(r.valuePerVisitCents)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow className="border-0 hover:bg-transparent" aria-label="All campaigns">
                  <TableCell className="py-2.5 font-semibold">All campaigns</TableCell>
                  <TableCell className={cn("py-2.5 font-semibold", num)}>{count(total.visits)}</TableCell>
                  <TableCell className={cn("py-2.5 text-muted-foreground", num, COST)}>{dash(total.costPerVisitCents)}</TableCell>
                  <TableCell className={cn("py-2.5 text-muted-foreground", num, COST)}>{dash(total.costPerBookingCents)}</TableCell>
                  <TableCell className={cn("py-2.5 text-muted-foreground", num)}>{oneIn(total.conversion)}</TableCell>
                  <TableCell className={cn("py-2.5 font-semibold", num)}>{dash(total.valuePerVisitCents)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </div>
      )}
    </Panel>
  );
}
