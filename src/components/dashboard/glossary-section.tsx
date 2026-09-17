import { glossary, type GlossaryKey } from "@/lib/glossary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
 * Reference, not a result, so it sits below the bento as an open section rather than another card.
 * Groups are a side navigation on wide screens and pills on narrow ones; each term reads like an
 * insight: tag, title, one plain sentence, hairline between.
 */
export function GlossarySection({ groups = GLOSSARY_GROUPS }: { groups?: GlossaryGroup[] }) {
  return (
    <section id="glossary" aria-labelledby="glossary-h" className="scroll-mt-20 border-t border-border pt-8">
      <Tabs defaultValue={groups[0]?.id} className="grid grid-cols-1 gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
        <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
          <div className="flex flex-col gap-1">
            <h2 id="glossary-h" className="text-base font-semibold">What these numbers mean</h2>
            <p className="text-sm text-muted-foreground">Every figure on this page, in plain words.</p>
          </div>
          <TabsList
            aria-label="Glossary groups"
            className="h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0 lg:flex-col lg:items-stretch"
          >
            {groups.map((g) => (
              <TabsTrigger
                key={g.id}
                value={g.id}
                className="h-8 flex-none justify-between gap-3 rounded-full border border-border px-3 text-xs data-[state=active]:border-foreground data-[state=active]:bg-foreground data-[state=active]:text-card lg:rounded-(--r-in) lg:border-transparent lg:text-sm lg:data-[state=active]:border-transparent lg:data-[state=active]:bg-muted lg:data-[state=active]:text-foreground"
              >
                <span>{g.label}</span>
                <span className="tabular-nums opacity-60">{g.keys.length}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {groups.map((g) => (
          <TabsContent key={g.id} value={g.id} className="@container">
            <dl className="grid grid-cols-1 gap-x-12 @2xl:grid-cols-2">
              {g.keys.map((k) => {
                const e = glossary[k];
                return (
                  <div key={k} className="flex flex-col gap-1.5 border-b border-border py-4">
                    {e.industryTerm ? (
                      <span className="inline-flex h-6 w-fit items-center rounded-(--r-in) bg-muted px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {e.industryTerm}
                      </span>
                    ) : null}
                    <dt className="text-sm font-semibold">{e.label}</dt>
                    <dd className="text-sm leading-snug text-muted-foreground">{e.meaning}</dd>
                  </div>
                );
              })}
            </dl>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
