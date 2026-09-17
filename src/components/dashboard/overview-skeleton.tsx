import { Skeleton } from "@/components/ui/skeleton";
import { Panel, Grid, Stack } from "@/components/layout";

/** Same boxes as the real organisms, so the page does not move when data arrives. */
function PanelSkeleton({ rows, plot = false }: { rows: number; plot?: boolean }) {
  return (
    <Panel>
      <Skeleton className="h-5 w-48 rounded-(--r-in)" />
      <Skeleton className="h-4 w-72 rounded-(--r-in)" />
      {plot ? <Skeleton className="h-(--plot-height) w-full rounded-(--r-in)" /> : null}
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-(--r-in)" />
      ))}
    </Panel>
  );
}

export function OverviewBodySkeleton() {
  return (
    <Stack>
      <Grid variant="sidebar">
        <PanelSkeleton rows={1} plot />
        <PanelSkeleton rows={3} />
      </Grid>
      <Grid variant="two">
        <PanelSkeleton rows={6} />
        <PanelSkeleton rows={3} />
      </Grid>
      <Grid variant="detail">
        <PanelSkeleton rows={3} />
        <PanelSkeleton rows={4} />
      </Grid>
    </Stack>
  );
}

export function OverviewPageSkeleton() {
  return (
    <Stack>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-56 rounded-(--r-in)" />
        <Skeleton className="h-9 w-full max-w-3xl rounded-(--r-in)" />
        <Skeleton className="h-4 w-80 rounded-(--r-in)" />
      </div>
      <Panel className="@container overflow-hidden p-0">
        <div className="grid grid-cols-2 gap-px bg-border @3xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex h-28 flex-col gap-2 bg-card p-(--panel-pad)">
              <Skeleton className="h-3 w-24 rounded-(--r-in)" />
              <Skeleton className="h-8 w-20 rounded-(--r-in)" />
            </div>
          ))}
        </div>
      </Panel>
      <OverviewBodySkeleton />
    </Stack>
  );
}
