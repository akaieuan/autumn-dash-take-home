// @vitest-environment jsdom
// tests/components/dashboard.test.tsx
//
// Literals bound to the live sources on 2026-09-17, not to the brief's drafts:
//   * `OverviewDto` carries `current | previous | lastYear` (`PeriodTotals`), and the fee and
//     net sit inside `current` — so the fixture below is the shape `getOverview` really returns.
//   * The comparison wording comes from `DateRange.comparison` ("the previous 30 days",
//     "this time last year"), which is what `parseRange` writes.
//   * `glossary.direct_bookings.label` is "Direct bookings from Autumn" and its industry term is
//     "attributed bookings", so `GlossaryEntry` renders "Direct bookings from Autumn (attributed
//     bookings)" — the brief quoted "Direct bookings (attributed bookings)", which the implemented
//     glossary reworded. Each expected string is still written out in full, so a component that
//     stopped reading the glossary, or a glossary reword, turns this file red.
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CollapsibleSection } from "@/components/layout";
import {
  Headline,
  QuickAnalytics,
  InsightList,
  GlossaryPanel,
  OverviewBodySkeleton,
} from "@/components/dashboard";
import type { OverviewDto, PeriodTotals, QuickAnalyticsDto } from "@/lib/db/queries";
import type { DateRange } from "@/lib/date-range";

const totals: PeriodTotals = {
  from: "2026-08-18",
  to: "2026-09-16",
  days: 30,
  impressions: 6400,
  clicks: 1020,
  websiteVisits: 1080,
  bookings: 41,
  bookingValueCents: 1824000,
  feeCents: 273600,
  netCents: 1550400,
  newVisitors: 5210,
  siteSessions: 7442,
  pageviews: 26791,
  pagesPerSession: 3.6,
  ctr: 1020 / 6400,
  conversion: 41 / 1020,
  avgBookingValueCents: 44488, spendCents: 0, allDirectBookings: 120, shareOfDirectBookings: 41 / 120 };
const overview: OverviewDto = {
  current: totals,
  previous: { ...totals, bookings: 35, bookingValueCents: 1508000 },
  lastYear: { ...totals, bookings: 33, bookingValueCents: 1471000 },
  feeRateBps: 1500,
  costPerBookingCents: 6673,
  otaCommissionPerBookingCents: 8009,
  commissionAvoidedCents: 328320,
};
const range: DateRange = {
  preset: "30d",
  from: "2026-08-18",
  to: "2026-09-16",
  days: 30,
  granularity: "day",
  label: "Last 30 days",
  comparison: {
    prevFrom: "2026-07-19",
    prevTo: "2026-08-17",
    prevLabel: "the previous 30 days",
    lastYearFrom: "2025-08-18",
    lastYearTo: "2025-09-16",
    lastYearLabel: "this time last year",
  },
};
const quick: QuickAnalyticsDto = {
  stats: [
    { key: "direct_bookings", kind: "count", value: 41, previous: 35, spark: [9, 11, 10, 11] },
    { key: "booking_value", kind: "money", value: 1824000, previous: 1508000, spark: [400000, 500000, 450000, 474000] },
    { key: "website_visits", kind: "count", value: 1080, previous: 990, spark: [260, 280, 270, 270] },
    { key: "impressions", kind: "count", value: 6400, previous: 6600, spark: [1700, 1600, 1500, 1600] },
  ],
};
const wrap = (ui: React.ReactNode) => render(<TooltipProvider>{ui}</TooltipProvider>);

