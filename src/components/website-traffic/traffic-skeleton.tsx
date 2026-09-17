import { Skeleton } from "@/components/ui/skeleton";
import { Grid, Panel, Stack } from "@/components/layout";

export function TrafficPageSkeleton() {
  return (
    <Stack>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-56 rounded-(--r-in)" />
        <Skeleton className="h-9 w-80 rounded-(--r-in)" />
      </div>
      <Panel><Skeleton className="h-36 w-full rounded-(--r-in)" /></Panel>
      <Grid variant="sidebar">
        <Panel><Skeleton className="h-(--plot-height) w-full rounded-(--r-in)" /></Panel>
        <Panel><Skeleton className="h-40 w-full rounded-(--r-in)" /></Panel>
      </Grid>
      <Grid variant="two">
        <Panel><Skeleton className="h-64 w-full rounded-(--r-in)" /></Panel>
        <Panel><Skeleton className="h-64 w-full rounded-(--r-in)" /></Panel>
      </Grid>
    </Stack>
  );
}
