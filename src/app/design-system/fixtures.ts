import { parseRange } from "@/lib/date-range";
import type { OverviewDto, PeriodTotals, QuickAnalyticsDto, TrendPoint, MarketDto, CampaignSummaryDto, FunnelDto, ActivityDto, CampaignSeriesDto, EventImpactDto, WindowTotals, CampaignEfficiencyDto, BreakdownRowDto } from "@/lib/db/queries";
import type { Insight } from "@/lib/insights";

/**
 * Hand-written DTOs for the reference page, shaped like a real 30-day window of the seed. They exist so
 * every specimen renders the real component with plausible numbers and no database call; nothing here
 * is measured, and nothing here is shown to an owner.
 */
export const range = parseRange("30d", "2024-09-17", "2026-09-16");

const totals = (p: Partial<PeriodTotals>): PeriodTotals => ({
  from: range.from, to: range.to, days: 30,
  impressions: 9366, clicks: 1568, websiteVisits: 1548, bookings: 78,
  bookingValueCents: 3799300, feeCents: 569895, netCents: 3229405,
  newVisitors: 1116, pagesPerSession: 3.4, spendCents: 262000,
  ctr: 0.167, conversion: 0.05, avgBookingValueCents: 48709,
  ...p,
});

export const overview: OverviewDto = {
  current: totals({}),
  previous: totals({ bookings: 66, bookingValueCents: 3150000, feeCents: 472500, netCents: 2677500, impressions: 8900, clicks: 1420, websiteVisits: 1402 }),
  lastYear: totals({ bookings: 51, bookingValueCents: 2380000, feeCents: 357000, netCents: 2023000 }),
  feeRateBps: 1500,
  costPerBookingCents: 7306,
  otaCommissionPerBookingCents: 8768,
  commissionAvoidedCents: 683874,
};

export const quick: QuickAnalyticsDto = {
  stats: [
    { key: "direct_bookings", kind: "count", value: 78, previous: 66, spark: [9, 11, 10, 12, 13, 11, 12] },
    { key: "booking_value", kind: "money", value: 3799300, previous: 3150000, spark: [420000, 510000, 480000, 560000, 620000, 590000, 619300] },
    { key: "website_visits", kind: "count", value: 1548, previous: 1402, spark: [190, 210, 205, 230, 240, 235, 238] },
    { key: "impressions", kind: "count", value: 9366, previous: 8900, spark: [1200, 1300, 1250, 1400, 1450, 1380, 1386] },
  ],
};

/** Ten daily buckets, cents, with both comparisons present. */
export const trend: TrendPoint[] = Array.from({ length: 10 }, (_, i) => ({
  bucket: `2026-09-${String(7 + i).padStart(2, "0")}`,
  current: [118000, 146000, 92000, 206000, 108000, 139000, 84000, 173000, 120000, 204000][i],
  previous: [93000, 100000, 149000, 113000, 122000, 128000, 118000, 140000, 96000, 158000][i],
  lastYear: [85000, 92000, 88000, 104000, 96000, 107000, 90000, 101000, 88000, 110000][i],
}));

export const markets: MarketDto[] = [
  { name: "Chicago, IL", hint: "2 h 15 drive", visits: 553, previousVisits: 500, bookings: 28, bookingValueCents: 1380000, share: 1 },
  { name: "Indianapolis, IN", hint: "3 h 30 drive", visits: 204, previousVisits: 180, bookings: 10, bookingValueCents: 487700, share: 0.36 },
  { name: "Detroit, MI", hint: "2 h 45 drive", visits: 180, previousVisits: 210, bookings: 10, bookingValueCents: 454600, share: 0.36 },
  { name: "Milwaukee, WI", hint: "by ferry", visits: 172, previousVisits: 120, bookings: 9, bookingValueCents: 411600, share: 0.32 },
  { name: "Grand Rapids, MI", hint: "1 h 10 drive", visits: 213, previousVisits: 200, bookings: 9, bookingValueCents: 397000, share: 0.32 },
  { name: "Everywhere else", hint: null, visits: 246, previousVisits: 230, bookings: 12, bookingValueCents: 668400, share: 0.43 },
];

