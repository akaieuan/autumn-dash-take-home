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
      {/*
        One word for one thing (design audit 2026-09-17, item 10). The first clause is the glossary's own
        phrase for `website_visits` — "Visited your site" — so the headline, the quick stat and the "What
        these numbers mean" panel all call an ad-driven visit the same thing. The second clause is
        `new_visitors.meaning` in its own words: those count the whole site, from any source, so they are
        never a share of the first number.
      */}
      <h1 className="max-w-4xl text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
        <span className="tabular-nums">{count(totals.visits)} people</span> visited your site from Autumn&apos;s ads.{" "}
        <span className="tabular-nums">{count(totals.newVisitors)}</span> first-time visitors came from any source, not only ads.
      </h1>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {range.comparison ? <DeltaText current={totals.visits} previous={totals.previousVisits} vsLabel={range.comparison.prevLabel} /> : null}
        <span>When they come, where they live, what they use, and how far they get before they book.</span>
      </p>
    </section>
  );
}
