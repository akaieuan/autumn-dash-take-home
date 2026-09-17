import { glossary, type GlossaryKey } from "@/lib/glossary";
import { Panel, PanelHeader, PanelBody } from "@/components/layout";
import { Eyebrow } from "@/components/copy";

export interface GlossaryGroup {
  id: string;
  label: string;
  keys: GlossaryKey[];
}

export const GLOSSARY_GROUPS: GlossaryGroup[] = [
  { id: "money", label: "Bookings and money", keys: ["direct_bookings", "booking_value", "autumn_fee", "net_revenue"] },
  { id: "ads", label: "Your ads", keys: ["impressions", "clicks", "ctr", "conversion"] },
  { id: "site", label: "Your website", keys: ["website_visits", "new_visitors", "pages_per_session"] },
];

/**
 * A panel in the bento beside the funnel: the reference next to the result it explains. Every term is
 * on the page at once, one column per group on wide panels, so there is nothing to click and no
 * empty band under a short group. Each term reads like an insight: tag, title, one plain sentence.
 */
export function GlossaryPanel({ groups = GLOSSARY_GROUPS }: { groups?: GlossaryGroup[] }) {
  return (
    <Panel id="glossary" className="@container">
      <PanelHeader headingId="glossary-h" title="What these numbers mean" description="Every figure on this page, in plain words." />
      <PanelBody className="grid flex-1 grid-cols-1 gap-x-6 gap-y-5 @md:grid-cols-2 @2xl:grid-cols-3">
        {groups.map((g) => (
          <section key={g.id} aria-labelledby={`glossary-${g.id}`} className="flex flex-col gap-1">
            <Eyebrow as="h3" id={`glossary-${g.id}`}>
              {g.label}
            </Eyebrow>
            <dl className="flex flex-1 flex-col divide-y divide-border">
              {g.keys.map((k) => {
                const e = glossary[k];
                return (
                  <div key={k} className="flex flex-1 flex-col gap-1 py-3 first:pt-2 last:pb-0">
                    <dt className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm font-semibold">
                      {e.label}
                      {e.industryTerm ? <Eyebrow>{e.industryTerm}</Eyebrow> : null}
                    </dt>
                    <dd className="text-sm leading-snug text-muted-foreground">{e.meaning}</dd>
                  </div>
                );
              })}
            </dl>
          </section>
        ))}
      </PanelBody>
    </Panel>
  );
}
