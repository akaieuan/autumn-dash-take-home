import type { Insight } from "@/lib/insights";
import { InsightTag } from "@/components/copy";
import { InsightChart } from "./insight-chart";
import { cn } from "@/lib/utils";

/** Tag, title, one plain sentence, and the insight's own small graph. Nothing to click: the graph is the evidence. */
export function InsightCard({ insight, className }: { insight: Insight; className?: string }) {
  return (
    <article className={cn("flex flex-col gap-1.5 py-4 first:pt-0 last:pb-0", className)}>
      <div>
        <InsightTag kind={insight.kind} />
      </div>
      <h3 className="text-sm font-semibold">{insight.title}</h3>
      <p className="text-sm leading-snug text-muted-foreground">{insight.body}</p>
      {insight.chart ? <InsightChart chart={insight.chart} /> : null}
    </article>
  );
}
