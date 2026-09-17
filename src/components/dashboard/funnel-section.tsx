import type { FunnelDto } from "@/lib/db/queries";
import { glossary } from "@/lib/glossary";
import { count, pct } from "@/lib/format";
import { CollapsibleSection } from "@/components/layout";
import { Meter } from "@/components/charts";
import { FunnelStep, FUNNEL_COLS } from "./funnel-step";

const th = "text-[11px] font-medium uppercase tracking-wide text-muted-foreground";

/** Collapsed by default; opened by insight links (#funnel) and shown in place from 2xl. */
export function FunnelSection({ funnel: f }: { funnel: FunnelDto }) {
  return (
    <CollapsibleSection id="funnel" title="Funnel and website engagement" description="From being seen to being booked." openAtWide>
      <div className="flex flex-col gap-4">
        <div role="table" aria-label="Funnel" className="divide-y divide-border">
          <div role="row" className={`grid gap-3 pb-2 ${FUNNEL_COLS}`}>
            <span role="columnheader" className={th}>Step</span>
            <span role="columnheader" className={`text-right ${th}`}>People</span>
            <span role="columnheader" className={`text-right ${th}`}>Went on</span>
            <span role="columnheader" className={`text-right ${th}`}>Value</span>
          </div>
          {f.steps.map((s) => (
            <FunnelStep key={s.key} step={s} />
          ))}
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <div className="flex gap-1.5">
            <dt>{glossary.new_visitors.label}</dt>
            <dd className="font-semibold tabular-nums text-foreground">{count(f.newVisitors)}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt>{glossary.pages_per_session.label}</dt>
            <dd className="font-semibold tabular-nums text-foreground">{f.pagesPerSession.toFixed(1)}</dd>
          </div>
        </dl>
        <div className="flex flex-col gap-2">
          {f.devices.map((d) => (
            <div key={d.key} className="grid grid-cols-[5rem_minmax(0,1fr)_3rem] items-center gap-3 text-sm">
              <span>{glossary[d.key].label}</span>
              <Meter share={d.share} label={`${glossary[d.key].label} share of visits`} />
              <span className="text-right tabular-nums text-muted-foreground">{pct(d.share)}</span>
            </div>
          ))}
        </div>
      </div>
    </CollapsibleSection>
  );
}
