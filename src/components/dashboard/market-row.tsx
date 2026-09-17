import type { MarketDto } from "@/lib/db/queries";
import { count, money } from "@/lib/format";
import { Meter } from "@/components/charts";

export const MARKET_COLS =
  "grid-cols-[minmax(0,1fr)_auto] @md:grid-cols-[minmax(0,1.6fr)_4.5rem_4.5rem_6rem]";

export function MarketRow({ market: m, color }: { market: MarketDto; color: string }) {
  return (
    <div role="row" aria-label={m.name} className={`grid items-center gap-x-4 py-2.5 ${MARKET_COLS}`}>
      <div role="cell" className="flex min-w-0 flex-col gap-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <span className="truncate text-sm font-medium">{m.name}</span>
          {m.hint ? <span className="shrink-0 text-xs text-muted-foreground">· {m.hint}</span> : null}
        </div>
        <Meter share={m.share} label={`${m.name} share of bookings`} color={color} />
      </div>
      <div role="cell" className="hidden text-right text-sm tabular-nums text-muted-foreground @md:block">{count(m.visits)}</div>
      <div role="cell" className="hidden text-right text-sm font-semibold tabular-nums @md:block">{count(m.bookings)}</div>
      <div role="cell" className="flex flex-col items-end text-right text-sm tabular-nums">
        <span className="font-semibold @md:font-normal">{money(m.bookingValueCents)}</span>
        <span className="text-xs text-muted-foreground @md:hidden">{count(m.bookings)} bookings</span>
      </div>
    </div>
  );
}
