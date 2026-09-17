import Link from "next/link";
import type { RangePreset } from "@/lib/date-range";
import { longDate } from "@/lib/format";
import { DASHBOARD_SCREENS, type Screen } from "@/lib/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { MenuButton } from "./menu-button";
import { RangeSegment } from "./range-segment";
import { RangeSelect } from "./range-select";
import { ThemeToggle } from "./theme-toggle";

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
    <header className="sticky top-0 z-30 px-(--page-gutter) pt-2 sm:px-[calc(var(--page-gutter)+0.5rem)]">
      {/* One line at every width. The tabs can scroll if a screen is narrower than their text; nothing wraps. */}
      <div className="flex h-14 items-center gap-1.5 rounded-(--r-header) border border-border/70 bg-background/75 px-2 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)] backdrop-blur-xl backdrop-saturate-150 lg:gap-4 lg:px-4">
        <MenuButton />
        <nav aria-label="Screens" className="flex shrink-0 gap-1">
          {DASHBOARD_SCREENS.map((s) => (
            <Link
              key={s.key}
              href={range ? `${s.path}?range=${range}` : s.path}
              aria-current={s.key === active ? "page" : undefined}
              className={cn(
                "inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-(--r-in) px-1.5 text-sm font-medium text-muted-foreground hover:text-foreground sm:px-3",
                s.key === active && "bg-muted text-foreground",
              )}
            >
              <span aria-hidden="true" className="sm:hidden">{s.short}</span>
              <span className="hidden sm:inline">{s.label}</span>
            </Link>
          ))}
        </nav>
        <div aria-hidden="true" className="flex-1" />
        <div className="flex shrink-0 items-center gap-2 lg:gap-4">
          {range ? (
            <>
              <div className="hidden xl:block">
                <RangeSegment current={range} basePath={basePath} metric={metric} />
              </div>
              <div className="xl:hidden">
                <RangeSelect current={range} basePath={basePath} metric={metric} />
              </div>
            </>
          ) : (
            <Skeleton className="h-8 w-28 rounded-full xl:w-56" />
          )}
          {dataThrough ? (
            <span className="hidden whitespace-nowrap text-xs tabular-nums text-muted-foreground 2xl:inline">
              Data through {longDate(dataThrough)}
            </span>
          ) : (
            <Skeleton className="hidden h-4 w-36 rounded-(--r-in) 2xl:block" />
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
