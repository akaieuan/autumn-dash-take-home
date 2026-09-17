import type { OverviewDto } from "@/lib/db/queries";
import { comparisonsCoincide, type DateRange } from "@/lib/date-range";
import { money, rangeLabel } from "@/lib/format";
import { DeltaText } from "@/components/copy";

/** The answer, in one sentence (D1). The only large type on the page. */
export function Headline({ overview: o, range }: { overview: OverviewDto; range: DateRange }) {
  const c = range.comparison;
  const oneComparison = comparisonsCoincide(range);
  return (
    <section aria-label="Headline" className="flex flex-col gap-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {range.label} · {rangeLabel(o.current.from, o.current.to)}
      </p>
      <h1 className="max-w-4xl text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
        Autumn brought you <span className="tabular-nums">{o.current.bookings} direct bookings</span> worth{" "}
        <span className="tabular-nums">{money(o.current.bookingValueCents)}</span>. You kept{" "}
        <span className="tabular-nums">{money(o.current.netCents)}</span> after Autumn&apos;s {o.feeRateBps / 100}% fee.
      </h1>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {o.previous && c && !oneComparison ? (
          <DeltaText
            current={o.current.bookingValueCents}
            previous={o.previous.bookingValueCents}
            vsLabel={c.prevLabel}
            className="text-sm"
          />
        ) : null}
        {o.lastYear && c ? (
          <DeltaText
            current={o.current.bookingValueCents}
            previous={o.lastYear.bookingValueCents}
            vsLabel={c.lastYearLabel}
            className="text-sm"
          />
        ) : null}
        <span>
          Autumn&apos;s fee this period: <span className="tabular-nums">{money(o.current.feeCents)}</span>
        </span>
      </p>
    </section>
  );
}
