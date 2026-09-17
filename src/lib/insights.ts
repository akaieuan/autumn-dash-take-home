import type { OverviewDto } from "./db/queries/overview";
import type { BreakdownRowDto } from "./db/queries/breakdowns";
import type { EventImpactDto } from "./db/queries/events";
import type { Dimension } from "./db/schema";
import type { DateRange } from "./date-range";
import { cap, delta, longDate, money, oneIn, pct } from "./format";

/**
 * Insights are computed at render time from the same numbers the charts show,
 * so they can never disagree with them (docs/decisions.md D24). Pure: no I/O.
 */
export type InsightKind = "win" | "watch" | "action";

/**
 * The small graph under an insight, filled by the rule from the same numbers its sentence quotes.
 * `bars` compares two or three figures (now, before, last year); `share` splits a whole.
 */
export type InsightChart =
  | { kind: "bars"; format: "money" | "count" | "pct"; bars: { label: string; value: number; tone: "current" | "previous" | "lastYear" }[] }
  | { kind: "share"; segments: { label: string; share: number }[] };

export interface Insight { id: string; kind: InsightKind; title: string; body: string; chart?: InsightChart }

export interface InsightInput { overview: OverviewDto; breakdowns: Record<Dimension, BreakdownRowDto[]>; range: DateRange; events?: EventImpactDto[] }

const ORDER: Record<InsightKind, number> = { watch: 0, win: 1, action: 2 };

/** now vs before, the shape most rules share. */
const nowBefore = (format: "money" | "count" | "pct", now: number, before: number, beforeLabel = "Before"): InsightChart => ({
  kind: "bars", format,
  bars: [{ label: "Now", value: now, tone: "current" }, { label: beforeLabel, value: before, tone: "previous" }],
});

