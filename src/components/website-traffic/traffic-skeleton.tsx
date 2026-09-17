import { Skeleton } from "@/components/ui/skeleton";
import { Grid, Panel, Stack } from "@/components/layout";

const PanelSkeleton = ({ h }: { h: string }) => (
  <Panel>
    <div className="flex flex-col gap-2">
      <Skeleton className="h-4 w-48 rounded-(--r-in)" />
      <Skeleton className="h-3 w-72 rounded-(--r-in)" />
    </div>
    <Skeleton className={`${h} w-full rounded-(--r-in)`} />
  </Panel>
);

/** Below the headline, in the page's own shapes, so nothing moves when the data lands. */
export function TrafficBodySkeleton() {
  return (
    <Stack>
      <PanelSkeleton h="h-56" />
      <Grid variant="sidebar">
        <PanelSkeleton h="h-(--plot-height)" />
        <PanelSkeleton h="h-48" />
      </Grid>
      <PanelSkeleton h="h-40" />
      <Grid variant="two">
        <PanelSkeleton h="h-36" />
        <PanelSkeleton h="h-36" />
      </Grid>
    </Stack>
  );
}

export function TrafficPageSkeleton() {
  return (
    <Stack>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-56 rounded-(--r-in)" />
        <Skeleton className="h-9 w-[36rem] max-w-full rounded-(--r-in)" />
        <Skeleton className="h-4 w-80 rounded-(--r-in)" />
      </div>
      <TrafficBodySkeleton />
    </Stack>
  );
}
