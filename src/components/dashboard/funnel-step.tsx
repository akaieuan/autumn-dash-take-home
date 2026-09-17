import type { FunnelStepDto } from "@/lib/db/queries";
import { glossary } from "@/lib/glossary";
import { count, money } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * One funnel stage. The bar narrows by stage position rather than by the raw count: 326 bookings against
 * 51,798 impressions would be an invisible sliver, and the real ratio is printed between stages instead.
 */
export function FunnelStep({ step: s, index, total, className }: { step: FunnelStepDto; index: number; total: number; className?: string }) {
  const label = glossary[s.key].label;
  const width = 100 - (index * 45) / Math.max(1, total - 1);
  return (
    <div aria-label={label} className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="flex items-baseline gap-2 tabular-nums">
          <span className="text-lg font-semibold">{count(s.people)}</span>
          {s.bookingValueCents !== null ? <span className="text-sm text-muted-foreground">{money(s.bookingValueCents)}</span> : null}
        </span>
      </div>
      <div aria-hidden="true" className="h-2 rounded-full bg-primary" style={{ width: `${width}%`, opacity: 1 - index * 0.25 }} />
    </div>
  );
}
