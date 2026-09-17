import type { DateRange } from "@/lib/date-range";
import { count, rangeLabel } from "@/lib/format";
import { DeltaText } from "@/components/copy";

export interface TrafficTotals { visits: number; newVisitors: number; previousVisits: number | null }

/** The screen's opening line: how many people came, how many were new, in one sentence. The only large type on the page. */
export function TrafficIntro({ range, totals }: { range: DateRange; totals: TrafficTotals }) {
  return (
    <section aria-label="Website traffic" className="flex flex-col gap-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {range.label} · {rangeLabel(range.from, range.to)}
      </p>
      {/* Visits are the ones Autumn's ads sent; new visitors count the whole site, so they are not a share of visits. */}
      <h1 className="max-w-4xl text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
        <span className="tabular-nums">{count(totals.visits)} people</span> came to your website from Autumn&apos;s ads.{" "}
        Your site welcomed <span className="tabular-nums">{count(totals.newVisitors)}</span> first-time visitors in all.
      </h1>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {range.comparison ? <DeltaText current={totals.visits} previous={totals.previousVisits} vsLabel={range.comparison.prevLabel} /> : null}
        <span>When they come, where they live, what they use, and how far they get before they book.</span>
      </p>
    </section>
  );
}
