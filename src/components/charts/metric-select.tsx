"use client";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RangePreset } from "@/lib/date-range";
import { METRIC_ORDER, METRIC_LABELS, type ChartMetric } from "./chart-config";

/** Writes ?metric= next to the current ?range=; the page re-renders on the server with the new points. */
export function MetricSelect({ metric, range, basePath }: { metric: ChartMetric; range: RangePreset; basePath: string }) {
  const router = useRouter();
  return (
    <Select value={metric} onValueChange={(m) => router.push(`${basePath}?range=${range}&metric=${m}`)}>
      <SelectTrigger aria-label="Metric" className="h-7 rounded-full text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="rounded-(--radius-float)">
        {METRIC_ORDER.map((m) => (
          <SelectItem key={m} value={m}>
            {METRIC_LABELS[m]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