export const campaigns: CampaignSummaryDto = {
  campaigns: [
    { key: "brand_protection", name: "Brand protection", live: true, shown: 3685, visits: 1263, ctr: 0.343, bookings: 31, bookingValueCents: 1516900, spendCents: 60000, share: 0.39 },
    { key: "discovery", name: "Discovery", live: true, shown: 18284, visits: 2371, ctr: 0.13, bookings: 25, bookingValueCents: 1151700, spendCents: 120000, share: 0.32 },
    { key: "hotel_ads", name: "Google Hotel Ads", live: true, shown: 4763, visits: 842, ctr: 0.177, bookings: 15, bookingValueCents: 790800, spendCents: 60000, share: 0.19 },
    { key: "retargeting", name: "Reminders", live: true, shown: 2030, visits: 249, ctr: 0.123, bookings: 7, bookingValueCents: 339900, spendCents: 22000, share: 0.1 },
  ],
  total: { shown: 9366, visits: 1568, ctr: 0.167, bookings: 78, bookingValueCents: 3799300 },
};

export const funnel: FunnelDto = {
  steps: [
    { key: "impressions", people: 9366, onwardRatio: 0.167, bookingValueCents: null },
    { key: "clicks", people: 1568, onwardRatio: 0.05, bookingValueCents: null },
    { key: "direct_bookings", people: 78, onwardRatio: null, bookingValueCents: 3799300 },
  ],
  newVisitors: 1116,
  pagesPerSession: 3.4,
  devices: [{ key: "device_mobile", share: 0.63 }, { key: "device_desktop", share: 0.31 }, { key: "device_tablet", share: 0.06 }],
};

export const insights: Insight[] = [
  { id: "value-up", kind: "win", title: "Booking value up 21% vs the previous 30 days", body: "78 direct bookings worth $37,993, against $31,500 the period before.", chart: { kind: "bars", format: "money", bars: [{ label: "This period", value: 3799300, tone: "current" }, { label: "The previous 30 days", value: 3150000, tone: "previous" }, { label: "This time last year", value: 2380000, tone: "lastYear" }] } },
  { id: "ctr-drop-discovery", kind: "watch", title: "Fewer people clicked the discovery ads", body: "13.0% of people who saw them clicked, down from 16.4%. Competitors often bid harder going into the season.", chart: { kind: "bars", format: "pct", bars: [{ label: "Now", value: 0.13, tone: "current" }, { label: "Before", value: 0.164, tone: "previous" }] } },
  { id: "mobile", kind: "action", title: "63% of visitors arrive on a phone", body: "Worth checking your booking page on your own phone now and then: that is where most guests decide.", chart: { kind: "share", segments: [{ label: "Phone", share: 0.63 }, { label: "Computer", share: 0.31 }, { label: "Tablet", share: 0.06 }] } },
];

