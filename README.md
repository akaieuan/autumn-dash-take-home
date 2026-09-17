# Autumn marketing dashboard

A calm, plain-language marketing dashboard for an independent-hotel owner,
answering one question: **is Autumn helping my hotel get more direct bookings
and revenue?** Two connected screens, an Overview and a Website Traffic detail, read
live from a hosted Postgres database seeded with two years of believable
hotel-marketing data.

- Live: https://autumn-dash-take-home.vercel.app (Overview at `/`, second screen at `/website-traffic`)
- Stack: Next.js 16 (App Router, Server Components), React 19, TypeScript,
  Tailwind 4, shadcn/ui, Recharts, Drizzle ORM, Supabase Postgres, Vitest, Vercel.

## Start here if you are reviewing this

- **[The decision log](https://github.com/akaieuan/autumn-dash-take-home/blob/main/docs/decisions.md)** —
  every decision in this repo, the alternative it was chosen over, the reason
  argued from the hotel owner and the data, and the test that would fail if it
  were silently reversed. Grouped by theme: what the owner sees, the data
  and how it is generated, and how the code is put together, with superseded
  rulings and rejected approaches kept at the end with the number that
  decided each. This is the document to read for "why".
- **[The operating contract](https://github.com/akaieuan/autumn-dash-take-home/blob/main/CLAUDE.md)** —
  how work was done: what a change must prove before it is called done, and
  the invariants the codebase keeps.
- **[The brief](https://github.com/akaieuan/autumn-dash-take-home/blob/main/docs/reference/take-home-brief.txt)**
  as received, for reference.
- **[The design system](https://autumn-dash-take-home.vercel.app/design-system)**,
  live: every token, primitive, atom, molecule and organism rendered from the
  real components with fixture data, so the pieces can be judged on their own
  before they are judged in the page.

## Before and after

The screens Autumn gave in the brief, beside the redesign of each. The
originals are unedited in `docs/reference/`; the new ones are the deployed
site.

| The current marketing dashboard | The new Overview |
|---|---|
| ![Current Autumn marketing dashboard](docs/reference/current-dashboard-overview.png) | ![New Overview](public/screenshots/overview-desktop.png) |

| The current website-traffic tab | The new Website traffic |
|---|---|
| ![Current Autumn website-traffic tab](docs/reference/current-dashboard-website-traffic.png) | ![New Website traffic](public/screenshots/traffic-desktop-dark.png) |

## Run it locally

Requires Node 24 and a Postgres database. The instructions assume Supabase's
free tier; any Postgres works with the same commands.

**1. Install**

```bash
npm install
```

**2. Create a database.** In Supabase, create a project, then open
**Connect → Connection String**. Copy two strings into a new `.env` file
(never committed; `.env.example` shows the shape):

```
DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?sslmode=require"
DIRECT_URL="postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres?sslmode=require"
```

`DATABASE_URL` is the **Transaction pooler** (port 6543), used by the app
and the seed. `DIRECT_URL` is the **Session pooler** (port 5432), used only to
run migrations. Keep `?sslmode=require` on both; Supabase refuses plain
connections.

**3. Create the tables**

```bash
npm run db:migrate
```

Applies the generated migrations in `drizzle/` (four tables, two indexes,
two foreign keys, two check constraints).

**4. Seed 730 days of data**

```bash
npm run db:seed
```

Wipes all four tables and inserts a deterministic two-year dataset. It prints one
line that a partial or wrong run could not produce:

```
Seeded 730 days 2024-09-17..2026-09-16: 730 daily rows, 12286 breakdown rows, 918 bookings, $408745.44 booking value, $29521.54 ad spend, 4 campaigns, 24 events
```

Running it again produces byte-identical rows; the generator is seeded with a
fixed constant.

**5. Verify the database matches the generator**

```bash
npm run db:verify
```

Re-derives the same line from the live tables with `count`, `min`, `max` and
`sum`, then checks that every breakdown dimension sums exactly to the daily
totals for all four metrics. Exits non-zero if fewer than 720 days exist or a
dimension does not reconcile.

**6. Start the app**

```bash
npm run dev
```

## Repo structure

Pages compose, components render, queries fetch. That rule decides where
everything lives.

```
src/
  app/
    (dashboard)/            the product; the group's layout owns the sidebar frame
      page.tsx              Overview
      website-traffic/      the second screen
      loading.tsx, error.tsx
    design-system/          every token, primitive and component, from the real code
    layout.tsx, globals.css, not-found.tsx
  components/
    ui/                     shadcn primitives, owned by the CLI
    layout/ copy/ charts/   atoms and molecules shared by both screens
    dashboard/              the Overview's organisms
    website-traffic/        the traffic screen's organisms
    assistant/              the Ask Autumn popover
    design-system/          the sections of the design-system page
  lib/
    db/
      schema.ts             the four tables
      client.ts             Supabase over postgres-js, opened on the first query
      queries/              one module per screen; each returns typed view models
    date-range.ts           a URL preset becomes dates, anchored on the last day with data
    format.ts               the only place money, percentages and dates are formatted
    glossary.ts             every plain-language label and definition
    insights.ts             the "What's happening" rules; pure, no database
    property.ts             the constants that are the owner's to change
    activity.ts, navigation.ts, sidebar.ts, theme.ts   calendar, nav, sidebar state, theme
scripts/
  seed/                     the deterministic generator: profile, events, apportionment
  db-migrate.ts             applies drizzle/ through the app's own client
  db-verify.ts              re-measures the seed from the live database
drizzle/                    generated migrations; never hand-edited
tests/                      Vitest: pure logic, the seed, queries against an in-memory Postgres, component renders
docs/
  decisions.md              the decision log
  reference/                the brief, findautumn.com notes, the before screenshots
  superpowers/              the design spec and implementation plans
public/screenshots/         the after screenshots
CLAUDE.md                   the operating contract
```

## The data model

Two metric tables at two grains, plus two small reference tables. The full
reasoning is in [docs/decisions.md](docs/decisions.md) (D21–D28).

| Table | Grain | Columns |
|---|---|---|
| `daily_metrics` | one row per day; `date` is the primary key | `impressions`, `clicks`, `website_visits`, `bookings`, `booking_value numeric(10,2)`, `new_visitors`, `site_sessions`, `pageviews`, `pages_per_session numeric(4,2)`, `spend numeric(10,2)` |
| `breakdowns` | one row per day per dimension value | `date` (FK), `dimension` ∈ `campaign` \| `device` \| `feeder_market` (check constraint), `dimension_value`, `impressions`, `clicks`, `bookings`, `booking_value`, `spend`; index on `(date, dimension)` |
| `campaigns` | one row per campaign | `name` (matches `dimension_value`), `objective`, `focus`, `launched_on`, `status`, `monthly_budget` |
| `campaign_events` | one row per thing Autumn did | `date`, `campaign_name` (FK, null = whole program), `kind` ∈ launched \| budget_change \| copy_refresh \| bid_change \| seasonal_push, `title`, `note` |

- `daily_metrics` is the source of truth; every headline and trend reads it.
- `breakdowns` is derived from each day's totals by exact apportionment, so
  campaigns, devices and feeder markets each add up to the day to the cent.
- One generic `breakdowns` table serves three structurally identical sections
  with one seeding function and one query shape.
- There is no insights table. Insights are computed at render time from
  `daily_metrics` (`src/lib/insights.ts`), so they can never disagree with the
  numbers beside them.
- Events cause the data: the seed applies each `campaign_events` effect (a
  budget raise, a copy refresh, a seasonal push) to the generator from that
  date, so "the four weeks since the refresh vs the four weeks before" is a
  real comparison, not a caption.

## How the seed stays believable

Generated in `scripts/seed/`, daily totals first, then breakdowns.

- **Seasonality:** a Lake Michigan inn's demand curve (July 1.0, January 0.42,
  a fall-colour bump in October), weekday effects, and holiday spikes.
- **Program shape:** an eight-week ramp to full delivery, +22% per year
  compounding, and 24 dated events (launches, budget and bid changes, ad
  refreshes, seasonal pushes) whose effects the generator applies from their
  dates. July 2025 to July 2026 bookings go 54 → 78.
- **Rates in the reference dashboard's bands:** blended click-through 16%,
  conversion 4%, average booking about $445, rising with the season; ad spend
  about 7% of booking value against Autumn's 15% fee.
- **Campaign character:** Brand Protection clicks through about twice as well
  as Discovery; Google Hotel Ads and Retargeting launch in stages.
- **Guests:** ten feeder markets weighted toward Chicago (heavier on weekends);
  mobile leads devices and drifts up over time.

Each of these is pinned by a test in `tests/seed-generators.test.ts`.

## Gates

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

Query tests run against an in-process Postgres (PGlite) using the real
migration and a hand-computed fixture, so no database is needed to run the
suite.

## The two screens

Screenshots are of the deployed site, in `public/screenshots/`.

### Overview · `/`

One sentence answers the owner's question, and everything below it earns
that sentence's trust.

- **The headline.** Direct bookings, their value, and what the owner kept after
  Autumn's 15% fee, with the fee itself stated and two comparisons: the
  previous period and the same period last year.
- **Four quick stats** with sparklines: direct bookings, booking value, visited
  your site, saw your hotel.
- **Day by day.** One trend chart, this period in green and the period before
  in amber, last year dashed. Area, bars or line; chart or table; any metric.
- **What's happening.** Insights computed at render time from the same numbers
  on the page, tagged Win, Watch, or Autumn is on it, each with its own
  evidence bars so nothing is asserted without being shown.
- **Where your guests come from.** Cities ranked by bookings, with drive times.
- **What each campaign is doing.** A plain purpose line per campaign, "1 in N"
  instead of a click-through rate, and a footer that reconciles to the headline.
- **From seen to booked**, the glossary in plain words, and **Ask Autumn**.
- Light and dark themes; a phone layout that keeps the sentence first.

![Overview on desktop](public/screenshots/overview-desktop.png)

| Phone: the headline | Phone: what's happening |
|---|---|
| ![Overview on a phone, headline](public/screenshots/overview-mobile-headline.png) | ![Overview on a phone, insights](public/screenshots/overview-mobile-insights.png) |

![Day by day beside what's happening](public/screenshots/overview-trend-and-insights.png)

![Day by day as bars, with the three-period tooltip](public/screenshots/overview-trend-bars-tooltip.png)

![Where guests come from, and what each campaign is doing](public/screenshots/overview-markets-and-campaigns.png)

![From seen to booked, the glossary, and Ask Autumn](public/screenshots/overview-funnel-glossary-ask-autumn.png)

### Website traffic · `/website-traffic`

Traffic explained through the campaigns that produce it, so an owner can
decide the next campaign rather than read analytics.

- **Every day people visited.** A year of days as a calendar; point at a day to
  read it, click to keep it open, and see it against a typical weekday.
- **Visits by campaign.** Visits stacked by campaign, with each change Autumn
  made marked on the day it happened.
- **What Autumn did.** Each change with the days before and after it: visits,
  how many clicked, bookings, value.
- **Where the next dollar goes.** Cost per visit, cost per booking, how many
  booked, and value per visit, per campaign; the total row reads the daily
  totals, never a sum of the rows.
- **Which days are busiest**, and **what they visit on, and what books.**

![Website traffic, dark theme](public/screenshots/traffic-desktop-dark.png)

![Visits by campaign, and what Autumn did](public/screenshots/traffic-visits-by-campaign.png)

![Where the next dollar goes](public/screenshots/traffic-next-dollar.png)

![Which days are busiest, and what they visit on](public/screenshots/traffic-weekdays-and-devices.png)

## Design process

The first sketch was drawn in [Blockpad](https://github.com/akaieuan/blockpad),
my own storyboard tool. It fixed the shape before any component existed: a
sentence, a row of cards kept close to the current product, and one main chart
the owner can restyle.

![Wireframe sketch, drawn in Blockpad](public/screenshots/design-wireframe.png)

Two artboards then grew it into a user story, the data contract, an atomic
component library, and each page at three widths. The second board also holds
the anatomy of the activity calendar and the seven components that only make
sense on the traffic screen.

| Overview artboard | Website traffic artboard |
|---|---|
| ![Overview design artboard](public/screenshots/design-artboard.png) | ![Website traffic design artboard](public/screenshots/design-artboard-traffic.png) |

## What I learned, and what I would do next

The full record is in [docs/decisions.md](docs/decisions.md); these are the
parts I would bring up first.

**What I learned**

- **A before-and-after comparison is not proof of cause.** The first
  causality test compared the weeks either side of an ad-copy refresh. An
  untouched control campaign moved 2.8% across the same date while the
  campaign with the real effect moved 0.6%: the test was reading season and
  weekday mix, and it broke the moment the random stream shifted. The fix
  was to regenerate the dataset with one effect switched off and compare the
  two runs (D30). Every "what Autumn did" card on the traffic screen rests on
  that.
- **Small counts break the obvious sampling.** With about one booking a day,
  a coin-flip per day hid a 22% annual trend behind noise (D25), and
  largest-remainder rounding handed every single booking to the biggest
  market, leaving eight of ten at zero over a month (D22). Both were caught
  by tests that pin a shape ("July beats January", "no market is empty")
  rather than a number.
- **A rate stored without its denominator cannot be re-aggregated.** Pages
  per visit was an average of daily averages until a test showed 3.5 where
  the true figure was 3.68 (D29). The daily table now stores both counts.
- **Derived facts belong in code, not in tables.** The spec started with
  eight tables including a stored insights table. Two metric tables at two
  grains, with insights computed at render time, removed every way the
  numbers could disagree with the sentence beside them (D21, D24).
- **A seed that prints a derived line is worth more than a green check.**
  The acceptance line the seed prints and the verify script recomputes from
  the live database caught a partial insert on the first hosted run.

**What I would do next, with more time**

- **A per-booking grain.** The two-table model gave up lead time, booking
  hour and a recent-bookings list (D21). Those are the owner's "who booked
  last night?" questions and would be the first table added.
- **Real traffic sources.** Channels, page paths and time of day are on the
  reference product but not in this data, and were not faked (D31). With a
  real analytics feed the traffic screen gains a "where visits come from"
  section without changing its shape.
- **Ask Autumn as a working assistant.** The popover is an honest preview
  of the interaction, wired to nothing. The next step is a model that
  answers over the same query layer the screens use, so it can never quote
  a number the page does not show.
- **Measured performance on the deployed URL.** Query timings are recorded
  (32 to 69 ms warm); Lighthouse scores and time to first byte are not yet,
  and the operating contract asks for both.
- **Negative controls for every decision.** Eleven decisions are marked
  "tested" rather than "verified": the proving test exists but has not been
  deliberately broken once. Finishing that pass is a morning's work and would
  make the log fully falsified.
- **The fee rate as a per-property setting** (D6), the first step toward the
  multi-property switching the contract keeps out of scope.

## Docs

- [CLAUDE.md](CLAUDE.md) — operating contract for any session working here.
- [docs/decisions.md](docs/decisions.md) — every decision, its alternative, its reason, and the test that proves it.
- [docs/superpowers/specs/](docs/superpowers/specs/) and [docs/superpowers/plans/](docs/superpowers/plans/) — design spec and implementation plan.
- [docs/reference/](docs/reference/) — the brief, findautumn.com research notes, and the "before" screenshots.
