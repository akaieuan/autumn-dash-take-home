import type { QuickStatDto } from "@/lib/db/queries";
import { MetricLabel, Value, DeltaText } from "@/components/copy";
import { Sparkline } from "@/components/charts";

/** One cell of the quick-analytics strip: label, value, sparkline, delta. Padding is the panel token so cells align with every other panel. */
export function QuickStat({ stat }: { stat: QuickStatDto }) {
  return (
    <div className="@container flex min-w-0 flex-col gap-1.5 bg-card p-(--panel-pad)">
      <MetricLabel glossaryKey={stat.key} />
      <div className="flex items-center justify-between gap-2">
        <Value kind={stat.kind} value={stat.value} size="lg" />
        {/* The sparkline yields to the number when the cell is narrow. */}
        <span className="hidden @[15rem]:block">
          <Sparkline points={stat.spark} tone={stat.key === "impressions" ? "muted" : "primary"} />
        </span>
      </div>
      <DeltaText current={stat.value} previous={stat.previous} vsLabel="previous" />
    </div>
  );
}
