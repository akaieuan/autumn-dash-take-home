import { describe, it, expect } from "vitest";
import { computeInsights } from "@/lib/insights";
import type { OverviewDto, PeriodTotals } from "@/lib/db/queries/overview";
import type { BreakdownRowDto } from "@/lib/db/queries/breakdowns";
import { parseRange } from "@/lib/date-range";

const range = parseRange("30d", "2024-09-17", "2026-09-16");
const totals = (o: Partial<PeriodTotals> = {}): PeriodTotals => ({ from: "", to: "", days: 30, impressions: 6000, clicks: 1000, websiteVisits: 970, bookings: 40, bookingValueCents: 2000000, feeCents: 300000, netCents: 1700000, newVisitors: 5000, pagesPerSession: 3.4, ctr: 1 / 6, conversion: 0.04, avgBookingValueCents: 50000, ...o });
const overview = (o: Partial<OverviewDto> = {}): OverviewDto => ({ current: totals(), previous: totals(), lastYear: totals(), feeRateBps: 1500, costPerBookingCents: 7500, otaCommissionPerBookingCents: 9000, commissionAvoidedCents: 360000, ...o });
const row = (value: string, o: Partial<BreakdownRowDto> = {}): BreakdownRowDto => ({ value, label: value, impressions: 1000, clicks: 100, bookings: 5, bookingValueCents: 250000, feeCents: 37500, ctr: 0.1, conversion: 0.05, shareOfBookings: 0.5, shareOfClicks: 0.5, previous: { impressions: 1000, clicks: 100, bookings: 5, bookingValueCents: 250000 }, ...o });
const none = { campaign: [], device: [], feeder_market: [] };

describe("computeInsights", () => {
  it("flat numbers with fees below OTA commission yield only the cost win", () => {
    const out = computeInsights({ overview: overview(), breakdowns: none, range });
    expect(out.map((i) => i.id)).toEqual(["cheaper-than-ota"]);
    expect(out[0].body).toContain("$90");
  });
  it("a 20% rise is a win; a 20% fall is a watch, softened when still ahead of last year", () => {
    const up = computeInsights({ overview: overview({ current: totals({ bookingValueCents: 2400000 }), costPerBookingCents: null, otaCommissionPerBookingCents: null }), breakdowns: none, range });
    expect(up[0]).toMatchObject({ id: "value-up", kind: "win", title: "Booking value up 20% vs the previous 30 days" });
    const down = computeInsights({ overview: overview({ current: totals({ bookingValueCents: 1600000 }), lastYear: totals({ bookingValueCents: 1500000 }), costPerBookingCents: null, otaCommissionPerBookingCents: null }), breakdowns: none, range });
    expect(down[0]).toMatchObject({ id: "value-down", kind: "watch", anchor: "trend" });
    expect(down[0].body).toMatch(/season/);
    const worse = computeInsights({ overview: overview({ current: totals({ bookingValueCents: 1600000 }), lastYear: totals({ bookingValueCents: 1900000 }), costPerBookingCents: null, otaCommissionPerBookingCents: null }), breakdowns: none, range });
    expect(worse[0]).toMatchObject({ id: "value-down", anchor: "campaigns" });
  });
  it("year-over-year growth of 15% or more is a win with both counts", () => {
    const out = computeInsights({ overview: overview({ current: totals({ bookings: 46 }), lastYear: totals({ bookings: 39 }), costPerBookingCents: null, otaCommissionPerBookingCents: null }), breakdowns: none, range });
    expect(out[0]).toMatchObject({ id: "yoy-up", title: "18% more bookings than this time last year" });
    expect(out[0].body).toContain("46 now vs 39 then");
  });
  it("campaign riser and click-through drop, with an action paired to the watch, watches first", () => {
    const campaign = [
      row("Brand Protection", { bookings: 9, previous: { impressions: 1000, clicks: 100, bookings: 5, bookingValueCents: 250000 } }),
      row("Discovery & Competitors", { impressions: 4000, clicks: 200, ctr: 0.05, previous: { impressions: 4000, clicks: 300, bookings: 5, bookingValueCents: 250000 } }),
    ];
    const out = computeInsights({ overview: overview({ costPerBookingCents: null, otaCommissionPerBookingCents: null }), breakdowns: { ...none, campaign }, range });
    expect(out.map((i) => i.kind)).toEqual(["watch", "win", "action"]);
    expect(out[0].title).toBe("Fewer people clicked the discovery & competitors ads");
    expect(out[1].title).toBe("Brand Protection brought 4 more bookings than before");
  });
  it("new market and phone share, and the limit holds", () => {
    const out = computeInsights({ overview: overview({ current: totals({ bookingValueCents: 2400000, bookings: 60 }) }), breakdowns: {
      campaign: [row("A", { bookings: 8 })],
      feeder_market: [row("Milwaukee, WI", { bookings: 3, previous: { impressions: 0, clicks: 0, bookings: 0, bookingValueCents: 0 } })],
      device: [row("Mobile", { shareOfClicks: 0.61 })],
    }, range }, 3);
    expect(out).toHaveLength(3);
    const all = computeInsights({ overview: overview({ current: totals({ bookingValueCents: 2400000, bookings: 60 }) }), breakdowns: { campaign: [], feeder_market: [row("Milwaukee, WI", { bookings: 3, previous: { impressions: 0, clicks: 0, bookings: 0, bookingValueCents: 0 } })], device: [row("Mobile", { shareOfClicks: 0.61 })] }, range }, 10);
    expect(all.map((i) => i.id)).toEqual(["value-up", "yoy-up", "cheaper-than-ota", "new-market", "mobile"]);
    expect(all.find((i) => i.id === "mobile")?.title).toBe("61% of visitors arrive on a phone");
  });
  it("returns nothing when there is no comparison and no fee advantage", () => {
    expect(computeInsights({ overview: overview({ previous: null, lastYear: null, costPerBookingCents: 9500 }), breakdowns: none, range: { ...range, comparison: null } })).toEqual([]);
  });
});
