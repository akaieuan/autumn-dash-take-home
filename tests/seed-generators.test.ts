import { describe, it, expect } from "vitest";
import { generateAll } from "../scripts/seed/generate";
import { DIMENSIONS } from "@/lib/db/schema";
import { EVENTS, DIMENSION_DEFS, WINDOW } from "../scripts/seed/profile";

const data = generateAll();

/** Regenerate with one event's effect neutralised, then restore it. The controlled half of a causality test. */
function generateWithout(id: number, key: "impressions" | "ctr" | "cvr") {
  const event = EVENTS.find((e) => e.id === id);
  if (!event?.effect) throw new Error(`event ${id} has no effect to neutralise`);
  const original = event.effect[key];
  event.effect[key] = 1;
  try {
    return generateAll();
  } finally {
    event.effect[key] = original;
  }
}

const byMonth = (prefix: string) => data.daily.filter((d) => d.date.startsWith(prefix));
const sum = <T,>(rows: T[], f: (r: T) => number) => rows.reduce((s, r) => s + f(r), 0);

describe("seed generators", () => {
  it("is deterministic", () => {
    const again = generateAll();
    expect(again.daily.slice(0, 60)).toEqual(data.daily.slice(0, 60));
    expect(again.breakdowns.slice(0, 200)).toEqual(data.breakdowns.slice(0, 200));
  });
  it("has one daily row per day for 730 days", () => {
    expect(data.daily).toHaveLength(730);
    expect(new Set(data.daily.map((d) => d.date)).size).toBe(730);
    expect(data.daily[0].date).toBe("2024-09-17");
    expect(data.daily[729].date).toBe("2026-09-16");
  });
  it("every breakdown dimension sums exactly to the day's totals for all five metrics", () => {
    const daily = new Map(data.daily.map((d) => [d.date, d]));
    const acc = new Map<string, { impressions: number; clicks: number; bookings: number; valueCents: number; spendCents: number }>();
    for (const b of data.breakdowns) {
      const k = `${b.date}|${b.dimension}`;
      const a = acc.get(k) ?? { impressions: 0, clicks: 0, bookings: 0, valueCents: 0, spendCents: 0 };
      a.impressions += b.impressions; a.clicks += b.clicks; a.bookings += b.bookings; a.valueCents += Math.round(b.bookingValue * 100); a.spendCents += Math.round((b.spend ?? 0) * 100);
      acc.set(k, a);
    }
    expect(acc.size).toBe(730 * DIMENSIONS.length);
    for (const [k, a] of acc) {
      const d = daily.get(k.split("|")[0])!;
      expect(a.impressions, k).toBe(d.impressions);
      expect(a.clicks, k).toBe(d.clicks);
      expect(a.bookings, k).toBe(d.bookings);
      expect(a.valueCents, k).toBe(Math.round(d.bookingValue * 100));
      expect(a.spendCents, k).toBe(Math.round((d.spend ?? 0) * 100));
    }
  });
  it("stores the denominators behind pages per visit, and the daily rate agrees with them", () => {
    for (const d of data.daily) {
      const sessions = d.siteSessions ?? 0, pageviews = d.pageviews ?? 0;
      expect(sessions, d.date).toBeGreaterThanOrEqual(d.websiteVisits);   // paid visits are a subset of all sessions
      expect(d.newVisitors, d.date).toBeLessThanOrEqual(sessions);        // you cannot have more new visitors than visits
      expect(pageviews, d.date).toBeGreaterThan(0);
      expect(d.pagesPerSession, d.date).toBe(Math.round((pageviews / sessions) * 100) / 100);
    }
    const weighted = sum(data.daily, (d) => d.pageviews ?? 0) / sum(data.daily, (d) => d.siteSessions ?? 0);
    expect(weighted).toBeGreaterThan(2.9);
    expect(weighted).toBeLessThan(3.9);
  });
  it("spend is a plausible fraction of booking value and only campaigns with clicks spend", () => {
    const spend = sum(data.daily, (d) => d.spend ?? 0), value = sum(data.daily, (d) => d.bookingValue);
    expect(spend / value).toBeGreaterThan(0.04); expect(spend / value).toBeLessThan(0.15);
    for (const r of data.breakdowns) if (r.clicks === 0) expect(r.spend, `${r.date} ${r.dimensionValue}`).toBe(0);
  });
  it("events are well-formed: inside the window, campaigns exist, launches match start dates, ids unique", () => {
    const names = new Set(DIMENSION_DEFS.campaign.map((d) => d.label));
    expect(new Set(EVENTS.map((e) => e.id)).size).toBe(EVENTS.length);
    for (const e of EVENTS) {
      expect(e.date >= WINDOW.start && e.date <= WINDOW.end, e.title).toBe(true);
      if (e.campaign) expect(names.has(e.campaign), e.title).toBe(true);
      if (e.kind === "launched" && e.campaign) expect(DIMENSION_DEFS.campaign.find((d) => d.label === e.campaign)?.startsOn, e.title).toBe(e.date);
    }
    expect(data.events).toHaveLength(EVENTS.length);
    expect(data.campaigns.map((c) => c.name).sort()).toEqual([...names].sort());
  });
  it("events cause the data: an effect moves only its own campaign, and only from its own date", () => {
    // A before/after comparison on one run cannot prove causality: season, weekday mix and other events
    // drift across the boundary too. Toggling the effect and regenerating from the same seed can.
    const D = "Discovery & Competitors";
    const ctr = (d: typeof data, value: string, from: string, to: string) => {
      const r = d.breakdowns.filter((b) => b.dimensionValue === value && b.date >= from && b.date <= to);
      return sum(r, (b) => b.clicks) / sum(r, (b) => b.impressions);
    };
    const impressions = (d: typeof data, value: string, from: string, to: string) =>
      sum(d.breakdowns.filter((b) => b.dimensionValue === value && b.date >= from && b.date <= to), (b) => b.impressions);
    // `spend` is priced from campaign clicks and written back after the whole daily pass, so it inherits the
    // shifted random stream on every day. Everything generateDaily itself produced must be untouched.
    const before = (d: typeof data, date: string) =>
      d.daily.filter((x) => x.date < date).map(({ spend: _spend, ...rest }) => rest);

    // Event 22: Discovery ad copy refreshed on 2026-08-03, click-through x1.15.
    const noRefresh = generateWithout(22, "ctr");
    expect(ctr(data, D, "2026-08-03", "2026-08-30") / ctr(noRefresh, D, "2026-08-03", "2026-08-30")).toBeGreaterThan(1.05);
    expect(before(noRefresh, "2026-08-03")).toEqual(before(data, "2026-08-03")); // strictly forward-acting

    // Event 9: Discovery budget raised on 2025-04-14, impressions x1.3.
    const noBudget = generateWithout(9, "impressions");
    expect(impressions(data, D, "2025-04-14", "2025-05-11") / impressions(noBudget, D, "2025-04-14", "2025-05-11")).toBeGreaterThan(1.15);
    expect(before(noBudget, "2025-04-14")).toEqual(before(data, "2025-04-14"));

    // Event 7 lifts Brand Protection only: with it off, Discovery's impressions in the window are unchanged.
    const noBidRaise = generateWithout(7, "impressions");
    expect(impressions(data, "Brand Protection", "2025-02-10", "2025-03-09") / impressions(noBidRaise, "Brand Protection", "2025-02-10", "2025-03-09")).toBeGreaterThan(1.05);
  });

  it("never has more clicks than impressions or more bookings than clicks in any row", () => {
    for (const r of [...data.daily, ...data.breakdowns]) { expect(r.clicks).toBeLessThanOrEqual(r.impressions); expect(r.bookings).toBeLessThanOrEqual(r.clicks); }
    for (const r of data.daily) expect(r.websiteVisits).toBeLessThanOrEqual(r.clicks);
  });
  it("rows with zero bookings carry zero value, and vice versa", () => {
    for (const r of data.breakdowns) expect(r.bookings === 0, `${r.date} ${r.dimensionValue}`).toBe(r.bookingValue === 0);
  });
  it("blended rates sit in the reference dashboard's bands", () => {
    const imp = sum(data.daily, (d) => d.impressions), clk = sum(data.daily, (d) => d.clicks), bk = sum(data.daily, (d) => d.bookings), val = sum(data.daily, (d) => d.bookingValue);
    expect(clk / imp).toBeGreaterThan(0.13); expect(clk / imp).toBeLessThan(0.19);
    expect(bk / clk).toBeGreaterThan(0.03); expect(bk / clk).toBeLessThan(0.05);
    expect(val / bk).toBeGreaterThan(300); expect(val / bk).toBeLessThan(700);
  });
  it("shows seasonality and year-over-year growth", () => {
    expect(sum(byMonth("2025-07"), (d) => d.impressions)).toBeGreaterThan(sum(byMonth("2025-01"), (d) => d.impressions) * 1.8);
    expect(sum(byMonth("2026-07"), (d) => d.bookings)).toBeGreaterThan(sum(byMonth("2025-07"), (d) => d.bookings) * 1.05);
  });
  it("launches campaigns in stages and gives mobile more traffic than tablet", () => {
    const hotelAds = data.breakdowns.filter((b) => b.dimensionValue === "Google Hotel Ads");
    expect(hotelAds[0].date).toBe("2024-11-04");
    const dev = (v: string) => sum(data.breakdowns.filter((b) => b.dimension === "device" && b.dimensionValue === v), (b) => b.clicks);
    expect(dev("Mobile")).toBeGreaterThan(dev("Desktop")); expect(dev("Desktop")).toBeGreaterThan(dev("Tablet"));
    const mk = (v: string) => sum(data.breakdowns.filter((b) => b.dimension === "feeder_market" && b.dimensionValue === v), (b) => b.bookings);
    expect(mk("Chicago, IL")).toBeGreaterThan(mk("Grand Rapids, MI"));
  });
  it("light markets and campaigns still book: no zero rows over the full window, at most two over the last 90 days", () => {
    const from = "2026-06-19";
    const zeros = (dim: string, since: string) => {
      const byValue = new Map<string, number>();
      for (const b of data.breakdowns) if (b.dimension === dim && b.date >= since) byValue.set(b.dimensionValue, (byValue.get(b.dimensionValue) ?? 0) + b.bookings);
      return [...byValue.values()].filter((v) => v === 0).length;
    };
    expect(zeros("feeder_market", "2024-09-17")).toBe(0);
    expect(zeros("campaign", "2024-09-17")).toBe(0);
    expect(zeros("feeder_market", from)).toBeLessThanOrEqual(2);
    expect(zeros("campaign", from)).toBe(0);
  });
  it("brand protection clicks through far better than discovery, as in the reference", () => {
    const ctr = (v: string) => { const r = data.breakdowns.filter((b) => b.dimensionValue === v); return sum(r, (b) => b.clicks) / sum(r, (b) => b.impressions); };
    expect(ctr("Brand Protection")).toBeGreaterThan(ctr("Discovery & Competitors") * 2);
    const cvr = (v: string) => { const r = data.breakdowns.filter((b) => b.dimensionValue === v); return sum(r, (b) => b.bookings) / sum(r, (b) => b.clicks); };
    expect(cvr("Brand Protection")).toBeGreaterThan(cvr("Discovery & Competitors") * 2);
  });
});
