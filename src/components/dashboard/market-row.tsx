import type { MarketDto } from "@/lib/db/queries";
import { count, money } from "@/lib/format";
import { Meter } from "@/components/charts";

export const MARKET_COLS =
  "grid-cols-[minmax(0,1.6fr)_4.5rem_5.25rem] @md:grid-cols-[minmax(0,1.6fr)_4.5rem_4.5rem_5.25rem]";

export function MarketRow({ market: m }: { market: MarketDto }) {
  return (
    <div role="row" aria-label={m.name} className={`grid items-center gap-3 py-2.5 ${MARKET_COLS}`}>
      <div role="cell" className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-medium">{m.name}</span>
          {m.hint ? <span className="shrink-0 text-xs text-muted-foreground">{m.hint}</span> : null}
        </div>
        <Meter share={m.share} label={`${m.name} share of bookings`} />
      </div>
      <div role="cell" className="hidden text-right text-sm tabular-nums text-muted-foreground @md:block">
        {count(m.visits)}
      </div>
      <div role="cell" className="text-right text-sm font-semibold tabular-nums">{count(m.bookings)}</div>
      <div role="cell" className="text-right text-sm tabular-nums">{money(m.bookingValueCents)}</div>
    </div>
  );
}
