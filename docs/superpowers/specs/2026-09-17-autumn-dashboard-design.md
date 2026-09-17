# Autumn marketing dashboard — design spec

Date: 2026-09-17. Owner: Ieuan King. Status: awaiting owner review.
Brief: `docs/reference/take-home-brief.txt`. Site notes: `docs/reference/findautumn-site-notes.md`.

## 1. The ask, verbatim, and the reading taken

> "Design and build a new marketing dashboard with two connected screens, live
> and deployed ... The dashboard must actually fetch and render data from the
> database ... at least 720 days of plausible, meaningful marketing data ...
> The redesigned dashboard should be less intimidating and less overwhelming."

Reading taken: two screens, one hosted Postgres, one deterministic seed script,
one live URL, plain-language everywhere. The rubric is product judgment,
design craft, engineering quality, data realism. Every decision below is
justified against the owner-operator's six questions from the brief:

1. Did Autumn help me get more direct bookings?
2. How much revenue did that create?
3. Are the right guests finding my property?
4. What changed since last month?
5. Is anything concerning?
6. What is Autumn doing about it?

Owner's instructions from the kickoff message: Next.js app structure with good
server-side data management; a component library separated from pages and
app structure with clean imports; shadcn + Tailwind; plan first.

## 2. Decisions (product-judgment values, the owner's to change)

Short form. The reasoning and the proving test for every row, plus the
engineering decisions D11–D20, live in `docs/decisions.md` under the same IDs.

| # | Decision | Chosen | Why | Alternative considered |
|---|---|---|---|---|
| D1 | Headline of screen 1 | "Autumn brought you **N direct bookings** worth **$X** this period — you kept **$Y** after Autumn's fee" | Answers Q1 and Q2 in one sentence; the fee is the thing the current dashboard hides and the thing an owner paying 11–19% actually wants to see | Gross booking value only (current product) |
| D2 | Second screen | `/bookings` — "Where your direct bookings come from" | Q3 and Q1 one level deeper: mix vs OTA, campaign categories in plain words, feeder markets, guest behaviour | Website traffic (matches current tab, but explains the funnel not the money) |
| D3 | Default date range | Last 30 days vs previous 30 days vs same 30 days last year | Q4 needs two comparisons: "since last month" and "is this seasonal" | YTD (current product; hides seasonality) |
| D4 | Metric vocabulary | Plain names first, industry term in parentheses once, glossary tooltip | Q-list says owners may not know CTR/CVR/attribution | Industry terms with info icons (current product) |
| D5 | Chart budget | Screen 1: one trend chart. Screen 2: one mix-over-time chart, one campaign table, bars/meters for the rest | "Do not optimize for the most charts" | Six donuts (current traffic tab) |
| D6 | Fee rate | 15% of attributed booking value, stored per property | Middle of the published 11–19% | — |
| D7 | Theme | Light, warm paper, sage accent (site tokens) | Hospitality-native, calm | shadcn dark dashboard default |
| D8 | Seeded property | Harbor House Inn, South Haven MI, 22 rooms | Matches the reference's Chicago/South Haven/Detroit feeder markets; strong lake seasonality makes trends believable | Generic "Hotel A" |
| D9 | Data window | 2024-09-17 → 2026-09-16 (730 days), Autumn start 2025-02-03 | ≥720 days; a 4.5-month pre-Autumn baseline makes "trust the work" visible; two summers make YoY real | 720 days all with Autumn |
| D10 | "Today" | `MAX(date)` in the database | The demo never decays; the grader can open it in a month | Wall clock |

## 3. Screen 1 — `/` Overview ("How Autumn is doing for you")

Order top to bottom, each block earning its place by a question number.

1. **Header.** Property name, "Marketing overview", date-range control
   (30d · 90d · YTD · 12m · All), "Data through 16 Sep 2026". Nav: Overview ·
   Bookings. Mobile: nav collapses to two tabs.
