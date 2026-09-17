import { describe, it, expect } from "vitest";
import { generateAll } from "../scripts/seed/generate";
import { DIMENSIONS } from "@/lib/db/schema";

const data = generateAll();
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
  it("every breakdown dimension sums exactly to the day's totals for all four metrics", () => {
    const daily = new Map(data.daily.map((d) => [d.date, d]));
    const acc = new Map<string, { impressions: number; clicks: number; bookings: number; valueCents: number }>();
    for (const b of data.breakdowns) {
      const k = `${b.date}|${b.dimension}`;
      const a = acc.get(k) ?? { impressions: 0, clicks: 0, bookings: 0, valueCents: 0 };
      a.impressions += b.impressions; a.clicks += b.clicks; a.bookings += b.bookings; a.valueCents += Math.round(b.bookingValue * 100);
      acc.set(k, a);
    }
    expect(acc.size).toBe(730 * DIMENSIONS.length);
    for (const [k, a] of acc) {
      const d = daily.get(k.split("|")[0])!;
      expect(a.impressions, k).toBe(d.impressions);
      expect(a.clicks, k).toBe(d.clicks);
      expect(a.bookings, k).toBe(d.bookings);
      expect(a.valueCents, k).toBe(Math.round(d.bookingValue * 100));
    }
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
