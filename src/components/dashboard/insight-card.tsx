import type { Insight } from "@/lib/insights";
import { InsightTag } from "@/components/copy";

/**
 * Where each insight anchor points, and what the link says. `devices` lives inside the funnel
 * section on this screen, so it sends the owner to #funnel rather than to a section of its own.
 */
const LINK: Record<NonNullable<Insight["anchor"]>, [href: string, label: string]> = {
  trend: ["#trend", "See the trend"],
  campaigns: ["#campaigns", "See your campaigns"],
  markets: ["#markets", "See where your guests come from"],
  devices: ["#funnel", "See the funnel"],
};

export function InsightCard({ insight }: { insight: Insight }) {
  const link = insight.anchor ? LINK[insight.anchor] : null;
  return (
    <article className="flex flex-col gap-1.5 py-4 first:pt-0 last:pb-0">
      <div>
        <InsightTag kind={insight.kind} />
      </div>
      <h3 className="text-sm font-semibold">{insight.title}</h3>
      <p className="text-sm leading-snug text-muted-foreground">{insight.body}</p>
      {link ? (
        <a href={link[0]} className="text-xs font-medium text-primary underline-offset-4 hover:underline">
          {link[1]}
        </a>
      ) : null}
    </article>
  );
}
