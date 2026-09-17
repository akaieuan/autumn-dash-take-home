// @vitest-environment jsdom
// tests/components/traffic-campaigns.test.tsx
//
// The campaign side of the Website Traffic screen. Fixtures are hand-written from the handoff's §4
// values (docs/superpowers/plans/2026-09-17-website-traffic-handoff.md), so a component that stops
// reading its DTO — or a query that changes shape — turns this file red rather than the page.
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { campaignColor, deviceColor } from "@/components/charts";
import { CampaignSummary } from "@/components/dashboard";
import { CampaignTrafficChart } from "@/components/website-traffic/campaign-traffic-chart";
import { EventImpactCard } from "@/components/website-traffic/event-impact-card";
import { WhatAutumnDid } from "@/components/website-traffic/what-autumn-did";
import { CampaignEfficiencyTable } from "@/components/website-traffic/campaign-efficiency-table";
import { chartRows, marksByBucket, highlightSpan } from "@/components/website-traffic/campaign-traffic-data";
import { DeviceConversion } from "@/components/website-traffic/device-conversion";
import { TRAFFIC_METRICS, TRAFFIC_METRIC_LABELS, isTrafficMetric } from "@/components/website-traffic/traffic-config";
import type { BreakdownRowDto, CampaignEfficiencyDto, CampaignSeriesDto, CampaignSeriesMetric, CampaignSummaryDto, EventImpactDto } from "@/lib/db/queries";
import type { TrafficMetric } from "@/components/website-traffic/traffic-config";
import { glossary } from "@/lib/glossary";

type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

const wrap = (ui: React.ReactNode) => render(<TooltipProvider>{ui}</TooltipProvider>);

const buckets = ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05", "2026-09-06", "2026-09-07", "2026-09-08", "2026-09-09", "2026-09-10"];
const brandValues = [0, 60, 0, 0, 150, 0, 0, 0, 0, 50];
const discoveryValues = [0, 40, 0, 0, 150, 0, 0, 0, 0, 150];

const series: CampaignSeriesDto = {
  metric: "clicks",
  granularity: "day",
  buckets,
  series: [
    { name: "Brand Protection", label: "Brand protection", values: brandValues, total: 260 },
    { name: "Discovery & Competitors", label: "Discovery", values: discoveryValues, total: 340 },
  ],
  events: [
    {
      id: 1, date: "2026-09-05", campaign: "Brand Protection", campaignLabel: "Brand protection",
      kind: "copy_refresh", kindLabel: "Ads refreshed", title: "New headlines for the harbour season",
      note: "Swapped in headlines about the harbour and the ferry.", bucket: "2026-09-05",
    },
  ],
};
const range = { to: "2026-09-10", granularity: "day" } as const;

const impact: EventImpactDto = {
  event: {
    id: 1, date: "2026-09-05", campaign: "Brand Protection", campaignLabel: "Brand protection",
    kind: "copy_refresh", kindLabel: "Ads refreshed", title: "New headlines for the harbour season",
    note: "Swapped in headlines about the harbour and the ferry.",
  },
  days: 28,
  before: { from: "2026-08-08", to: "2026-09-04", impressions: 3000, clicks: 300, bookings: 9, bookingValueCents: 400000, spendCents: 21000, ctr: 0.1, conversion: 0.03 },
  after: { from: "2026-09-05", to: "2026-10-02", impressions: 3000, clicks: 375, bookings: 14, bookingValueCents: 650000, spendCents: 24000, ctr: 0.125, conversion: 14 / 375 },
};

const efficiency: CampaignEfficiencyDto = {
  rows: [
    {
      name: "Brand Protection", label: "Brand protection", visits: 260, shareOfVisits: 260 / 600, spendCents: 1700, costPerVisitCents: 7,
      bookings: 2, conversion: 2 / 260, costPerBookingCents: 850, bookingValueCents: 95050, valuePerVisitCents: 366, previous: null,
    },
    {
      name: "Discovery & Competitors", label: "Discovery", visits: 340, shareOfVisits: 340 / 600, spendCents: 2800, costPerVisitCents: 8,
      bookings: 1, conversion: 1 / 340, costPerBookingCents: 2800, bookingValueCents: 30000, valuePerVisitCents: 88, previous: null,
    },
  ],
  total: { visits: 600, spendCents: 4500, costPerVisitCents: 8, bookings: 3, conversion: 3 / 600, costPerBookingCents: 1500, bookingValueCents: 125050, valuePerVisitCents: 208 },
};