/** 53 weeks of daily visits ending 2026-09-16, a summer peak and a weekend lift, deterministic. */
export const activity: ActivityDto = (() => {
  const to = "2026-09-16";
  const days: ActivityDto["days"] = [];
  let seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const end = Date.UTC(2026, 8, 16);
  const start = end - 370 * 86400000;
  const startDow = new Date(start).getUTCDay();
  for (let t = start - startDow * 86400000; t <= end; t += 86400000) {
    const d = new Date(t);
    const doy = (t - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400000;
    const season = 0.55 + 0.45 * Math.max(0, Math.cos(((doy - 185) / 365) * 2 * Math.PI));
    const weekend = d.getUTCDay() === 6 ? 1.4 : d.getUTCDay() === 5 ? 1.2 : 1;
    const value = t < start ? null : Math.round((14 + 44 * season) * weekend * (0.8 + 0.4 * rnd()));
    // The day card's other three readings, from the same deterministic stream: new visitors are two
    // thirds of a day's traffic, a busy day books once or twice, and a visit reads three-odd pages.
    const newShare = 0.66 + 0.1 * rnd();
    const booked = rnd();
    days.push({
      date: d.toISOString().slice(0, 10),
      value,
      newVisitors: value === null ? null : Math.round(value * newShare),
      bookings: value === null ? null : booked > 0.88 ? 2 : booked > 0.55 ? 1 : 0,
      pagesPerSession: value === null ? null : Math.round((2.6 + 1.6 * rnd()) * 10) / 10,
    });
  }
  const values = days.flatMap((d) => (d.value === null ? [] : [d.value]));
  return { metric: "website_visits", from: days[0].date, to, weeks: Math.ceil(days.length / 7), max: Math.max(...values), total: values.reduce((a, b) => a + b, 0), days };
})();

/** Ten daily buckets of paid visits by campaign, ranked by total, with one event pinned to its day. */
export const campaignSeries: CampaignSeriesDto = {
  metric: "clicks",
  granularity: "day",
  buckets: trend.map((p) => p.bucket),
  series: [
    { name: "Discovery & Competitors", label: "Discovery", values: [70, 82, 64, 91, 77, 85, 60, 88, 74, 90], total: 781 },
    { name: "Brand Protection", label: "Brand protection", values: [40, 44, 38, 47, 41, 45, 36, 46, 42, 44], total: 423 },
    { name: "Google Hotel Ads", label: "Google Hotel Ads", values: [26, 30, 24, 31, 27, 29, 22, 30, 28, 29], total: 276 },
    { name: "Retargeting", label: "Reminders", values: [8, 9, 7, 9, 8, 9, 6, 9, 8, 9], total: 82 },
  ],
  events: [
    { id: 22, date: "2026-09-11", campaign: "Discovery & Competitors", campaignLabel: "Discovery", kind: "copy_refresh", kindLabel: "Ads refreshed", title: "Discovery ad copy refreshed", note: "New headlines lead with the lake, not the town.", bucket: "2026-09-11" },
  ],
};

const window = (from: string, to: string, impressions: number, clicks: number, bookings: number, bookingValueCents: number, spendCents: number): WindowTotals => ({
  from, to, impressions, clicks, bookings, bookingValueCents, spendCents, ctr: impressions ? clicks / impressions : 0, conversion: clicks ? bookings / clicks : 0,
});

export const impacts: EventImpactDto[] = [
  {
    event: campaignSeries.events[0],
    days: 28,
    before: window("2026-08-14", "2026-09-10", 3000, 300, 9, 400000, 50000),
    after: window("2026-09-11", "2026-10-08", 3000, 375, 14, 650000, 60000),
  },
  {
    event: { id: 24, date: "2026-09-14", campaign: "Brand Protection", campaignLabel: "Brand protection", kind: "bid_change", kindLabel: "Bids adjusted", title: "Bids raised on your name again", note: "A second OTA began bidding on your name in September." },
    days: 3,
    before: window("2026-09-11", "2026-09-13", 400, 130, 3, 140000, 6000),
    after: window("2026-09-14", "2026-09-16", 410, 141, 3, 150000, 6500),
  },
];

export const efficiency: CampaignEfficiencyDto = {
  rows: [
    { name: "Brand Protection", label: "Brand protection", visits: 1263, shareOfVisits: 0.27, spendCents: 60000, costPerVisitCents: 48, bookings: 31, conversion: 31 / 1263, costPerBookingCents: 1935, bookingValueCents: 1516900, valuePerVisitCents: 1201, previous: null },
    { name: "Google Hotel Ads", label: "Google Hotel Ads", visits: 842, shareOfVisits: 0.18, spendCents: 60000, costPerVisitCents: 71, bookings: 15, conversion: 15 / 842, costPerBookingCents: 4000, bookingValueCents: 790800, valuePerVisitCents: 939, previous: null },
    { name: "Retargeting", label: "Reminders", visits: 249, shareOfVisits: 0.05, spendCents: 22000, costPerVisitCents: 88, bookings: 7, conversion: 7 / 249, costPerBookingCents: 3143, bookingValueCents: 339900, valuePerVisitCents: 1365, previous: null },
    { name: "Discovery & Competitors", label: "Discovery", visits: 2371, shareOfVisits: 0.5, spendCents: 120000, costPerVisitCents: 51, bookings: 25, conversion: 25 / 2371, costPerBookingCents: 4800, bookingValueCents: 1151700, valuePerVisitCents: 486, previous: null },
  ],
  total: { visits: 4725, spendCents: 262000, costPerVisitCents: 55, bookings: 78, conversion: 78 / 4725, costPerBookingCents: 3359, bookingValueCents: 3799300, valuePerVisitCents: 804 },
};

const deviceRow = (value: string, label: string, clicks: number, bookings: number, share: number): BreakdownRowDto => ({
  value, label, impressions: clicks * 6, clicks, bookings, bookingValueCents: bookings * 48700, feeCents: bookings * 7305, spendCents: 0,
  ctr: 1 / 6, conversion: clicks ? bookings / clicks : 0, shareOfBookings: bookings / 78, shareOfClicks: share, previous: null,
});
export const deviceRows: BreakdownRowDto[] = [deviceRow("Mobile", "Phone", 2977, 41, 0.63), deviceRow("Desktop", "Computer", 1465, 32, 0.31), deviceRow("Tablet", "Tablet", 283, 5, 0.06)];
