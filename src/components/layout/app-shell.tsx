import type { RangePreset } from "@/lib/date-range";
import { PageShell } from "./page-shell";
import { TopBar, type Screen } from "./top-bar";

export function AppShell({
  active,
  range,
  dataThrough,
  basePath,
  metric,
  children,
}: {
  active: Screen;
  range: RangePreset | null;
  dataThrough: string | null;
  basePath: string;
  metric?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <TopBar active={active} range={range} dataThrough={dataThrough} basePath={basePath} metric={metric} />
      <PageShell>{children}</PageShell>
    </>
  );
}
