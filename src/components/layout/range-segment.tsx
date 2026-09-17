import Link from "next/link";
import { RANGE_PRESETS, type RangePreset } from "@/lib/date-range";
import { cn } from "@/lib/utils";

const SHORT: Record<RangePreset, string> = { "30d": "30d", "90d": "90d", ytd: "YTD", "12m": "12m", all: "All" };

/** The range lives in the URL (D3), so this is plain links: server-rendered, shareable, no client state. */
export function RangeSegment({ current, basePath, metric }: { current: RangePreset; basePath: string; metric?: string }) {
  return (
    <nav aria-label="Date range" className="inline-flex rounded-full border border-border bg-card p-0.5">
      {RANGE_PRESETS.map((p) => (
        <Link
          key={p}
          href={`${basePath}?range=${p}${metric ? `&metric=${metric}` : ""}`}
          aria-current={p === current ? "page" : undefined}
          className={cn(
            "inline-flex h-7 items-center rounded-full px-3 text-xs font-medium text-muted-foreground hover:text-foreground",
            p === current && "bg-foreground text-card hover:text-card",
          )}
        >
          {SHORT[p]}
        </Link>
      ))}
    </nav>
  );
}