2. **Headline card (Q1, Q2).** Big sentence per D1. Three deltas underneath in
   words: "+18% vs previous 30 days · +42% vs this time last year". One
   sub-line: "Autumn's fee this period: $Z (15% of bookings we brought you)".
   Visual weight: this is the only large type on the page.
3. **Three supporting tiles (Q1, Q3).** Each: plain label, value, one-line
   meaning, glossary tooltip.
   - **Booked direct** — share of all bookings that came direct vs through
     OTAs. "Direct bookings keep the commission in your pocket."
   - **Guests reached** — people who saw your hotel in Google (impressions) →
     visited your site (clicks). Shown as "12,400 saw you · 1,050 visited".
   - **Cost per booking** — Autumn fee ÷ bookings; contrasted with the average
     OTA commission on the same booking value ("vs ~$54 an OTA would charge").
4. **Trend (Q4).** One chart. Metric selector: Booking value (default) ·
   Direct bookings · Site visits. Current period solid, prior period dotted
   muted, last-year dashed lighter. Granularity from range: day (≤90d),
   week (≤12m), month (all). A vertical marker "Autumn started" when in range.
5. **What's happening (Q5, Q6).** Three to five insight cards from the
   `insights` table for the period, each tagged **Win** / **Watch** /
   **Autumn is on it**, with a title, one sentence of explanation, and where
   relevant a link into `/bookings#section`.
6. **Where bookings come from (Q3) — preview.** Two compact lists: top three
   feeder markets by bookings, top campaign category by bookings, each with a
   meter bar. One link: "See the full picture →" to `/bookings`.
7. **Understand these numbers.** Accordion with the glossary entries used on
   this page. Collapsed by default.

Nothing else. No device table, no funnel table, no events donut.

## 4. Screen 2 — `/bookings` Where your direct bookings come from

Shares the header and range. Sections, with anchors used by insight links:

1. **Context strip.** Repeats: direct bookings, booking value, direct share
   (small, so the owner stays oriented — the one thing the current product
   does well).
2. **`#mix` Direct vs OTA over time.** Stacked bars by period: "Direct via
   Autumn" (sage), "Direct — other" (sage light), "OTA" (sand). Caption states
   the commission saved: "Direct bookings saved you about $N in OTA commission".
3. **`#campaigns` What each campaign is doing.** Table, one row per category,
   plain name + one-line purpose (from `glossary.ts`), then: times shown,
   visits, bookings, booking value, Autumn fee. No CTR column; CTR appears in
   the row's tooltip as "1 in 12 people who saw this clicked".
4. **`#markets` Where guests come from.** Ranked feeder markets with bookings,
   booking value, share meter, and drive-time hint ("2 h 15 from Chicago").
5. **`#guests` How guests book.** Three small panels: device (phone / computer /
   tablet as horizontal bars), lead time buckets (0–7, 8–30, 31–90, 90+ days),
   time of day (four bands). Each with one sentence of meaning.
6. **`#recent` Recent direct bookings.** Last ten rows: booked date, stay
   dates, nights, market, source, value. Anonymised (no guest names).

## 5. Architecture

