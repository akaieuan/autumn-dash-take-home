import type { DateRange } from "@/lib/date-range";
import { rangeLabel } from "@/lib/format";

/** The screen's opening line. Scaffold copy; the real headline comes out of the artboard pass. */
export function TrafficIntro({ range }: { range: DateRange }) {
  return (
    <section aria-label="Website traffic" className="flex flex-col gap-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {range.label} · {rangeLabel(range.from, range.to)}
      </p>
      <h1 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">How people find your website</h1>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Where visitors come from, what they look at, and how they browse before they book.
      </p>
    </section>
  );
}
