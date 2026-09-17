import { AppShell } from "@/components/layout";
import { OverviewPageSkeleton } from "@/components/dashboard";

export default function Loading() {
  return (
    <AppShell active="overview" range={null} dataThrough={null} basePath="/">
      <OverviewPageSkeleton />
    </AppShell>
  );
}
