import type { CampaignSeriesDto } from "@/lib/db/queries";
import { addDays, type DateRange } from "@/lib/date-range";
import { bucketLabel, count, shortDate } from "@/lib/format";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface CampaignTrafficProps {
  data: CampaignSeriesDto;
  /** Only the last day and the granularity: a bucket's span needs the range's end, never a fetch. */
  range: Pick<DateRange, "to" | "granularity">;
}

const HEAD = "h-9 text-[11px] font-medium uppercase tracking-wide text-muted-foreground";
const num = "text-right tabular-nums";

/**
 * The last day a bucket covers: the day before the next bucket starts, or the range's own last day.
 * `bucketEnd` lives in the query layer, which a component may not import, so it is derived here.
 */
export const bucketSpan = (buckets: string[], i: number, to: string): string =>
  i + 1 < buckets.length ? addDays(buckets[i + 1], -1) : to;

/** The chart's twin: the same numbers as rows, with the campaign totals pinned in the footer. */
export function CampaignTrafficTable({ data, range }: CampaignTrafficProps) {
  const { buckets, series, granularity } = data;
  const rowTotal = (i: number) => series.reduce((s, c) => s + (c.values[i] ?? 0), 0);
  const grandTotal = series.reduce((s, c) => s + c.total, 0);
  // Past the second campaign the columns are noise on a phone; the Total column never hides.
  const gated = (i: number) => (i >= 2 ? "hidden @lg:table-cell" : undefined);
  return (
    <div className="min-h-(--plot-height) min-w-0 flex-1 basis-0 overflow-auto rounded-(--r-in) border border-border [&>[data-slot=table-container]]:overflow-visible">
      <Table className="text-xs">
        <TableHeader className="sticky top-0 z-10 bg-card shadow-[inset_0_-1px_0_var(--color-border)]">
          <TableRow className="border-0 hover:bg-transparent">
            <TableHead className={HEAD}>Period</TableHead>
            {series.map((s, i) => (
              <TableHead key={s.name} className={cn(HEAD, num, gated(i))}>{s.label}</TableHead>
            ))}
            <TableHead className={cn(HEAD, num)}>Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {buckets.map((b, i) => (
            <TableRow key={b} aria-label={bucketLabel(b, granularity)}>
              <TableCell className="py-2 text-muted-foreground">
                <span className="text-foreground">{bucketLabel(b, granularity)}</span>
                {granularity === "day" ? null : (
                  <span className="block text-[11px]">{shortDate(b)} – {shortDate(bucketSpan(buckets, i, range.to))}</span>
                )}
              </TableCell>
              {series.map((s, si) => (
                <TableCell key={s.name} className={cn("py-2 text-muted-foreground", num, gated(si))}>{count(s.values[i] ?? 0)}</TableCell>
              ))}
              <TableCell className={cn("py-2 font-medium", num)}>{count(rowTotal(i))}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter className="sticky bottom-0 bg-card shadow-[inset_0_1px_0_var(--color-border)]">
          <TableRow className="border-0 hover:bg-transparent" aria-label="All buckets">
            <TableCell className="py-2.5 font-semibold">All campaigns</TableCell>
            {series.map((s, i) => (
              <TableCell key={s.name} className={cn("py-2.5 text-muted-foreground", num, gated(i))}>{count(s.total)}</TableCell>
            ))}
            <TableCell className={cn("py-2.5 font-semibold", num)}>{count(grandTotal)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
