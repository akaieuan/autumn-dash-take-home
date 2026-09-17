"use client";
import { useRouter } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RANGE_PRESETS, type RangePreset } from "@/lib/date-range";

const LABEL: Record<RangePreset, { long: string; short: string }> = {
  "30d": { long: "Last 30 days", short: "30d" },
  "90d": { long: "Last 90 days", short: "90d" },
  ytd: { long: "Year to date", short: "YTD" },
  "12m": { long: "Last 12 months", short: "12m" },
  all: { long: "All time", short: "All" },
};

/**
 * The range as a dropdown for narrower screens; the widest screens show the pill links instead (CSS
 * decides which). The trigger shows a short label under `sm` so the header stays one line on a phone.
 */
export function RangeSelect({ current, basePath, metric }: { current: RangePreset; basePath: string; metric?: string }) {
  const router = useRouter();
  return (
    <Select value={current} onValueChange={(p) => router.push(`${basePath}?range=${p}${metric ? `&metric=${metric}` : ""}`)}>
      <SelectTrigger aria-label="Date range" className="h-8 gap-1 rounded-full border-border bg-card pl-2.5 pr-1.5 text-xs font-medium shadow-none hover:bg-muted sm:gap-1.5 sm:pr-2">
        <CalendarRange className="hidden size-3.5 text-muted-foreground sm:block" aria-hidden="true" />
        <SelectValue>
          <span className="sm:hidden">{LABEL[current].short}</span>
          <span className="hidden sm:inline">{LABEL[current].long}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent position="popper" align="end" sideOffset={6} className="min-w-44 rounded-(--radius-float) border border-border/70 bg-popover/95 p-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-12px_rgba(0,0,0,0.18)] ring-0 backdrop-blur-xl">
        {RANGE_PRESETS.map((p) => (
          <SelectItem key={p} value={p} className="rounded-(--r-float-in) py-2 pl-2.5 pr-8 text-sm data-highlighted:bg-muted">
            {LABEL[p].long}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
