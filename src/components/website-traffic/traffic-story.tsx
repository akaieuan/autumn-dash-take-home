"use client";
import { useState } from "react";
import type { DateRange, RangePreset } from "@/lib/date-range";
import type { CampaignSeriesDto, EventImpactDto } from "@/lib/db/queries";
import { Grid, Panel, PanelHeader } from "@/components/layout";
import { CampaignTrafficChart } from "./campaign-traffic-chart";
import { TrafficMetricSelect } from "./traffic-metric-select";
import { WhatAutumnDid } from "./what-autumn-did";
import type { TrafficMetric } from "./traffic-config";

/**
 * The chart and the list of changes share one choice: the change the owner is looking at. Picking it in
 * the list (or on a marker) shades its after-window on the chart, so the card's "after" is a place on the plot.
 */
export function TrafficStory({ data, impacts, range, metric }: { data: CampaignSeriesDto; impacts: EventImpactDto[]; range: Pick<DateRange, "to" | "granularity"> & { preset: RangePreset }; metric: TrafficMetric }) {
  const [selected, setSelected] = useState<number | null>(impacts[0]?.event.id ?? null);
  const picked = impacts.find((i) => i.event.id === selected) ?? null;
  const highlight = picked ? { id: picked.event.id, from: picked.after.from, to: picked.after.to } : null;
  return (
    <Grid variant="sidebar">
      <Panel id="traffic" className="scroll-mt-20 h-full">
        <PanelHeader
          headingId="traffic-h"
          title="Visits by campaign"
          description="Which ads brought people, with each change Autumn made marked on the day it happened."
          action={<TrafficMetricSelect metric={metric} range={range.preset} />}
        />
        <CampaignTrafficChart data={data} range={range} highlight={highlight} onPickEvent={setSelected} />
      </Panel>
      <WhatAutumnDid impacts={impacts} selected={selected} onSelect={setSelected} />
    </Grid>
  );
}
