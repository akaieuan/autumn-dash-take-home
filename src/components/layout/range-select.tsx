"use client";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RANGE_PRESETS, type RangePreset } from "@/lib/date-range";

const LABEL: Record<RangePreset, string> = {
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  ytd: "Year to date",
  "12m": "Last 12 months",
  all: "All time",
};

/** The range as a dropdown for narrow screens; wide screens show the pill links instead (CSS decides which). */
export function RangeSelect({ current, basePath, metric }: { current: RangePreset; basePath: string; metric?: string }) {
  const router = useRouter();
  return (
    <Select value={current} onValueChange={(p) => router.push(`${basePath}?range=${p}${metric ? `&metric=${metric}` : ""}`)}>
      <SelectTrigger aria-label="Date range" className="h-8 w-36 rounded-full text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="rounded-(--radius-float)">
        {RANGE_PRESETS.map((p) => (
          <SelectItem key={p} value={p} className="text-sm">
            {LABEL[p]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
