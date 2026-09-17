import Link from "next/link";
import type { RangePreset } from "@/lib/date-range";
import { longDate } from "@/lib/format";
import { PROPERTY } from "@/lib/property";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { RangeSegment } from "./range-segment";

export type Screen = "overview" | "website-traffic";
const SCREENS: { key: Screen; label: string; path: string }[] = [
  { key: "overview", label: "Overview", path: "/" },
  { key: "website-traffic", label: "Website traffic", path: "/website-traffic" },
];

/**
 * One slim bar: property, the two screens, the range. Fixed min height so loading and loaded
 * states line up. The two halves are siblings under `justify-between`; the right half is not
 * pushed over by an auto left margin, because a child never sets its own outer margin (the
 * rhythm rule, enforced by tests/architecture.test.ts).
 */
export function TopBar({
  active,
  range,
  dataThrough,
  basePath,
  metric,
}: {
  active: Screen;
  range: RangePreset | null;
  dataThrough: string | null;
  basePath: string;
  metric?: string;
}) {
  return (
    <header className="flex min-h-14 flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-border bg-card px-(--page-gutter) py-2">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className="size-6 rounded-(--r-in) bg-primary" />
          <span className="text-sm font-semibold">{PROPERTY.name}</span>
        </div>
        <nav aria-label="Screens" className="flex gap-1">
          {SCREENS.map((s) => (
            <Link
              key={s.key}
              href={range ? `${s.path}?range=${range}` : s.path}
              aria-current={s.key === active ? "page" : undefined}
              className={cn(
                "inline-flex h-8 items-center rounded-(--r-in) px-3 text-sm font-medium text-muted-foreground hover:text-foreground",
                s.key === active && "bg-muted text-foreground",
              )}
            >
              {s.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        {range ? (
          <RangeSegment current={range} basePath={basePath} metric={metric} />
        ) : (
          <Skeleton className="h-8 w-56 rounded-full" />
        )}
        {dataThrough ? (
          <span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">
            Data through {longDate(dataThrough)}
          </span>
        ) : (
          <Skeleton className="hidden h-4 w-36 rounded-(--r-in) sm:block" />
        )}
      </div>
    </header>
  );
}
