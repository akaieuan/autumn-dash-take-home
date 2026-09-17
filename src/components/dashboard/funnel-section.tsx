import { ArrowDown } from "lucide-react";
import type { FunnelDto } from "@/lib/db/queries";
import { glossary } from "@/lib/glossary";
import { count, oneIn, perVisit } from "@/lib/format";
import { Panel, PanelHeader, PanelBody } from "@/components/layout";
import { MetricLabel, Eyebrow } from "@/components/copy";
import { ShareBar, ShareLegend, seriesColor } from "@/components/charts";
import { FunnelStep } from "./funnel-step";

const ONWARD = ["clicked", "booked"] as const;

/** From seen to booked, then how visitors browsed. Always visible: it answers "where do people drop off?". */
export function FunnelSection({ funnel: f }: { funnel: FunnelDto }) {
  const devices = f.devices.map((d, i) => ({ label: glossary[d.key].label, share: d.share, color: seriesColor(i) }));
  return (
    <Panel id="funnel">
      <PanelHeader headingId="funnel-h" title="From seen to booked" description="How people moved from your ad to a booking." />
      <PanelBody className="gap-5">
        <ol aria-labelledby="funnel-h" className="flex flex-col">
          {f.steps.map((s, i) => (
            <li key={s.key} className="flex flex-col">
              <FunnelStep step={s} index={i} total={f.steps.length} />
              {s.onwardRatio !== null ? (
                <div className="flex items-center gap-2 py-1.5 pl-3 text-xs text-muted-foreground">
                  <ArrowDown className="size-3.5" aria-hidden="true" />
                  <span>
                    <span className="font-medium tabular-nums text-foreground">{oneIn(s.onwardRatio)}</span> {ONWARD[i] ?? "went on"}
                  </span>
                </div>
              ) : null}
            </li>
          ))}
        </ol>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1 rounded-(--r-in) bg-background p-3">
            <MetricLabel glossaryKey="new_visitors" className="text-[11px]" />
            <span className="text-xl font-semibold tabular-nums">{count(f.newVisitors)}</span>
          </div>
          <div className="flex flex-col gap-1 rounded-(--r-in) bg-background p-3">
            <MetricLabel glossaryKey="pages_per_session" className="text-[11px]" />
            <span className="text-xl font-semibold tabular-nums">{perVisit(f.pagesPerSession)}</span>
          </div>
        </div>

        {devices.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            <Eyebrow>How they browsed</Eyebrow>
            <ShareBar segments={devices} label="Share of clicks by device" />
            <ShareLegend segments={devices} />
          </div>
        ) : null}
      </PanelBody>
    </Panel>
  );
}

