import type { CampaignDto } from "@/lib/db/queries";
import { glossary } from "@/lib/glossary";
import { count, money, oneIn } from "@/lib/format";
import { Meter } from "@/components/charts";
import { LiveDot } from "@/components/copy";

export const CAMPAIGN_COLS =
  "grid-cols-[minmax(0,1fr)_auto] @lg:grid-cols-[minmax(0,1.6fr)_4.5rem_4.5rem_4.5rem_7rem]";

export function CampaignRow({ campaign: c, color }: { campaign: CampaignDto; color: string }) {
  const purpose = c.key ? glossary[c.key].purpose : undefined;
  return (
    <div role="row" aria-label={c.name} className={`grid items-center gap-x-4 gap-y-1 py-3 ${CAMPAIGN_COLS}`}>
      <div role="cell" className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <span className="truncate text-sm font-medium">{c.name}</span>
          {c.live ? <LiveDot /> : null}
        </div>
        {purpose ? <p className="text-xs leading-snug text-muted-foreground">{purpose}</p> : null}
        <Meter share={c.share} label={`${c.name} share of bookings`} color={color} />
      </div>
      <div role="cell" className="hidden text-right text-sm tabular-nums text-muted-foreground @lg:block">{count(c.shown)}</div>
      <div role="cell" className="hidden text-right text-sm tabular-nums text-muted-foreground @lg:block">{count(c.visits)}</div>
      <div role="cell" className="hidden text-right text-sm tabular-nums text-muted-foreground @lg:block">{oneIn(c.ctr)}</div>
      <div role="cell" className="flex flex-col items-end text-right text-sm tabular-nums">
        <span className="font-semibold">{count(c.bookings)}</span>
        <span className="text-xs text-muted-foreground">{money(c.bookingValueCents)}</span>
      </div>
    </div>
  );
}