const devices: BreakdownRowDto[] = [
  { value: "Mobile", label: "Mobile", impressions: 4000, clicks: 240, bookings: 10, bookingValueCents: 440000, feeCents: 66000, spendCents: 2000, ctr: 0.06, conversion: 10 / 240, shareOfBookings: 0.6, shareOfClicks: 0.6, previous: null },
  { value: "Desktop", label: "Desktop", impressions: 2000, clicks: 120, bookings: 5, bookingValueCents: 260000, feeCents: 39000, spendCents: 1000, ctr: 0.06, conversion: 5 / 120, shareOfBookings: 0.3, shareOfClicks: 0.3, previous: null },
  { value: "Tablet", label: "Tablet", impressions: 700, clicks: 40, bookings: 1, bookingValueCents: 45000, feeCents: 6750, spendCents: 400, ctr: 0.057, conversion: 1 / 40, shareOfBookings: 0.1, shareOfClicks: 0.1, previous: null },
];

describe("identity colours", () => {
  it("colour follows the campaign, not its rank", () => {
    expect(campaignColor("Brand Protection")).toBe("var(--series-1)");
    expect(campaignColor("Discovery & Competitors")).toBe("var(--series-2)");
    expect(campaignColor("Google Hotel Ads")).toBe("var(--series-3)");
    expect(campaignColor("Retargeting")).toBe("var(--series-4)");
    expect(campaignColor("A campaign the glossary has never heard of")).toBe("var(--series-other)");
    expect(deviceColor("Mobile")).toBe("var(--series-1)");
    expect(deviceColor("Tablet")).toBe("var(--series-3)");
    expect(deviceColor("Smart fridge")).toBe("var(--series-other)");
  });

  it("CampaignSummary paints Discovery the same colour it wears on the traffic screen", () => {
    const summary: CampaignSummaryDto = {
      campaigns: [
        // Discovery ranks first here; on the traffic screen it does not. The swatch must not move with it.
        { key: "discovery", name: "Discovery", live: true, shown: 4100, visits: 340, ctr: 0.08, bookings: 14, bookingValueCents: 623000, spendCents: 2800, share: 14 / 41 },
        { key: "brand_protection", name: "Brand protection", live: false, shown: 2300, visits: 260, ctr: 0.3, bookings: 27, bookingValueCents: 1201000, spendCents: 1700, share: 27 / 41 },
      ],
      total: { shown: 6400, visits: 600, ctr: 600 / 6400, bookings: 41, bookingValueCents: 1824000 },
    };
    const { container } = wrap(<CampaignSummary summary={summary} />);
    const row = screen.getByRole("row", { name: "Discovery" });
    const swatch = row.querySelector("span[style]") as HTMLElement;
    expect(swatch.style.backgroundColor).toBe("var(--series-2)");
    expect(container.querySelector('[style*="var(--series-2)"]')).not.toBeNull();
  });
});

describe("traffic-config", () => {
  // The chart is a client component, so it may not value-import @/lib/db (tests/architecture.test.ts).
  // This is the drift alarm for its own copy of the metric list.
  it("TrafficMetric is exactly the query layer's CampaignSeriesMetric (checked by tsc)", () => {
    const same: Exact<TrafficMetric, CampaignSeriesMetric> = true;
    expect(same).toBe(true);
  });
  it("lists the three metrics an owner can plot, in plain words", () => {
    expect([...TRAFFIC_METRICS]).toEqual(["clicks", "impressions", "bookings"]);
    expect(TRAFFIC_METRIC_LABELS.clicks).toBe("Visits");
    // The traffic screen writes its own words for "clicks" ("Visits", the thing the owner counts here),
    // but "Saw your hotel" is the glossary's phrase and must stay word-for-word the same one, or the
    // picker and the glossary panel say two different things about impressions (design audit item 6/10).
    expect(TRAFFIC_METRIC_LABELS.impressions).toBe(glossary.impressions.label);
    expect(isTrafficMetric("impressions")).toBe(true);
    expect(isTrafficMetric("booking_value")).toBe(false);
  });
});

