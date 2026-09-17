import type { FunnelDto } from "@/lib/db/queries";
import { glossary } from "@/lib/glossary";
import { Panel, PanelHeader, EmptyState } from "@/components/layout";
import { ShareBar, ShareLegend, seriesColor } from "@/components/charts";

/** Phone, computer, tablet as one split bar. Reads the device shares the funnel query already returns. */
export function DeviceSplit({ devices }: { devices: FunnelDto["devices"] }) {
  const segments = devices.map((d, i) => ({ label: glossary[d.key].label, share: d.share, color: seriesColor(i) }));
  return (
    <Panel id="devices" className="scroll-mt-20">
      <PanelHeader title="How they browse" description="Share of clicks from each kind of device." />
      {segments.length === 0 ? (
        <EmptyState title="No visits in this period yet" />
      ) : (
        <div className="flex flex-col gap-3">
          <ShareBar segments={segments} label="Share of clicks by device" className="h-4" />
          <ShareLegend segments={segments} className="text-sm" />
        </div>
      )}
    </Panel>
  );
}