```
src/
  app/                      routes only (compose; no SQL, no formatting)
    layout.tsx              fonts, TooltipProvider, AppShell
    page.tsx                Overview: awaits searchParams → parseRange → queries → components
    bookings/page.tsx       Detail: same shape
    loading.tsx, error.tsx, not-found.tsx
    globals.css             Tailwind 4 + shadcn tokens + brand variables
  components/
    ui/                     shadcn primitives (CLI-owned)
    layout/                 AppShell, TopNav, DateRangeControl, PageHeader, Section
    dashboard/              HeadlineCard, StatTile, TrendChart, InsightList, SourcePreview, Glossary
    bookings/               ContextStrip, SourceMixChart, CampaignTable, FeederMarketList, GuestBehaviour, RecentBookings
    charts/                 chartConfig (colours), ChartFrame, axis/tooltip formatters
    copy/                   MetricLabel (label + glossary tooltip), DeltaText
    index.ts per folder     barrel; pages import `@/components/<folder>`
  lib/
    db/client.ts            neon() + drizzle(); throws a readable error if DATABASE_URL missing
    db/schema.ts            tables, enums, relations
    db/queries/overview.ts  getOverview, getTrend, getInsights, getSourcePreview
    db/queries/bookings.ts  getSourceMix, getCampaignBreakdown, getFeederMarkets, getGuestBehaviour, getRecentBookings
    db/queries/meta.ts      getDataBounds (min/max date, property)
    date-range.ts           parseRange(param, dataMax) → DateRange (from, to, prev, lastYear, granularity, label)
    format.ts               money(cents), pct, compact, dateLabel, delta
    glossary.ts             { key, label, industryTerm?, meaning, purpose? } per metric and campaign category
scripts/
  seed/index.ts             truncate, generate, batch-insert, print acceptance line
  seed/rng.ts               mulberry32 + helpers (deterministic)
  seed/profile.ts           seasonality curve, weekday curve, holidays, Autumn ramp
  seed/generate-*.ts        campaigns, traffic, bookings, insights
  db-verify.ts              reads live DB, prints the same acceptance line
drizzle/                    migrations (generated)
tests/                      *.test.ts (Vitest), tests/queries/* use PGlite + schema
```

### Data flow

Server Components fetch directly with Drizzle (no API layer). `page.tsx`
awaits `searchParams`, resolves `getDataBounds()` once, then `Promise.all`s
the screen's queries, and passes DTOs to components. The date-range control is
a small client component that writes `?range=` with `router.push`; everything
else is server-rendered. Streaming: the headline and tiles render in the
first flush; the trend and insights sit behind `<Suspense>` with skeletons.
Route Handlers are not needed. `'use cache'` is not enabled for v1 (data
changes only when reseeded; Neon HTTP queries are ~50–150 ms); recorded as a
follow-up if timings say otherwise.

### Data model (Drizzle, Postgres)

