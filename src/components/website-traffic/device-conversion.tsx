import type { BreakdownRowDto } from "@/lib/db/queries";
import { deviceKey, glossary } from "@/lib/glossary";
import { count, oneIn } from "@/lib/format";
import { Panel, PanelHeader, PanelBody, EmptyState } from "@/components/layout";
import { ShareBar, ShareLegend, DataTable, deviceColor, type DataColumn } from "@/components/charts";

/** The softer word for the device, the way the Overview's funnel says it: "Phone", not "Mobile". */
const deviceLabel = (row: BreakdownRowDto) => {
  const key = deviceKey(row.value);
  return key ? glossary[key].label : row.label;
};

/** What guests visit on, and how often each device goes on to book — the phone/computer gap in one panel. */
export function DeviceConversion({ devices }: { devices: BreakdownRowDto[] }) {
  const segments = devices.map((d) => ({ label: deviceLabel(d), share: d.shareOfClicks, color: deviceColor(d.value) }));

  const columns: DataColumn<BreakdownRowDto>[] = [
    {
      key: "device",
      header: "Device",
      cell: (d) => (
        <span className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: deviceColor(d.value) }} />
          <span className="truncate">{deviceLabel(d)}</span>
        </span>
      ),
    },
    { key: "visits", header: "Visits", align: "right", className: "text-muted-foreground", cell: (d) => count(d.clicks) },
    { key: "bookings", header: "Booked", align: "right", className: "text-muted-foreground", cell: (d) => count(d.bookings) },
    { key: "rate", header: "Rate", align: "right", className: "font-medium", cell: (d) => oneIn(d.conversion) },
  ];

  return (
    <Panel id="devices">
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
          <DataTable
            label="Visits and bookings by device"
            columns={columns}
            rows={devices}
            rowKey={(d) => d.value}
            rowLabel={(d) => deviceLabel(d)}
          />
        </PanelBody>
      )}
    </Panel>
  );
}
