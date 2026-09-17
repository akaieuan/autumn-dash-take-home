"use client";
import { PillSelect, useViewParam } from "@/components/layout";
import type { RangePreset } from "@/lib/date-range";
import { METRIC_ORDER, METRIC_LABELS, type ChartMetric } from "./chart-config";

/** Writes ?metric= next to the current ?range=; the server re-renders the points while the page stays put. */
export function MetricSelect({ metric, range, basePath }: { metric: ChartMetric; range: RangePreset; basePath: string }) {
  const { go, pending } = useViewParam(basePath);
  return (
    <PillSelect
      value={metric}
      onValueChange={(m) => go({ range, metric: m })}
      options={METRIC_ORDER.map((m) => ({ value: m, label: METRIC_LABELS[m] }))}
      label="Metric"
      pending={pending}
      className="h-7"
    />
  );
}
