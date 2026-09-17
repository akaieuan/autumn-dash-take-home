# Decision log

Why the Autumn marketing dashboard looks the way it does, and the test that
would go red if each decision were silently reversed.

**How to use this file.** One row per settled question. A row is `proposed`
until its proving test or gate exists and has been seen to fail once
(CLAUDE.md §6, §10); then it is `verified` with the date. Never delete a row:
a reversed decision gets a `superseded by Dn` note and stays, with its
measurement, so the next reader inherits a decision instead of re-running the
argument. Identifiers are shared with the spec
(`docs/superpowers/specs/2026-09-17-autumn-dashboard-design.md`) and with
CLAUDE.md §12.

Columns: **Decision** (what), **Instead of** (the alternative actually
considered), **Because** (the reason, argued from the customer, the data or
the constraint), **Proven by** (test file, gate, or measurement that depends
on it), **Status**.

## Product

| ID | Decision | Instead of | Because | Proven by | Status |
|---|---|---|---|---|---|
| D1 | The Overview headline is one sentence: bookings, booking value, and what the owner kept after Autumn's fee. | Four equal stat cards led by gross booking value (the reference product). | The owner's first two questions are "did Autumn get me bookings" and "how much revenue"; Autumn charges 11–19% only on attributed bookings, so net is the number that decides whether they stay a customer. The reference product never shows the fee. | `tests/components/headline-card.test.tsx` (sentence, net, both deltas); `tests/queries/overview.test.ts` (fee = value × bps / 10000, net = value − fee, hand-computed). | proposed |
| D2 | The second screen is `/bookings`, "Where your direct bookings come from": direct vs OTA mix, campaigns in plain words, feeder markets, guest behaviour, recent bookings. | Website traffic, mirroring the reference product's second tab. | Traffic explains the funnel; bookings explain the money. The owner's third question ("are the right guests finding me") is answered by markets and campaigns, not by page views. Insight cards on the Overview deep-link into its anchors, so the connection is navigational, not decorative. | `tests/components/insight-list.test.tsx` (anchor links resolve to `/bookings#…`); `tests/seed-generators.test.ts` (every generated anchor is one the page renders); plan Task 12 cross-screen gate (campaign bookings sum equals context-strip bookings). | proposed |
| D3 | Default range is the last 30 days, compared to the previous 30 days and to the same 30 days one year earlier. | Year to date (the reference default). | "What changed since last month" needs the previous period; "is this seasonal or a problem" needs last year. YTD hides both behind a growing denominator. | `tests/date-range.test.ts` (30d default; prev and last-year windows; `ytd` collapses to one comparison; `all` has none). | proposed |
| D4 | Metrics are named in plain language first; the industry term appears once, in parentheses, with a tooltip; click-through rate is shown as "1 in N". | Industry labels with an info icon (CTR, CVR, impressions). | The brief says the owner may not know what CTR or attribution mean. A label they must decode is a label they skip. | `tests/glossary.test.ts` (no bare acronym in any label); `tests/components/campaign-table.test.tsx` (`1 in 3`, no "CTR" text); `tests/components/stat-tile.test.tsx` (label + meaning rendered). | proposed |
| D5 | Chart budget: one trend chart on the Overview; one stacked mix chart plus tables and meters on Bookings. | Six donut charts and two data tables per screen (reference product). | "Do not optimize for showing the most charts." Meters and ranked lists answer "which" faster than a donut, and a single trend with two comparison lines answers "what changed" without a metric picker per card. | Visual gate in plan Task 13 (screenshots reviewed by the owner); the component library has no donut/pie component to reach for. | proposed |
| D6 | Autumn's fee is shown at 15% of attributed booking value, stored per property in `fee_rate_bps`. | Hiding the fee; or a flat monthly figure. | The published model is pay-for-performance at 11–19%; 15% is the midpoint and one column to change. Showing it builds the trust the brief asks for. | `tests/queries/overview.test.ts` (`feeCents: 27000` on `180000` at 1500 bps); `tests/queries/bookings.test.ts` (per-campaign fee). | proposed |
| D7 | Light theme only, warm paper palette measured from findautumn.com, one sage accent. | shadcn's dark-dashboard default (recommended by the `vercel:shadcn` skill). | The brief asks for calm and hospitality-native; the company's own site is paper-white. A dark analytics theme reads as an ad platform, the thing the brief says to avoid. | `src/app/globals.css` has no `.dark` block (grep gate in plan Task 13); contrast measured ≥ 4.5:1 for muted text on card. | proposed |
| D8 | One seeded property: Harbor House Inn, South Haven, Michigan, 22 rooms, Chicago drive market. | A generic "Hotel A" with flat demand. | The reference screenshots show Chicago, South Haven and Detroit as feeder markets, so the geography is already Autumn's. A lakeshore inn has strong, explainable seasonality, which makes trend and year-over-year views believable. | `tests/seed-profile.test.ts` (July > 2× January; weekend > weekday; holiday spikes; ADR band). | proposed |
| D9 | Data window 2024-09-17..2026-09-16 (730 days) with Autumn starting 2025-02-03. | 720 days all under Autumn. | A 4.5-month pre-Autumn baseline lets the owner see the before/after that the marketing site promises ("trust the work"), and two full summers make the year-over-year comparison real rather than partial. | `tests/seed-generators.test.ts` (≥ 720 distinct days; no Autumn rows before the start date; direct share rises from < 34% to > 46%). | proposed |
| D10 | "Today" is `MAX(date)` in the database, never the wall clock. | `new Date()`. | The deployed app must be correct whenever it is opened, weeks after seeding, with no cron or reseed. | `tests/date-range.test.ts` (`to === dataMax`); `tests/queries/overview.test.ts` (`getDataBounds` returns min/max from rows). | proposed |