describe("CampaignTrafficChart", () => {
  // Recharts measures its box with getBoundingClientRect, which jsdom answers 0x0 to, and a chart
  // with no width renders no SVG at all. Give the container a size for this block so the event
  // markers are asserted on the real marks rather than on a stand-in.
  const box = { width: 640, height: 320, top: 0, left: 0, bottom: 320, right: 640, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
  const real = Element.prototype.getBoundingClientRect;
  beforeAll(() => { Element.prototype.getBoundingClientRect = () => box; });
  afterAll(() => { Element.prototype.getBoundingClientRect = real; });

  it("is a labelled figure with one legend key per campaign and a key for Autumn's changes", () => {
    wrap(<CampaignTrafficChart data={series} range={range} />);
    expect(screen.getByRole("figure", { name: "Visits by campaign, day by day" })).toBeInTheDocument();
    const legend = screen.getByRole("list", { name: "Legend" });
    expect(within(legend).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Brand protection", "Discovery", "What Autumn did"]);
  });

  it("marks each event on its bucket and links it to the card beside the chart", () => {
    const { container } = wrap(<CampaignTrafficChart data={series} range={range} />);
    const markers = container.querySelectorAll('a[href="#event-1"]');
    expect(markers).toHaveLength(1);
    expect(markers[0].textContent).toContain("Ads refreshed: New headlines for the harbour season");
  });

  it("swaps to a table of the same numbers", () => {
    wrap(<CampaignTrafficChart data={series} range={range} />);
    fireEvent.click(screen.getByRole("radio", { name: "Table" }));
    const row = screen.getByRole("row", { name: "Sep 2" });
    expect(within(row).getByText("60")).toBeInTheDocument();
    expect(within(row).getByText("40")).toBeInTheDocument();
    expect(within(row).getByText("100")).toBeInTheDocument();
    const total = screen.getByRole("row", { name: "All buckets" });
    expect(total).toHaveTextContent("260");
    expect(total).toHaveTextContent("340");
    expect(total).toHaveTextContent("600");
  });

  it("says so plainly when nothing ran", () => {
    wrap(<CampaignTrafficChart data={{ ...series, series: [], events: [] }} range={range} />);
    expect(screen.getByText("No paid visits in this period")).toBeInTheDocument();
  });
});

describe("EventImpactCard", () => {
  it("puts the days before beside the days after, in an owner's words", () => {
    // Scoped to the card: Recharts leaves a hidden measurement span on <body> that carries stray digits.
    const { container } = wrap(<EventImpactCard impact={impact} />);
    const card = within(container);
    expect(container.querySelector("#event-1")).not.toBeNull();
    expect(card.getByText(/Ads refreshed/)).toBeInTheDocument();
    expect(card.getByText("New headlines for the harbour season")).toBeInTheDocument();
    expect(card.getByText("28 days each side")).toBeInTheDocument();
    expect(card.getByText("After")).toBeInTheDocument();
    expect(card.getByText("1 in 10")).toBeInTheDocument();  // before: ctr 0.1
    expect(card.getByText("1 in 8")).toBeInTheDocument();   // after: ctr 0.125
    expect(card.getByText("300")).toBeInTheDocument();
    expect(card.getByText("375")).toBeInTheDocument();
    expect(card.getByText("+25% vs before")).toBeInTheDocument();
    expect(card.getByText("$4,000")).toBeInTheDocument();
    expect(card.getByText("$6,500")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/CTR|CVR|ROAS/);
  });

  it("refuses to compare a change that is three days old", () => {
    const { container } = wrap(<EventImpactCard impact={{ ...impact, days: 3 }} />);
    expect(within(container).getByText("Too soon to compare")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/1 in/);
    expect(within(container).queryByText("375")).toBeNull();
  });

  it("hides the click-through pair when either window has none", () => {
    const { container } = wrap(<EventImpactCard impact={{ ...impact, before: { ...impact.before, ctr: 0 } }} />);
    expect(within(container).queryByText("Clicked")).toBeNull();
    expect(within(container).getByText("Visits")).toBeInTheDocument();
  });
});

describe("WhatAutumnDid", () => {
  it("shows one change at a time with arrows through the rest, and says nothing happened when nothing did", () => {
    const second: EventImpactDto = { ...impact, event: { ...impact.event, id: 2, title: "Weekend bids raised" } };
    const onSelect = vi.fn();
    const { unmount } = wrap(<WhatAutumnDid impacts={[impact, second]} onSelect={onSelect} />);
    expect(screen.getByRole("heading", { level: 2, name: "What Autumn did" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "New headlines for the harbour season" })).toBeInTheDocument();
    expect(screen.getByText("1 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous change" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next change" }));
    expect(screen.getByRole("heading", { level: 3, name: "Weekend bids raised" })).toBeInTheDocument();
    expect(screen.getByText("2 of 2")).toBeInTheDocument();
    expect(onSelect).toHaveBeenCalledWith(2); // the chart follows the pick
    expect(screen.getByRole("button", { name: "Next change" })).toBeDisabled();
    unmount();
    wrap(<WhatAutumnDid impacts={[]} />);
    expect(screen.getByText("Nothing changed in this period")).toBeInTheDocument();
  });
});

describe("CampaignEfficiencyTable", () => {
  it("prices a visit to the cent and ranks by what a visit gives back", () => {
    const { container } = wrap(<CampaignEfficiencyTable data={efficiency} />);
    expect(screen.getByText("A Brand protection visit brings back $3.66, 4.2× a Discovery visit.")).toBeInTheDocument();
    const row = screen.getByRole("row", { name: "Brand protection" });
    expect(within(row).getByText("$0.07")).toBeInTheDocument();
    expect(within(row).getByText("1 in 130")).toBeInTheDocument();
    expect(within(row).getByText("$8.50")).toBeInTheDocument();
    expect(within(row).getByText("$3.66")).toBeInTheDocument();
    expect(screen.getByRole("row", { name: "All campaigns" })).toHaveTextContent("$2.08");
    expect(container.textContent).not.toMatch(/CTR|CVR|ROAS|conversion rate/);
  });

  it("renders a missing per-unit figure as an em dash, never $0", () => {
    const rows = [efficiency.rows[0], { ...efficiency.rows[1], costPerBookingCents: null, bookings: 0 }];
    wrap(<CampaignEfficiencyTable data={{ ...efficiency, rows }} />);
    const row = screen.getByRole("row", { name: "Discovery" });
    expect(within(row).getByText("—")).toBeInTheDocument();
    expect(within(row).queryByText("$0")).toBeNull();
  });

  it("says so plainly when no campaign spent anything", () => {
    wrap(<CampaignEfficiencyTable data={{ ...efficiency, rows: [] }} />);
    expect(screen.getByText("No campaign spend in this period")).toBeInTheDocument();
  });
});

describe("DeviceConversion", () => {
  it("splits visits by device and says how often each one books", () => {
    wrap(<DeviceConversion devices={devices} />);
    const phone = screen.getByRole("row", { name: "Phone" });
    expect(within(phone).getByText("240")).toBeInTheDocument();
    expect(within(phone).getByText("1 in 24")).toBeInTheDocument();
    expect((phone.querySelector("span[style]") as HTMLElement).style.backgroundColor).toBe("var(--series-1)");
    expect(screen.getAllByRole("row")).toHaveLength(4); // header + three devices
    expect(within(screen.getByRole("row", { name: "Computer" })).getByText("1 in 24")).toBeInTheDocument();
  });

  it("says so plainly when nobody has visited", () => {
    wrap(<DeviceConversion devices={[]} />);
    expect(screen.getByText("No visits in this period yet")).toBeInTheDocument();
  });
});

describe("campaign-traffic-data", () => {
  // The chart's arithmetic, lifted out of the component on 2026-09-17 (design audit item 9) so each
  // rule is proved on values rather than on a rendered Recharts SVG.
  it("shapes one row per bucket, with the bucket's span and the all-campaigns total", () => {
    const rows = chartRows(series, range.to);
    expect(rows).toHaveLength(10);
    expect(rows[1]).toMatchObject({ label: "Sep 2", span: "Sep 2", total: 100, s0: 60, s1: 40 });
    // A week bucket names the days it covers; the last one stops at the range's own end.
    const weekly = { ...series, granularity: "week" as const, buckets: ["2026-09-01", "2026-09-08"], series: series.series.map((s) => ({ ...s, values: [1, 2] })) };
    const weeks = chartRows(weekly, "2026-09-10");
    expect(weeks[0].span).toBe("Sep 1 – Sep 7");
    expect(weeks[1].span).toBe("Sep 8 – Sep 10");
  });

  it("gives several changes on one bucket a single mark", () => {
    const two = [
      { ...series.events[0], id: 1 },
      { ...series.events[0], id: 2, title: "Weekend bids raised" },
      { ...series.events[0], id: 3, date: "2026-09-02", bucket: "2026-09-02" },
    ];
    const marks = marksByBucket(two);
    expect(marks).toHaveLength(2);
    const [bucket, events] = marks.find(([b]) => b === "2026-09-05")!;
    expect(bucket).toBe("2026-09-05");
    expect(events).toHaveLength(2);
    expect(events.map((e) => e.id)).toEqual([1, 2]);
  });

  it("clips a highlight window to the range's last bucket", () => {
    // The after-window runs a month past the chart; the shaded band must stop at the last bucket.
    expect(highlightSpan(series.buckets, { from: "2026-09-05", to: "2026-10-02" }, range.to)).toEqual({
      from: "2026-09-05",
      to: "2026-09-10",
    });
    // Inside the range it keeps its own end, and a date before the first bucket falls on the first.
    expect(highlightSpan(series.buckets, { from: "2026-08-01", to: "2026-09-03" }, range.to)).toEqual({
      from: "2026-09-01",
      to: "2026-09-03",
    });
  });
});
