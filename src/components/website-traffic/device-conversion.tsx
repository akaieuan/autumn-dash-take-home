import type { BreakdownRowDto } from "@/lib/db/queries";
import { deviceKey, glossary } from "@/lib/glossary";
import { count, oneIn } from "@/lib/format";
import { Panel, PanelHeader, PanelBody, EmptyState } from "@/components/layout";
import { ShareBar, ShareLegend, deviceColor } from "@/components/charts";

const COLS = "grid-cols-[minmax(0,1fr)_4rem_4rem_5rem]";
const th = "text-[11px] font-medium uppercase tracking-wide text-muted-foreground";

/** The softer word for the device, the way the Overview's funnel says it: "Phone", not "Mobile". */
const deviceLabel = (row: BreakdownRowDto) => {
  const key = deviceKey(row.value);
  return key ? glossary[key].label : row.label;
};

/** What guests visit on, and how often each device goes on to book — the phone/computer gap in one panel. */
export function DeviceConversion({ devices }: { devices: BreakdownRowDto[] }) {
  const segments = devices.map((d) => ({ label: deviceLabel(d), share: d.shareOfClicks, color: deviceColor(d.value) }));
  return (
    <Panel id="devices" className="scroll-mt-20">
      <PanelHeader
        headingId="devices-h"
        title="What they visit on, and what books"
        description="Share of visits by device, and how often each one books."
      />
      {devices.length === 0 ? (
        <EmptyState title="No visits in this period yet" />
      ) : (
        <PanelBody className="gap-4">
          <div className="flex flex-col gap-2.5">
            <ShareBar segments={segments} label="Share of visits by device" />
            <ShareLegend segments={segments} />
          </div>
          <div role="table" aria-labelledby="devices-h" className="divide-y divide-border">
            <div role="row" className={`grid items-end gap-x-4 pb-2 ${COLS}`}>
              <span role="columnheader" className={th}>Device</span>
              <span role="columnheader" className={`text-right ${th}`}>Visits</span>
              <span role="columnheader" className={`text-right ${th}`}>Booked</span>
              <span role="columnheader" className={`text-right ${th}`}>Rate</span>
            </div>
            {devices.map((d) => (
              <div key={d.value} role="row" aria-label={deviceLabel(d)} className={`grid items-center gap-x-4 py-2.5 ${COLS}`}>
                <span role="cell" className="flex min-w-0 items-center gap-2">
                  <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: deviceColor(d.value) }} />
                  <span className="truncate text-sm">{deviceLabel(d)}</span>
                </span>
                <span role="cell" className="text-right text-sm tabular-nums text-muted-foreground">{count(d.clicks)}</span>
                <span role="cell" className="text-right text-sm tabular-nums text-muted-foreground">{count(d.bookings)}</span>
                <span role="cell" className="text-right text-sm font-medium tabular-nums">{oneIn(d.conversion)}</span>
              </div>
            ))}
          </div>
        </PanelBody>
      )}
    </Panel>
  );
}
