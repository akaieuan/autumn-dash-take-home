import type { QuickAnalyticsDto } from "@/lib/db/queries";
import { Panel } from "@/components/layout";
import { QuickStat } from "./quick-stat";

/** Four numbers in one panel. Hairlines come from a 1px gap over the border colour, so any column count divides correctly. */
export function QuickAnalytics({ data }: { data: QuickAnalyticsDto }) {
  return (
    <Panel className="@container overflow-hidden p-0">
      <section aria-label="Quick analytics" className="grid grid-cols-2 gap-px bg-border @3xl:grid-cols-4">
        {data.stats.map((s) => (
          <QuickStat key={s.key} stat={s} />
        ))}
      </section>
    </Panel>
  );
}