describe("Headline", () => {
  it("is one sentence with bookings, value and what the owner kept, plus deltas in words", () => {
    wrap(<Headline overview={overview} range={range} />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent(
      "Autumn brought you 41 of your 120 direct bookings, worth $18,240. You kept $15,504 after Autumn's 15% fee.",
    );
    // 1824000 vs 1508000 = +21%; 1824000 vs 1471000 = +24%.
    expect(screen.getByText("+21% vs the previous 30 days")).toBeInTheDocument();
    expect(screen.getByText("+24% vs this time last year")).toBeInTheDocument();
    expect(screen.getByText(/Autumn's fee this period/).textContent).toContain("$2,736");
    expect(screen.getByText("Last 30 days · Aug 18 – Sep 16, 2026")).toBeInTheDocument();
  });
  it("falls back to Autumn's count alone when the property recorded no direct bookings in all", () => {
    wrap(<Headline overview={{ ...overview, current: { ...totals, allDirectBookings: 0, shareOfDirectBookings: null } }} range={range} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Autumn brought you 41 direct bookings worth $18,240.");
  });
  it("drops the comparison lines for the all-time range", () => {
    wrap(
      <Headline
        overview={{ ...overview, previous: null, lastYear: null }}
        range={{ ...range, preset: "all", label: "Since the beginning", comparison: null }}
      />,
    );
    expect(screen.queryByText(/vs /)).toBeNull();
  });
});

describe("QuickAnalytics", () => {
  it("renders four stats in one panel with labels, values and deltas", () => {
    wrap(<QuickAnalytics data={quick} />);
    expect(screen.getByRole("region", { name: "Quick analytics" })).toBeInTheDocument();
    expect(screen.getByText("Direct bookings from Autumn")).toBeInTheDocument();
    expect(screen.getByText("$18,240")).toBeInTheDocument();
    // impressions 6400 vs 6600 = -3%.
    expect(screen.getByText("-3% vs previous")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /What does .* mean\?/ })).toHaveLength(4);
  });
});

describe("InsightList", () => {
  it("renders cards with tags and each insight's own small graph, and an explicit empty state", () => {
    wrap(
      <InsightList
        insights={[
          {
            id: "market-drop",
            kind: "watch",
            title: "Chicago, IL sent fewer visitors",
            body: "Visits fell 12%.",
            chart: { kind: "bars", format: "count", bars: [{ label: "Now", value: 880, tone: "current" }, { label: "Before", value: 1000, tone: "previous" }] },
          },
        ]}
      />,
    );
    expect(screen.getByText("Watch")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull(); // nothing to click: the graph is the evidence
    expect(screen.getByText("Now").nextElementSibling?.firstElementChild).toHaveStyle({ width: "88%" }); // 880 of the largest bar, 1000
    expect(screen.getByText("1,000")).toBeInTheDocument();
    wrap(<InsightList insights={[]} />);
    expect(screen.getByText("Nothing needs your attention this period")).toBeInTheDocument();
  });
});

describe("CollapsibleSection", () => {
  it("starts closed, opens on click, and is a real button with aria-expanded", () => {
    render(
      <CollapsibleSection id="funnel" title="Funnel and website engagement" description="From being seen to being booked.">
        <p>inside</p>
      </CollapsibleSection>,
    );
    const btn = screen.getByRole("button", { name: /Funnel and website engagement/ });
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByText("inside").closest("[data-state]")?.getAttribute("data-state")).toBe("closed");
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
  });
  it("opens when the URL hash names it", () => {
    window.location.hash = "#campaigns";
    render(
      <CollapsibleSection id="campaigns" title="Campaigns" description="x">
        <p>c</p>
      </CollapsibleSection>,
    );
    expect(screen.getByRole("button", { name: /Campaigns/ }).getAttribute("aria-expanded")).toBe("true");
    window.location.hash = "";
  });
  it("carries the wide-screen open-in-place classes only when asked", () => {
    const { container } = render(
      <CollapsibleSection id="w" title="W" description="x" openAtWide>
        <p>w</p>
      </CollapsibleSection>,
    );
    expect((container.querySelector("[data-slot=collapsible-content]") as HTMLElement).className).toContain("2xl:block");
  });
});

describe("GlossaryPanel and skeleton", () => {
  it("is a panel that shows every group's terms at once, with their industry names", () => {
    wrap(<GlossaryPanel groups={[{ id: "money", label: "Bookings and money", keys: ["direct_bookings", "autumn_fee"] }, { id: "ads", label: "Your ads", keys: ["ctr"] }]} />);
    expect(screen.getByRole("heading", { level: 2, name: "What these numbers mean" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Bookings and money" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Your ads" })).toBeInTheDocument();
    expect(screen.getByText("Direct bookings from Autumn")).toBeInTheDocument();
    expect(screen.getByText("attributed bookings")).toBeInTheDocument();
    expect(screen.getByText("People who clicked")).toBeInTheDocument(); // nothing is hidden behind a tab
  });
  it("skeleton reserves the plot height so the chart never shifts the page", () => {
    const { container } = render(<OverviewBodySkeleton />);
    expect(container.querySelector(".h-\\(--plot-height\\)")).not.toBeNull();
  });
});
