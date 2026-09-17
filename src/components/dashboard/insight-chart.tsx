import type { InsightChart as InsightChartData } from "@/lib/insights";
import { money, count, pct } from "@/lib/format";
import { ShareBar, ShareLegend, seriesColor } from "@/components/charts";

const TONE = { current: "var(--chart-1)", previous: "var(--chart-2)", lastYear: "var(--chart-3)" } as const;
const FORMAT = { money, count, pct: (v: number) => pct(v, 1) } as const;

/**
 * The small graph under an insight: horizontal bars scaled to the payload's own largest value, in
 * the trend chart's colours (green is now, amber is before, grey is last year), or a share bar when
 * the insight is about a split. Text stays in text colours; only the bar carries the hue.
 */
export function InsightChart({ chart }: { chart: InsightChartData }) {
  if (chart.kind === "share") {
    const segments = chart.segments.map((s, i) => ({ ...s, color: seriesColor(i) }));
    return (
      <div className="flex flex-col gap-2 pt-1">
        <ShareBar segments={segments} label="Share by device" className="h-2" />
        <ShareLegend segments={segments} />
      </div>
    );
  }
  const fmt = FORMAT[chart.format];
  const max = Math.max(...chart.bars.map((b) => b.value), Number.EPSILON);
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 pt-1 text-xs">
      {chart.bars.map((b) => (
        <div key={b.label} className="contents">
          <dt className="truncate text-muted-foreground">{b.label}</dt>
          <dd aria-hidden="true" className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <span className="block h-full rounded-full" style={{ width: `${Math.max(2, Math.round((b.value / max) * 100))}%`, backgroundColor: TONE[b.tone] }} />
          </dd>
          <dd className="text-right font-medium tabular-nums">{fmt(b.value)}</dd>
        </div>
      ))}
    </dl>
  );
}
