"use client";
import { RANGE_PRESETS, type RangePreset } from "@/lib/date-range";
import { cn } from "@/lib/utils";
import { useViewParam } from "./use-view-param";

const SHORT: Record<RangePreset, string> = { "30d": "30d", "90d": "90d", ytd: "YTD", "12m": "12m", all: "All" };

/** The range lives in the URL (D3). Buttons push it without scrolling, so the owner keeps their place on the page. */
export function RangeSegment({ current, basePath, metric }: { current: RangePreset; basePath: string; metric?: string }) {
  const { go, pending } = useViewParam(basePath);
  return (
    <div
      role="group"
      aria-label="Date range"
      aria-busy={pending || undefined}
      data-pending={pending || undefined}
      className="inline-flex rounded-full border border-border bg-card p-0.5 transition-opacity data-pending:opacity-60"
    >
      {RANGE_PRESETS.map((p) => (
        <button
          key={p}
          type="button"
          aria-pressed={p === current}
          onClick={() => { if (p !== current) go({ range: p, metric }); }}
          className={cn(
            "inline-flex h-7 items-center rounded-full px-3 text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
            p === current && "bg-foreground text-card hover:text-card",
          )}
        >
          {SHORT[p]}
        </button>
      ))}
    </div>
  );
}
