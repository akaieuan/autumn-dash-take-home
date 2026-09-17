# Website-traffic screen: data contract and build plan

Date: 2026-09-17. For the design/component agent. Owner ruling: the second
screen explains traffic through the campaigns that produce it, so an owner can
decide the next campaign. The three components below replace `AdSources`,
`NewVsReturning`, `VisitDepth` and `DriveTimePlot` from the artboard;
`WeekdayRhythm`, `DeviceConversion` and `DayCard` stay as drawn.

Everything in §1 exists on `main` and is tested in
`tests/queries/traffic.test.ts` and `tests/queries/events.test.ts` with
expected values computed by hand from `tests/queries/fixture.ts`. Components
take these DTOs as props and never fetch (CLAUDE.md §2).

## 1. Data contract

### 1a. Traffic by campaign, over time — `getTrafficByCampaign(db, range, metric = "clicks")`

```ts
type CampaignSeriesMetric = "clicks" | "impressions" | "bookings";
interface CampaignSeries { name: string; label: string; values: number[]; total: number }
type EventMarker = EventDto & { bucket: string };
interface CampaignSeriesDto {
  metric: CampaignSeriesMetric;
  granularity: "day" | "week" | "month";   // from the range: ≤92 days → day, ≤400 → week, else month
  buckets: string[];                       // ISO bucket starts, first = range.from (never snapped to Monday)
  series: CampaignSeries[];                // one per campaign, ranked by total desc; values.length === buckets.length
  events: EventMarker[];                   // every event in range, ascending by date, each pinned to its bucket
}
```

