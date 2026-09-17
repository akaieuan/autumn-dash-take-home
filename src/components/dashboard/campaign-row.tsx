import type { CampaignDto } from "@/lib/db/queries";
import { glossary } from "@/lib/glossary";
import { count, money, oneIn } from "@/lib/format";
import { Meter } from "@/components/charts";
import { LiveDot } from "@/components/copy";

export const CAMPAIGN_COLS =
  "grid-cols-[minmax(0,1.7fr)_6.5rem] @lg:grid-cols-[minmax(0,1.7fr)_4rem_4rem_4.5rem_6.5rem]";

export function CampaignRow({ campaign: c }: { campaign: CampaignDto }) {
  const purpose = c.key ? glossary[c.key].purpose : undefined;
  return (
    <div role="row" aria-label={c.name} className={`grid items-center gap-3 py-3 ${CAMPAIGN_COLS}`}>
      <div role="cell" className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{c.name}</span>
          {c.live ? <LiveDot /> : null}
        </div>
        {purpose ? <p className="text-xs text-muted-foreground">{purpose}</p> : null}
        <Meter share={c.share} label={`${c.name} share of bookings`} />
      </div>
      <div role="cell" className="hidden text-right text-sm tabular-nums text-muted-foreground @lg:block">{count(c.shown)}</div>
      <div role="cell" className="hidden text-right text-sm tabular-nums text-muted-foreground @lg:block">{count(c.visits)}</div>
      <div role="cell" className="hidden text-right text-sm tabular-nums text-muted-foreground @lg:block">{oneIn(c.ctr)}</div>
      <div role="cell" className="text-right text-sm tabular-nums">
        <span className="font-semibold">{count(c.bookings)}</span>{" "}
        <span className="text-muted-foreground">· {money(c.bookingValueCents)}</span>
      </div>
    </div>
  );
}
