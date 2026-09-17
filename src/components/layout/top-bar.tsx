import Link from "next/link";
import type { RangePreset } from "@/lib/date-range";
import { longDate } from "@/lib/format";
import { DASHBOARD_SCREENS, type Screen } from "@/lib/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { RangeSegment } from "./range-segment";
import { RangeSelect } from "./range-select";
import { ThemeToggle } from "./theme-toggle";
import { SidebarTrigger } from "./sidebar-trigger";

export type { Screen };

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
    <header className="sticky top-0 z-30 px-[calc(var(--page-gutter)+0.5rem)] pt-2">
      <div className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 rounded-(--r-header) border border-border/70 bg-background/75 px-2 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)] backdrop-blur-xl backdrop-saturate-150 md:flex md:gap-4 md:px-4">
      {/* Phone: brand | theme on the first row, screens | range on the second. From md: one row. Order is CSS only. */}
      <div className="flex min-w-0 items-center gap-2 md:order-1">
        <SidebarTrigger />
        <span aria-hidden="true" className="hidden h-5 w-px bg-border md:block" />
        <span className="truncate text-sm font-semibold md:sr-only">Dashboard</span>
      </div>
      <div className="justify-self-end md:order-5">
        <ThemeToggle />
      </div>
      <nav aria-label="Screens" className="flex min-w-0 gap-1 md:order-2">
        {DASHBOARD_SCREENS.map((s) => (
          <Link
            key={s.key}
            href={range ? `${s.path}?range=${range}` : s.path}
            aria-current={s.key === active ? "page" : undefined}
            className={cn(
              "inline-flex h-8 items-center whitespace-nowrap rounded-(--r-in) px-2.5 text-sm font-medium text-muted-foreground hover:text-foreground sm:px-3",
              s.key === active && "bg-muted text-foreground",
            )}
          >
            {s.label}
          </Link>
        ))}
      </nav>
      <div aria-hidden="true" className="hidden md:order-3 md:block md:flex-1" />
      <div className="flex items-center justify-self-end gap-4 md:order-4">
        {range ? (
          <>
            <div className="hidden lg:block">
              <RangeSegment current={range} basePath={basePath} metric={metric} />
            </div>
            <div className="lg:hidden">
              <RangeSelect current={range} basePath={basePath} metric={metric} />
            </div>
          </>
        ) : (
          <Skeleton className="h-8 w-36 rounded-full lg:w-56" />
        )}
        {dataThrough ? (
          <span className="hidden whitespace-nowrap text-xs tabular-nums text-muted-foreground xl:inline">
            Data through {longDate(dataThrough)}
          </span>
        ) : (
          <Skeleton className="hidden h-4 w-36 rounded-(--r-in) xl:block" />
        )}
      </div>
      </div>
    </header>
  );
}