- `label` is the plain name ("Brand protection", "Discovery", "Google Hotel Ads", "Reminders"); `name` is the seed label for joins.
- A campaign with no rows in the range is absent, not zero-filled. Empty range → `series: []`, `events: []`.
- `bucketEnd(buckets, i, range.to)` gives the last day a bucket covers, for tooltips ("1–7 Sep").
- Stack the series (visits from each campaign add to the day's paid visits). Colour by campaign identity, same colours as the Overview's campaign rows. Mark each event on its bucket; the marker's tooltip is `kindLabel: title` and the click target is the same event in 1b.
- Metric switch: `clicks` is the default and reads "Visits"; `impressions` reads "Saw your hotel"; `bookings` reads "Booked".

### 1b. What Autumn did, with before and after — `getRecentEventImpacts(db, range, count = 3, days = 28)`

```ts
interface EventDto { id: number; date: string; campaign: string | null; campaignLabel: string | null;
  kind: "launched" | "budget_change" | "copy_refresh" | "bid_change" | "seasonal_push"; kindLabel: string; title: string; note: string }
interface WindowTotals { from: string; to: string; impressions: number; clicks: number; bookings: number;
  bookingValueCents: number; spendCents: number; ctr: number; conversion: number }
interface EventImpactDto { event: EventDto; days: number; before: WindowTotals; after: WindowTotals }
```

- `getEvents(db, range, limit)` is the timeline (newest first). `getRecentEventImpacts` pairs each of the newest `count` events with its windows; `days` is the length actually compared (shorter for recent events, clipped to the last day with data).
- `campaign === null` means program-wide; its windows read `daily_metrics`. Otherwise they read that campaign's rows.
- Render a card per impact: kindLabel and date as the eyebrow, title as the heading, note as body, then a two-column before/after of **visits** (`clicks`), **1 in N clicked** (`oneIn(ctr)`), **bookings**, and **value** (`money(bookingValueCents)`), with a `DeltaText` on visits. Hide the click-through pair when either `ctr` is 0. If `days < 7`, show the card without numbers ("Too soon to compare").
- `computeInsights({ overview, breakdowns, range, events })` already emits the newest impact as an "Autumn is on it" card on the Overview; the traffic screen is where the full list lives.

### 1c. Where the next dollar goes — `getCampaignEfficiency(db, range)`

```ts
interface CampaignEfficiencyRow {
  name: string; label: string;
  visits: number; shareOfVisits: number; spendCents: number; costPerVisitCents: number | null;
  bookings: number; conversion: number; costPerBookingCents: number | null;
  bookingValueCents: number; valuePerVisitCents: number | null;
  previous: { visits: number; bookings: number; spendCents: number; bookingValueCents: number } | null;
}
interface CampaignEfficiencyDto { rows: CampaignEfficiencyRow[]; total: { visits; spendCents; costPerVisitCents; bookings; conversion; costPerBookingCents; bookingValueCents; valuePerVisitCents } }
```

- Rows are ranked by `valuePerVisitCents` desc: the top row is where a new dollar earns most. `total` comes from `daily_metrics`, so the footer never drifts from the Overview.
- Per-unit figures are `null` when the divisor is zero; render "—", never "$0".
- Columns, in this order and these words: **Campaign** (label + one-line purpose from `glossary[name].purpose` via `campaignKey`), **Visits** (with share meter), **Cost per visit**, **Booked** (`oneIn(conversion)`), **Cost per booking**, **Value per visit**. Spend is Autumn's money, so the header row says "What Autumn spent" once, above the two cost columns.
- One sentence above the table, computed from the rows: "Every dollar on {top.label} brought back {money(top.valuePerVisitCents)} per visit, {ratio}× {bottom.label}." Only when both are non-null.

### 1d. Also available, unchanged

`getCampaignMeta(db)` (objective, focus, launch date, budget for campaign cards), `getBreakdown(db, range, "device")` (for DeviceConversion: `clicks`, `bookings`, `conversion`, `shareOfClicks`), `getDailySeries` (DayCard), `getMarkets` (the ranked list; drive time as a hint column, no bubble plot).

## 2. What is not in the data (do not build, do not fake)

New vs returning visitors, traffic channels, page paths, time of day. Each needs a schema column and a seed effect first (CLAUDE.md §2: a metric without data is a caption, not a component). The three `SectionPlaceholder`s come out of the page in Task 5; the screen ships without them.

## 3. Build plan

Same conventions as the Overview plan: TDD, `// @vitest-environment jsdom` on component tests, tokens only, `tests/architecture.test.ts` rules, gates green at the end of every task, one commit per task, decisions rows in the same commit.

### Task 1: `CampaignTrafficChart` (1a)
- Create `src/components/website-traffic/campaign-traffic-chart.tsx` (client), `campaign-traffic-table.tsx` (the table twin), `event-marker.tsx`.
- Props: `{ data: CampaignSeriesDto; range: DateRange }`. Stacked `AreaChart` (or bars under 14 buckets), `ReferenceLine` per `events[i].bucket` with a small pin; legend from `series`; table twin lists buckets × campaigns.
- Test: render with a two-series fixture; assert legend labels in rank order, one marker per event, the table twin's cell for bucket 1 / series 0; empty state text "No paid visits in this period" when `series` is empty.
- Negative control: drop the `ReferenceLine` and watch the marker assertion fail.

### Task 2: `WhatAutumnDid` list + `EventImpactCard` (1b)
- Create `src/components/website-traffic/event-impact-card.tsx`, `what-autumn-did.tsx`.
- Props: `{ impacts: EventImpactDto[] }`. Card per §1b; "Too soon to compare" branch; empty state "Nothing changed in this period".
- Test: a copy-refresh fixture renders "Ads refreshed", the title, "1 in 8" and "1 in 10", the visits delta; a `days: 3` fixture renders the too-soon copy and no numbers.

### Task 3: `CampaignEfficiencyTable` (1c)
- Create `src/components/website-traffic/campaign-efficiency-table.tsx`.
- Props: `{ data: CampaignEfficiencyDto }`. Columns per §1c; "—" for nulls; footer from `total`; the one-sentence summary.
- Test: the fixture rows render "$0.07", "1 in 130", "$8.50", "$3.66"; a null `costPerBookingCents` renders "—"; the summary sentence matches; no "CTR"/"CVR"/"ROAS" text anywhere.

### Task 4: Keep and finish the three artboard components that have data
- `WeekdayRhythm` from `getDailySeries` grouped by `dayOfWeek` (add a campaign toggle if cheap: `getTrafficByCampaign` with `granularity: "day"` grouped the same way).
- `DeviceConversion` from `getBreakdown(db, range, "device")`.
- `DayCard` as drawn.

### Task 5: Compose `/website-traffic`
- Order: intro sentence · CampaignTrafficChart · WhatAutumnDid (sidebar beside the chart on desktop, below on phones) · CampaignEfficiencyTable · WeekdayRhythm + DeviceConversion side by side · markets list · glossary.
- Remove the three `SectionPlaceholder`s and `section-placeholder.tsx`.
- Page fetches in one `Promise.all`: `getTrafficByCampaign`, `getRecentEventImpacts(db, range, 5)`, `getCampaignEfficiency`, `getBreakdown(device)`, `getMarkets`, `getDailySeries`.
- Anchors: `#traffic`, `#events`, `#efficiency`, `#rhythm`, `#devices`, `#markets`, so Overview insight cards can deep-link (`anchor: "campaigns"` → `#efficiency`).
- Gate: the efficiency table's footer visits equals the Overview's "Visited your site" for the same range, on the live URL; screenshots at 390 / 1280 / 1728 sent to the owner; Lighthouse ≥ 90 both routes.

### Task 6: Decisions and spec
- `docs/decisions.md`: D29 (second screen = traffic explained through campaigns; the four artboard components dropped and why), D30 (no channels/new-vs-returning/paths/time-of-day until seeded).
- Correct spec §4 in place, dated.

## 4. Fixture values for component tests (from `tests/queries/fixture.ts`, `FIXTURE_RANGE`)

- Efficiency rows: Brand protection `visits 260, spendCents 1700, costPerVisitCents 7, bookings 2, costPerBookingCents 850, bookingValueCents 95050, valuePerVisitCents 366`; Discovery `340, 2800, 8, 1, 2800, 30000, 88`. Total `600, 4500, 8, 3, 1500, 125050, 208`.
- Series (day): Brand protection `[0,60,0,0,150,0,0,0,0,50]`; Discovery `[0,40,0,0,150,0,0,0,0,150]`; one event, id 1, bucket `2026-09-05`, kindLabel "Ads refreshed".
