"use client";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useChartStyle, CHART_STYLES, type ChartStyle } from "./use-chart-style";

const LABEL: Record<ChartStyle, string> = { area: "Area", bars: "Bars", line: "Line" };

/** Three ways to read the same series. Pills, so the concentric-corner rule does not apply. */
export function StyleSegment() {
  const [style, setStyle] = useChartStyle();
  return (
    <ToggleGroup
      type="single"
      value={style}
      onValueChange={(v) => {
        if (CHART_STYLES.includes(v as ChartStyle)) setStyle(v as ChartStyle);
      }}
      aria-label="Chart style"
      className="rounded-full border border-border bg-card p-0.5"
    >
      {CHART_STYLES.map((s) => (
        <ToggleGroupItem
          key={s}
          value={s}
          aria-label={LABEL[s]}
          className="h-7 rounded-full px-3 text-xs font-medium text-muted-foreground data-[state=on]:bg-foreground data-[state=on]:text-card"
        >
          {LABEL[s]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
