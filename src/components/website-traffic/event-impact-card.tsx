import type { EventImpactDto } from "@/lib/db/queries";
import { count, longDate, money, oneIn } from "@/lib/format";
import { DeltaText } from "@/components/copy";

const EYEBROW = "text-[11px] font-medium uppercase tracking-wide text-muted-foreground";
const num = "text-right tabular-nums";

/** Enough days on both sides that the comparison means anything; below this the card says so instead. */
const MIN_DAYS = 7;

/**
 * One change Autumn made, with the same number of days before it and after it side by side — the
 * comparison an owner would make by hand. The window is the query's, so a change made last week
 * compares one week, never a padded month, and says "too soon" rather than showing a half window.
 */
export function EventImpactCard({ impact }: { impact: EventImpactDto }) {
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
    <article id={`event-${event.id}`} className="flex scroll-mt-20 flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <p className={EYEBROW}>
          {event.kindLabel} · {longDate(event.date)} · {event.campaignLabel ?? "Whole program"}
        </p>
        <h3 className="text-base font-semibold leading-snug">{event.title}</h3>
        <p className="text-sm leading-snug text-muted-foreground">{event.note}</p>
      </div>
      {tooSoon ? (
        <p className="rounded-(--r-in) bg-background px-3 py-2 text-xs text-muted-foreground">Too soon to compare</p>
      ) : (
        // The comparison sits in its own inset, header and rows in a steady rhythm, the visits delta as its own line.
        <dl className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-x-5 gap-y-2 rounded-(--r-in) bg-background p-3 text-xs">
          <div className="contents">
            <span className="text-[11px] text-muted-foreground">{days} days each side</span>
            <span className={`${num} ${EYEBROW} whitespace-nowrap`}>Before</span>
            <span className={`${num} ${EYEBROW} whitespace-nowrap`}>After</span>
          </div>
          {rows.map((r) => (
            <div key={r.label} className="contents">
              <dt className="truncate text-sm text-foreground">{r.label}</dt>
              <dd className={`${num} text-sm text-muted-foreground`}>{r.before}</dd>
              <dd className={`${num} text-sm font-semibold text-foreground`}>{r.after}</dd>
            </div>
          ))}
          <div className="contents">
            <dt className="sr-only">Change in visits</dt>
            <dd className="col-span-3 border-t border-border pt-2 text-right">
              <DeltaText current={after.clicks} previous={before.clicks} vsLabel="before" />
            </dd>
          </div>
        </dl>
      )}
    </article>
  );
}
