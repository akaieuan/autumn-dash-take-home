import type { FunnelStepDto } from "@/lib/db/queries";
import { glossary } from "@/lib/glossary";
import { count, money, oneIn } from "@/lib/format";

export const FUNNEL_COLS = "grid-cols-[minmax(0,1.4fr)_4.5rem_5rem_5.5rem]";

export function FunnelStep({ step: s }: { step: FunnelStepDto }) {
  const label = glossary[s.key].label;
  return (
    <div role="row" aria-label={label} className={`grid items-center gap-3 py-2.5 ${FUNNEL_COLS}`}>
      <span role="cell" className="text-sm">{label}</span>
      <span role="cell" className="text-right text-sm font-semibold tabular-nums">{count(s.people)}</span>
      <span role="cell" className="text-right text-sm tabular-nums text-muted-foreground">
        {s.onwardRatio === null ? "" : oneIn(s.onwardRatio)}
      </span>
      <span role="cell" className="text-right text-sm tabular-nums">
        {s.bookingValueCents === null ? "—" : money(s.bookingValueCents)}
      </span>
    </div>
  );
}
