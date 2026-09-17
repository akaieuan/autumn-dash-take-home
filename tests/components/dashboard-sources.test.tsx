// @vitest-environment jsdom
// tests/components/dashboard-sources.test.tsx
//
// Literals bound to the live `src/lib/glossary.ts` on 2026-09-17, not to the brief's drafts.
// The funnel rows are labelled by the glossary, whose wording differs from the brief's:
// `impressions.label` is "Saw your hotel" (the brief quoted "People reached", which is the
// chart's METRIC_LABELS wording), `clicks.label` is "Clicked through", and
// `direct_bookings.label` is "Direct bookings from Autumn". The campaign purpose line is
// `glossary.brand_protection.purpose` ("Keeps you first when guests search your name, so OTAs
// don't take a booking that was already yours."); the brief quoted an earlier draft ("Keeps online
// travel agencies from winning guests who were already looking for you."). Each expected string is written
// out in full here, so a component that stopped reading the glossary — or a glossary reword —
// turns this file red.
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FeederMarkets, CampaignSummary, FunnelSection } from "@/components/dashboard";
import type { MarketDto, CampaignSummaryDto, FunnelDto } from "@/lib/db/queries";

const markets: MarketDto[] = [
  { name: "Chicago, IL", hint: "2 h 15 drive", visits: 377, previousVisits: 428, bookings: 14, bookingValueCents: 630000, share: 1 },
  { name: "Everywhere else", hint: null, visits: 202, previousVisits: 190, bookings: 9, bookingValueCents: 398000, share: 9 / 14 },
];
const summary: CampaignSummaryDto = {
  campaigns: [
    { key: "brand_protection", name: "Protecting your name", live: true, shown: 2300, visits: 690, ctr: 0.3, bookings: 27, bookingValueCents: 1201000, spendCents: 0, share: 27 / 41 },
    { key: "discovery", name: "Finding new guests", live: false, shown: 4100, visits: 330, ctr: 0.08, bookings: 14, bookingValueCents: 623000, spendCents: 0, share: 14 / 41 },
  ],
  total: { shown: 6400, visits: 1020, ctr: 1020 / 6400, bookings: 41, bookingValueCents: 1824000 },
};
const funnel: FunnelDto = {
  steps: [
    { key: "impressions", people: 6400, onwardRatio: 1020 / 6400, bookingValueCents: null },
    { key: "clicks", people: 1020, onwardRatio: 41 / 1020, bookingValueCents: null },
    { key: "direct_bookings", people: 41, onwardRatio: null, bookingValueCents: 1824000 },
  ],
  newVisitors: 5210,
  pagesPerSession: 3.6,
  devices: [
    { key: "device_mobile", share: 0.58 },
    { key: "device_desktop", share: 0.35 },
    { key: "device_tablet", share: 0.07 },
  ],
};
const wrap = (ui: React.ReactNode) => render(<TooltipProvider>{ui}</TooltipProvider>);

describe("FeederMarkets", () => {
  it("ranks markets with hints, bookings, value and a share meter; visits are container-gated", () => {
    wrap(<FeederMarkets markets={markets} />);
    expect(document.getElementById("markets")).not.toBeNull();
    const row = screen.getByRole("row", { name: "Chicago, IL" });
    expect(row).toHaveTextContent("2 h 15 drive");
    expect(within(row).getByRole("meter", { name: "Chicago, IL share of bookings" }).getAttribute("aria-valuenow")).toBe("1");
    expect(within(row).getByText("377").className).toContain("@md:block");
    expect(within(row).getByText("$6,300")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /All markets/ }).getAttribute("href")).toBe("/website-traffic#markets");
  });
});

describe("CampaignSummary", () => {
  it("names campaigns plainly, shows click-through as 1 in N, live dots, and a total from the DTO", () => {
    wrap(<CampaignSummary summary={summary} />);
    expect(document.getElementById("campaigns")).not.toBeNull();
    const brand = screen.getByRole("row", { name: "Protecting your name" });
    expect(within(brand).getByText("Live")).toBeInTheDocument();
    expect(within(brand).getByText("1 in 3")).toBeInTheDocument();
    expect(
      within(brand).getByText("Keeps you first when guests search your name, so OTAs don't take a booking that was already yours."),
    ).toBeInTheDocument();
    expect(within(screen.getByRole("row", { name: "Finding new guests" })).queryByText("Live")).toBeNull();
    expect(screen.getByText("1 live")).toBeInTheDocument();
    const total = screen.getByRole("row", { name: "All campaigns" });
    expect(total).toHaveTextContent("6,400");
    expect(total).toHaveTextContent("1 in 6");
    expect(total).toHaveTextContent("$18,240");
    expect(screen.queryByText(/\bCTR\b/)).toBeNull();
  });
});

describe("FunnelSection", () => {
  it("is a collapsible that opens in place on wide screens and chains the steps", () => {
    wrap(<FunnelSection funnel={funnel} />);
    const btn = screen.getByRole("button", { name: /Funnel and website engagement/ });
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    expect((document.querySelector("[data-slot=collapsible-content]") as HTMLElement).className).toContain("2xl:block");
    expect(screen.getByRole("row", { name: "Saw your hotel" })).toHaveTextContent("6,4001 in 6");
    expect(screen.getByRole("row", { name: "Direct bookings from Autumn" })).toHaveTextContent("41$18,240");
    expect(screen.getByText("5,210")).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "Phone share of visits" }).getAttribute("aria-valuenow")).toBe("0.58");
  });
});
