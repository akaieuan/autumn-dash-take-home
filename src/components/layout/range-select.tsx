"use client";
import { CalendarRange } from "lucide-react";
import { RANGE_PRESETS, type RangePreset } from "@/lib/date-range";
import { PillSelect } from "./pill-select";
import { useViewParam } from "./use-view-param";

const LABEL: Record<RangePreset, { long: string; short: string }> = {
  "30d": { long: "Last 30 days", short: "30d" },
  "90d": { long: "Last 90 days", short: "90d" },
  ytd: { long: "Year to date", short: "YTD" },
  "12m": { long: "Last 12 months", short: "12m" },
  all: { long: "All time", short: "All" },
};

/**
 * The range as a dropdown for narrower screens; the widest screens show the pill row instead (CSS
 * decides which). The closed pill shows a short label under `sm` so the header stays one line on a phone.
 */
export function RangeSelect({ current, basePath, metric }: { current: RangePreset; basePath: string; metric?: string }) {
  const { go, pending } = useViewParam(basePath);
  return (
    <PillSelect
      value={current}
      onValueChange={(p) => go({ range: p, metric })}
      options={RANGE_PRESETS.map((p) => ({ value: p, label: LABEL[p].long }))}
      label="Date range"
      pending={pending}
      className="pl-2.5 pr-1.5 sm:pr-2"
    >
      <span className="inline-flex items-center gap-1.5">
        <CalendarRange className="hidden size-3.5 text-muted-foreground sm:block" aria-hidden="true" />
        <span className="sm:hidden">{LABEL[current].short}</span>
        <span className="hidden sm:inline">{LABEL[current].long}</span>
      </span>
    </PillSelect>
  );
}