## Engineering

| ID | Decision | Instead of | Because | Proven by | Status |
|---|---|---|---|---|---|
| D11 | Next.js 16 App Router with Server Components fetching directly through Drizzle; no REST layer; one client component for the range control and one per chart. | Client-side fetching with React Query, or Route Handlers. | Two screens of read-only aggregates are the textbook Server Component case: no waterfall, secrets stay on the server, and the URL carries all state so links are shareable. Route Handlers would add a layer nothing else consumes. | `npm run build` lists both routes as dynamic server-rendered; no `app/api` directory exists; component tests render without a network mock. | proposed |
| D12 | Neon Postgres over the HTTP driver, with Drizzle ORM and generated migrations. | Supabase, MongoDB, or SQLite-on-disk. | The data is relational and the screens are aggregates; Postgres does `sum`/`count … filter` natively. Neon's free tier, HTTP driver and Vercel Marketplace listing make deploy a single env var. The schema is driver-agnostic, so Supabase would be a one-file swap. | `tests/queries/schema.test.ts` (migration applies cleanly in PGlite); `npm run db:migrate` on Neon; `db:verify` line matches `db:seed` line. | proposed |
| D13 | Query tests run against PGlite (in-process Postgres) using the generated migration and a hand-computed fixture. | Mocking Drizzle, or testing only against Neon. | A mocked query cannot fail for a SQL reason; a Neon-only test needs a secret in CI and pays network latency per case. PGlite runs the real migration, so the schema is tested too. | `tests/queries/*.test.ts` (13 cases; negative control recorded in the Task 6 commit: dropping the `source` filter reddens `directShare`). | proposed |
| D14 | Money is integer cents everywhere below the render layer; formatting happens only in `src/lib/format.ts`. | Floating dollars in the DTOs. | Sums of floats drift; cents sum exactly and the fee/net arithmetic stays integer. One formatter means one place to change currency display. | `tests/format.test.ts`; `tests/queries/overview.test.ts` (`netCents` exact); ESLint rule (plan Task 13) forbidding `Intl.NumberFormat` outside `format.ts`. | proposed |
| D15 | The seed is deterministic (mulberry32, seed `20260917`), truncates and re-inserts, and prints an acceptance line that `db:verify` re-derives from `count(*)`/`MIN`/`MAX`. | Random seed; append-only inserts; a boolean "seeded ok". | Repeatable setup is part of what is being judged. A derived line that a partial insert could not produce is the cheapest proof the database matches the generator. | `tests/seed-generators.test.ts` (two runs identical); `npm run db:seed` and `npm run db:verify` printing the same line (recorded in the Task 5 commit body). | proposed |
| D16 | Campaign daily metrics derive their `bookings` and `booking_value` from the bookings rows, not from an independent random draw. | Generating each table independently. | The two screens must never disagree. If the campaign table and the headline are computed from the same rows, they cannot. | `tests/seed-generators.test.ts` ("campaign metric bookings equal attributed booking rows per day and campaign"); plan Task 12 cross-screen gate. | proposed |
| D17 | Insights are generated by the seed from the actual rows, month by month, with kinds `win` / `watch` / `action`. | Hand-written insight copy; or a runtime insight engine. | Hand-written insights drift from the numbers. A runtime engine is out of scope. Deriving them at seed time keeps the narrative true to the data and keeps "what is Autumn doing about it" answerable. | `tests/seed-generators.test.ts` (an insight month for every month after start; anchors valid); `tests/components/insight-list.test.tsx` (kinds rendered in plain words; empty state explicit). | proposed |
| D18 | Component library is separate from routes: `src/components/<area>/index.ts` barrels, DTO-typed props, no data fetching in components; `components/ui` is CLI-owned and has no barrel. | Colocating components under `app/`, or a single global barrel. | Pages that only compose are easy to read and to re-plan; DTO types are the contract that lets components be tested with fixtures. Per-area barrels keep imports clean without a single module that drags every component into every route's graph. | Component tests import from barrels; grep gate in plan Task 13: no `@/lib/db` import under `src/components`; no imports of `@/components/**/file` from `src/app`. | proposed |
| D19 | Trend buckets are aggregated in TypeScript over a per-day map rather than `date_trunc` in SQL. | `date_trunc('week', …)`. | A "last 90 days" view should bucket from its first day, not snap to Monday boundaries the owner did not pick. Rows per query are ≤ 730, so the cost is negligible. | `tests/queries/overview.test.ts` (aligned buckets by index; week buckets start on `from`). | proposed |
| D20 | Overview streams its trend, insights and preview behind Suspense; Bookings runs six queries in one `Promise.all`. | Streaming everything, or nothing. | The Overview's headline is the answer and should paint first; its trend is the slowest query. Bookings' sections are all above the fold on desktop, so one round-trip is faster than five boundaries. | Measured on Neon in plan Task 14 (record TTFB and the trend query time here). | proposed |

## Rejected with measurement

Record here anything tried and dropped, with the number that decided it.

| Date | Tried | Result | Kept instead |
|---|---|---|---|
| — | — | — | — |

## Open questions for the owner

| ID | Question | Readings | Blocking? |
|---|---|---|---|
| D2 | Prefer website traffic as the second screen? | Bookings attribution (chosen) vs traffic funnel. Schema supports both; plan Tasks 11–12 would change. | No — default proceeds |
| D6 | Fee percentage to display. | 15% (chosen) vs any value in the published 11–19% range. One column. | No |
| D12 | Neon vs Supabase. | Same schema and seed either way; driver import changes. | No |
