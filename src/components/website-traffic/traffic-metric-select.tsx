"use client";
import { PillSelect, useViewParam } from "@/components/layout";
import type { RangePreset } from "@/lib/date-range";
import { TRAFFIC_METRICS, TRAFFIC_METRIC_LABELS, type TrafficMetric } from "./traffic-config";

/** Writes ?metric= next to the current ?range=; the server re-renders the series while the page stays put. */
export function TrafficMetricSelect({ metric, range }: { metric: TrafficMetric; range: RangePreset }) {
  const { go, pending } = useViewParam("/website-traffic");
  return (
    <PillSelect
      value={metric}
      onValueChange={(m) => go({ range, metric: m })}
      options={TRAFFIC_METRICS.map((m) => ({ value: m, label: TRAFFIC_METRIC_LABELS[m] }))}
      label="Metric"
      pending={pending}
      className="h-7"
    />
  );
}
