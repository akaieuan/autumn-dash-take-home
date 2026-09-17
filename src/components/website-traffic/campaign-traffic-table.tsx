import type { CampaignSeriesDto } from "@/lib/db/queries";
import type { DateRange } from "@/lib/date-range";
import { bucketLabel, count, shortDate } from "@/lib/format";
import { DataTable, type DataColumn } from "@/components/charts";
import { bucketSpan } from "./campaign-traffic-data";

export interface CampaignTrafficProps {
  data: CampaignSeriesDto;
  /** Only the last day and the granularity: a bucket's span needs the range's end, never a fetch. */
  range: Pick<DateRange, "to" | "granularity">;
}

/** One row per bucket; the index is what reads a campaign's value for that bucket. */
interface BucketRow {
  bucket: string;
  i: number;
}

/** The chart's twin: the same numbers as rows, with the campaign totals pinned in the footer. */
export function CampaignTrafficTable({ data, range }: CampaignTrafficProps) {
  const { buckets, series, granularity } = data;
  const rowTotal = (i: number) => series.reduce((s, c) => s + (c.values[i] ?? 0), 0);
  const grandTotal = series.reduce((s, c) => s + c.total, 0);
  const rows: BucketRow[] = buckets.map((bucket, i) => ({ bucket, i }));

  const columns: DataColumn<BucketRow>[] = [
    {
      key: "period",
      header: "Period",
      className: "text-muted-foreground",
      cell: ({ bucket, i }) => (
        <>
          <span className="text-foreground">{bucketLabel(bucket, granularity)}</span>
          {granularity === "day" ? null : (
            <span className="block text-[11px]">{shortDate(bucket)} – {shortDate(bucketSpan(buckets, i, range.to))}</span>
          )}
        </>
      ),
      foot: <span className="text-foreground">All campaigns</span>,
    },
    // Past the second campaign the columns are noise on a phone; the Total column never hides.
    ...series.map<DataColumn<BucketRow>>((s, si) => ({
      key: s.name,
      header: s.label,
      align: "right",
      className: "text-muted-foreground",
      hideBelow: si >= 2 ? "lg" : undefined,
      cell: ({ i }) => count(s.values[i] ?? 0),
      foot: count(s.total),
    })),
    { key: "total", header: "Total", align: "right", className: "font-medium", cell: ({ i }) => count(rowTotal(i)), foot: count(grandTotal) },
  ];

  return (
    <DataTable
      label="Visits by campaign, one row per period"
      columns={columns}
      rows={rows}
      rowKey={(r) => r.bucket}
      rowLabel={(r) => bucketLabel(r.bucket, granularity)}
      footLabel="All buckets"
      fill
    />
  );
}