> **Corrected 2026-09-17 (owner ruling, decisions D21–D25).** The eight-table
> model below was replaced by two tables at two grains before any code was
> written. What is live is in `src/lib/db/schema.ts` and `drizzle/0000_*.sql`:
>
> - `daily_metrics` — one row per day, `date` primary key: `impressions`,
>   `clicks`, `website_visits`, `bookings`, `booking_value numeric(10,2)`,
>   `new_visitors`, `pages_per_session numeric(4,2)`.
> - `breakdowns` — one row per day per dimension value, `dimension` ∈
>   `campaign | device | feeder_market` (check constraint), `dimension_value`
>   text, plus `impressions`, `clicks`, `bookings`, `booking_value`; index on
>   `(date, dimension)`; FK to `daily_metrics(date)`.
> - No `insights` table: computed at render time from `daily_metrics`.
> - Money is `numeric` dollars in the database (owner's schema) and is
>   converted to integer cents at the query boundary.
>
> Consequences for the screens: §4's direct-vs-OTA mix, lead-time, booking-hour
> and recent-bookings sections are dropped (no bookings grain). §4 becomes:
> context strip · campaigns in plain words · feeder markets · devices ·
> engagement (website visits, new visitors, pages per session) trend. The seed
> generates daily totals first (season × weekday × holiday × eight-week ramp ×
> +22 %/yr growth), then splits each day across dimension values by exact
> apportionment. The original text is kept below for the record.

| Table | Grain | Key columns |
|---|---|---|
| `properties` | one row | `id`, `name`, `city`, `region`, `room_count`, `autumn_start_date`, `fee_rate_bps` (1500), `timezone` |
| `campaigns` | 4 rows | `id`, `property_id`, `category` enum `brand_protection \| discovery \| hotel_ads \| retargeting`, `name`, `started_on` |
| `daily_campaign_metrics` | day × campaign × device | `date`, `campaign_id`, `device` enum `mobile \| desktop \| tablet`, `impressions`, `clicks`, `spend_cents` (Autumn-funded, shown nowhere but kept for realism), `bookings`, `booking_value_cents` |
| `daily_site_traffic` | day × channel × device | `date`, `property_id`, `channel` enum `paid_search \| organic_search \| direct \| ota_referral \| social \| email \| ai_search \| referral`, `device`, `sessions`, `new_visitors`, `pageviews`, `engaged_sessions` |
| `hourly_site_traffic` | day × hour | `date`, `property_id`, `hour`, `sessions` |
| `feeder_markets` | ~10 rows | `id`, `property_id`, `city`, `region`, `country`, `drive_minutes` nullable, `weight` |
| `bookings` | one row per booking | `id`, `property_id`, `booked_at` timestamptz, `check_in`, `check_out`, `nights`, `room_revenue_cents`, `source` enum `direct_autumn \| direct_other \| ota`, `campaign_id` nullable (set when `direct_autumn`), `feeder_market_id`, `device`, `lead_time_days` |
| `insights` | ~3–6 per month | `id`, `property_id`, `period_start`, `period_end`, `kind` enum `win \| watch \| action`, `title`, `body`, `link_anchor` nullable, `sort` |

Row estimates: campaign metrics 730×4×3 = 8,760 (pre-Autumn days have zero
rows for campaigns not started); traffic 730×8×3 = 17,520; hourly 17,520;
bookings ≈ 4,500–5,500; insights ≈ 100. Indexes on every `date` and on
`bookings(booked_at)`, `bookings(source)`.

Derived, never stored: direct share, fee (`value × fee_rate_bps / 10000`),
cost per booking, commission saved (`ota_rate` constant 18% applied to
direct value), CTR, conversion.

### Seed realism rules (what makes it "not random noise")

- **Seasonality:** monthly demand multipliers for a Lake Michigan inn
  (Jan 0.35 … Jul 1.00, Aug 0.95, Oct 0.70 fall colour, Dec 0.40 with a
  Christmas-week bump). Weekend multiplier 1.35 Fri/Sat. Holiday spikes:
  Memorial Day, July 4, Labor Day, Thanksgiving, Christmas–New Year.
- **ADR** follows season: $150 winter → $265 July; nights 1–4 skewed to 2.
- **Autumn ramp:** before 2025-02-03 no campaign rows, direct share ≈ 28%,
  organic/direct/OTA-referral traffic only. From start, a 10-week ramp to
  steady state; direct share climbs to ≈ 48% by summer 2025 and ≈ 52% in
  2026; `ai_search` channel appears 2025-06 and grows.
- **Campaign character:** brand_protection high CTR (~28%) low volume;
  discovery low CTR (~7%) high impressions; hotel_ads mid; retargeting small.
  Bookings per campaign ∝ clicks × per-campaign conversion, seasonal.
- **Feeder markets:** Chicago 34%, Grand Rapids 14%, Detroit 12%,
  Indianapolis 9%, Milwaukee 7%, Kalamazoo 6%, Columbus 4%, St. Louis 3%,
  Toronto 3%, other 8%; Chicago share higher on weekends.
- **Lead time:** log-normal, median 21 days, longer in summer, short for
  retargeting-attributed bookings.
- **Booking hour:** evening-heavy (19:00–22:00), lunchtime bump.
- **Insights are derived from the generated rows** month by month (value vs
  prior month and vs last year, direct share change, top market change, a
  CTR dip → a `watch` plus an `action` "Autumn adjusted bids on …"). So the
  narrative always matches the numbers.
- **Determinism:** mulberry32 seeded with `20260917`; a test asserts two runs
  produce identical first-100 bookings.

### Component library rules

- `components/ui` is shadcn-owned; add with the CLI; theme via tokens only.
- Every domain component: `props` are a DTO type exported from the query
  module (`OverviewDto`, `TrendPointDto`, …) — the type is the contract
  between `lib/db/queries` and `components`.
- Barrels per folder; pages import from barrels; components import
  primitives from `@/components/ui/<name>` directly (no barrel for `ui`, to
  keep Turbopack module graphs small).
- Charts: shadcn `chart` (Recharts) with one `chartConfig` in
  `components/charts`; colours are the brand CSS variables; every chart has
  an accessible title and a text summary sibling.
- Copy: `MetricLabel` renders label + tooltip from `glossary.ts`; no
  component contains metric definitions inline.

### Theme

Tokens in `globals.css` measured from findautumn.com: background `#f2f2f0`,
card `#fbfbfa`, foreground `#1c1b19`, muted-foreground `#5c5b57`, border
`rgba(28,27,25,.10)`, primary (sage) `#6f8b7a`, accent (sand) `#ede0c8`,
secondary (slate) `#6f7e92`. Semantic: positive = sage, watch = warm amber
`#c48a3a`, negative = muted terracotta `#b5563f`, all low-saturation. Radius
`0.75rem`. Font Geist Sans (interface), Geist Mono (numbers in tables).
Optional paper grain at 0.027 opacity on the page background.

## 6. Error handling and empty states

- `DATABASE_URL` missing: `client.ts` throws a one-line error naming the
  variable; `error.tsx` renders a calm card ("We couldn't load your numbers.
  Try again.") with a retry.
- Range with no rows (should not happen with `MAX(date)` anchoring): tiles
  render "—" and the trend shows an empty-state message, not NaN.
- Insights empty for a range: the section shows "Nothing needs your attention
  this period" rather than disappearing (Q5 deserves an explicit answer).
- Query failure inside a Suspense boundary: that section's `error` fallback,
  the rest of the page still renders.

## 7. Testing strategy

- **Pure logic (Vitest):** `date-range` (presets, prev/last-year math,
  granularity thresholds, anchoring on data max), `format` (cents → "$18,685",
  compact, deltas, negative and zero), `glossary` (every metric key used by
  components exists).
- **Seed generators (Vitest):** determinism; seasonality sanity (July demand >
  January); Autumn ramp (no campaign rows before start; direct share after
  summer 2025 > before); totals within plausible bands; ≥ 720 distinct days.
- **Queries (Vitest + PGlite):** load `schema.ts` into PGlite, insert a
  hand-built fixture of ~20 rows, assert each DTO against values computed in
  the test by hand. Negative control: delete the `source` filter → the
  direct-share test goes red.
- **Components (Vitest + Testing Library):** props → visible text for
  HeadlineCard, StatTile, InsightList, CampaignTable.
- **Visual:** browser-pane screenshots at 390 px and 1280 px for both pages,
  sent to the owner. Lighthouse on the deployed URL ≥ 90 perf and a11y.
- **Live gate:** `db:verify`'s printed line equals `db:seed`'s, and the
  default-range headline on the live URL equals the value `db:verify` prints
  for that range.

## 8. Out of scope (explicit)

Auth, multi-property, the Monthly Report and Billing tabs, a map, CSV export,
notifications, dark mode, real Google Ads / GA4 integration, an insight
generator running in production (insights are seeded), i18n.

## 9. Open questions recorded for the owner (assumptions taken)

- A1: Second screen = bookings attribution (D2). If you prefer website
  traffic, tasks 9–11 in the plan change; the schema already supports it.
- A2: Fee shown at 15% (D6). Any published-range value works; it is one column.
- A3: Property identity and geography (D8). Purely cosmetic to change.
- A4: Neon as the hosted Postgres. Supabase would work with the same Drizzle
  schema by swapping the driver; the seed and queries do not change.
