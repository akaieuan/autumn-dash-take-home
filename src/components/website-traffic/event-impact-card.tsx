import type { EventImpactDto } from "@/lib/db/queries";
import { count, longDate, money, oneIn } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ANCHOR } from "@/components/layout";
import { DeltaText, Eyebrow, EYEBROW, NUM } from "@/components/copy";


/** Enough days on both sides that the comparison means anything; below this the card says so instead. */
const MIN_DAYS = 7;

/**
 * One change Autumn made, with the same number of days before it and after it side by side — the
 * comparison an owner would make by hand. The window is the query's, so a change made last week
 * compares one week, never a padded month, and says "too soon" rather than showing a half window.
 */
export function EventImpactCard({ impact, className }: { impact: EventImpactDto; className?: string }) {
  const { event, days, before, after } = impact;
  const tooSoon = days < MIN_DAYS;
  const showClicked = before.ctr > 0 && after.ctr > 0;
  const rows: { label: string; before: string; after: string }[] = [
    { label: "Visits", before: count(before.clicks), after: count(after.clicks) },
    ...(showClicked ? [{ label: "Clicked", before: oneIn(before.ctr), after: oneIn(after.ctr) }] : []),
    { label: "Bookings", before: count(before.bookings), after: count(after.bookings) },
    { label: "Value", before: money(before.bookingValueCents), after: money(after.bookingValueCents) },
  ];
  return (
    <article id={`event-${event.id}`} className={cn("flex min-h-(--card-event) flex-col gap-4", ANCHOR, className)}>
      <div className="flex flex-col gap-1.5">
        <Eyebrow as="p">
          {event.kindLabel} · {longDate(event.date)} · {event.campaignLabel ?? "Whole program"}
        </Eyebrow>
        <h3 className="line-clamp-2 text-base font-semibold leading-snug">{event.title}</h3>
        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">{event.note}</p>
      </div>
      {tooSoon ? (
        <p className="flex min-h-(--card-compare) items-center justify-center rounded-(--r-in) bg-background p-3 text-xs text-muted-foreground">Too soon to compare</p>
      ) : (
        // The comparison sits in its own inset, header and rows in a steady rhythm, the visits delta as its own line.
        <div className="grid min-h-(--card-compare) grid-cols-[minmax(0,1fr)_auto_auto] content-start items-baseline gap-x-5 gap-y-2 rounded-(--r-in) bg-background p-3 text-xs">
          <span className="text-[11px] text-muted-foreground">{days} days each side</span>
          <span className={`${NUM} ${EYEBROW} whitespace-nowrap`}>Before</span>
          <span className={`${NUM} ${EYEBROW} whitespace-nowrap`}>After</span>
          {/* The list itself is display: contents, so the grid above places its terms and values; a dl may hold only dt/dd groups. */}
          <dl className="contents">
            {rows.map((r) => (
              <div key={r.label} className="contents">
                <dt className="truncate text-sm text-foreground">{r.label}</dt>
                <dd className={`${NUM} text-sm text-muted-foreground`}>{r.before}</dd>
                <dd className={`${NUM} text-sm font-semibold text-foreground`}>{r.after}</dd>
              </div>
            ))}
            <div className="contents">
              <dt className="sr-only">Change in visits</dt>
              <dd className="col-span-3 border-t border-border pt-2 text-right">
                <DeltaText current={after.clicks} previous={before.clicks} vsLabel="before" />
              </dd>
            </div>
          </dl>
        </div>
      )}
    </article>
  );
}
