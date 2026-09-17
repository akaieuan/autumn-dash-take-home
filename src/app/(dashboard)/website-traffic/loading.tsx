import { AppShell } from "@/components/layout";
import { TrafficPageSkeleton } from "@/components/website-traffic";

export default function Loading() {
  return (
    <AppShell active="website-traffic" range={null} dataThrough={null} basePath="/website-traffic">
      <TrafficPageSkeleton />
    </AppShell>
  );
}