export function computeInsights({ overview, breakdowns, range, events = [] }: InsightInput, limit = 5): Insight[] {
  const out: Insight[] = [];
  const cur = overview.current, prev = overview.previous, ly = overview.lastYear, cmp = range.comparison;

  // 1. Booking value against the previous period, with last year as the seasonal check.
  if (prev && cmp && prev.bookingValueCents > 0) {
    const d = delta(cur.bookingValueCents, prev.bookingValueCents).pct ?? 0;
    const aheadOfLastYear = ly && ly.bookingValueCents > 0 && cur.bookingValueCents >= ly.bookingValueCents;
    const chart: InsightChart = {
      kind: "bars", format: "money",
      bars: [
        { label: "This period", value: cur.bookingValueCents, tone: "current" },
        { label: cap(cmp.prevLabel), value: prev.bookingValueCents, tone: "previous" },
        ...(ly ? [{ label: cap(cmp.lastYearLabel), value: ly.bookingValueCents, tone: "lastYear" as const }] : []),
      ],
    };
    if (d >= 10) out.push({ id: "value-up", kind: "win", title: `Booking value up ${d}% vs ${cmp.prevLabel}`, body: `${cur.bookings} direct bookings worth ${money(cur.bookingValueCents)}, against ${money(prev.bookingValueCents)} the period before.`, chart });
    else if (d <= -10) out.push({ id: "value-down", kind: "watch", title: `Booking value down ${Math.abs(d)}% vs ${cmp.prevLabel}`, body: aheadOfLastYear ? `Still ahead of this time last year, so this looks like the season rather than a problem.` : `Below both the previous period and this time last year. Worth a look at which campaigns slowed.`, chart });
  }

  // 2. Year over year.
  if (ly && cmp && ly.bookings > 0) {
    const d = delta(cur.bookings, ly.bookings).pct ?? 0;
    if (d >= 15) out.push({ id: "yoy-up", kind: "win", title: `${d}% more bookings than this time last year`, body: `${cur.bookings} now vs ${ly.bookings} then. The program is growing year on year, not only with the season.`, chart: { kind: "bars", format: "count", bars: [{ label: "This period", value: cur.bookings, tone: "current" }, { label: cap(cmp.lastYearLabel), value: ly.bookings, tone: "lastYear" }] } });
  }

  // 3. What a booking cost against what an OTA would have charged.
  if (overview.costPerBookingCents !== null && overview.otaCommissionPerBookingCents !== null && overview.costPerBookingCents < overview.otaCommissionPerBookingCents) {
    out.push({ id: "cheaper-than-ota", kind: "win", title: `Each booking cost ${money(overview.costPerBookingCents)} in fees`, body: `An online travel agency would have charged about ${money(overview.otaCommissionPerBookingCents)} on the same stay. You kept ${money(cur.netCents)} after Autumn's fee.`, chart: { kind: "bars", format: "money", bars: [{ label: "Autumn's fee", value: overview.costPerBookingCents, tone: "current" }, { label: "Agency commission", value: overview.otaCommissionPerBookingCents, tone: "lastYear" }] } });
  }

  // 4. Campaigns: the biggest riser, and any campaign whose click-through fell sharply.
  const campaigns = breakdowns.campaign ?? [];
  const riser = campaigns.filter((c) => c.previous).map((c) => ({ c, gain: c.bookings - (c.previous?.bookings ?? 0) })).sort((a, b) => b.gain - a.gain)[0];
  if (riser && riser.gain >= 2) out.push({ id: "campaign-riser", kind: "win", title: `${riser.c.label} brought ${riser.gain} more bookings than before`, body: `${riser.c.bookings} bookings worth ${money(riser.c.bookingValueCents)} this period.`, chart: nowBefore("count", riser.c.bookings, riser.c.previous?.bookings ?? 0) });
  for (const c of campaigns) {
    const p = c.previous;
    if (!p || p.impressions < 200 || c.impressions < 200) continue;
    const prevCtr = p.clicks / p.impressions;
    if (prevCtr > 0 && c.ctr < prevCtr * 0.8) {
      out.push({ id: `ctr-drop-${c.value}`, kind: "watch", title: `Fewer people clicked the ${c.label.toLowerCase()} ads`, body: `${pct(c.ctr, 1)} of people who saw them clicked, down from ${pct(prevCtr, 1)}. Competitors often bid harder going into the season.`, chart: nowBefore("pct", c.ctr, prevCtr) });
      out.push({ id: `ctr-action-${c.value}`, kind: "action", title: `What Autumn does when clicks fall`, body: `Ad copy and bids on ${c.label.toLowerCase()} searches are refreshed automatically; you don't need to do anything.` });
      break;
    }
  }

  // 5. A market that produced bookings for the first time.
  const newMarket = (breakdowns.feeder_market ?? []).find((m) => m.previous && m.previous.bookings === 0 && m.bookings >= 3);
  if (newMarket) out.push({ id: "new-market", kind: "win", title: `New guests from ${newMarket.label}`, body: `${newMarket.bookings} bookings from a city that sent none the period before.`, chart: nowBefore("count", newMarket.bookings, 0) });

  // 6. Phones.
  const mobile = (breakdowns.device ?? []).find((d) => d.value === "Mobile");
  if (mobile && mobile.shareOfClicks >= 0.55) out.push({ id: "mobile", kind: "action", title: `${pct(mobile.shareOfClicks)} of visitors arrive on a phone`, body: `Worth checking your booking page on your own phone now and then: that is where most guests decide.`, chart: { kind: "share", segments: (breakdowns.device ?? []).map((d) => ({ label: d.label, share: d.shareOfClicks })) } });

  // 7. The most recent thing Autumn did, with its before/after (D26: events cause the data, so this is the honest "what is Autumn doing").
  const recent = events.find((e) => e.days >= 7);
  if (recent) {
    const { event: e, before, after, days } = recent;
    const who = e.campaignLabel ? `${e.campaignLabel} ads` : "your ads";
    const clicks = before.ctr > 0 && after.ctr > 0 ? ` ${oneIn(after.ctr)} clicked, against ${oneIn(before.ctr)} before.` : "";
    out.push({ id: `event-${e.id}`, kind: "action", title: `${e.kindLabel}: ${e.title}`, body: `On ${longDate(e.date)}. In the ${days} days since, ${who} brought ${after.bookings} bookings worth ${money(after.bookingValueCents)}, against ${before.bookings} in the ${days} days before.${clicks}`, chart: nowBefore("count", after.bookings, before.bookings, `${days} days before`) });
  }

  return out.sort((a, b) => ORDER[a.kind] - ORDER[b.kind]).slice(0, limit);
}
