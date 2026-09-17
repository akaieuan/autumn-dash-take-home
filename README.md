# Autumn marketing dashboard

A calm, plain-language marketing dashboard for an independent-hotel owner,
answering one question: **is Autumn helping my hotel get more direct bookings
and revenue?** Two connected screens, an Overview and a Website Traffic detail, read
live from a hosted Postgres database seeded with two years of believable
hotel-marketing data.

- Live: https://autumn-dash-take-home.vercel.app (Overview at `/`, second screen at `/website-traffic`)
- Stack: Next.js 16 (App Router, Server Components), React 19, TypeScript,
  Tailwind 4, shadcn/ui, Recharts, Drizzle ORM, Supabase Postgres, Vitest, Vercel.

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

Wipes both tables and inserts a deterministic two-year dataset. It prints one
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

## Screenshots

**Before: the current Autumn dashboard**, as given in the brief. Extracted
from the take-home PDF and kept unedited in `docs/reference/`.

| Marketing dashboard | Website traffic |
|---|---|
| ![Current Autumn marketing dashboard](docs/reference/current-dashboard-overview.png) | ![Current Autumn website-traffic tab](docs/reference/current-dashboard-website-traffic.png) |

**After: the redesign**, in `docs/screenshots/`. Both screens, both themes,
desktop and phone.

| | Light | Dark |
|---|---|---|
| Overview | `overview-desktop.png` · `overview-mobile.png` | `overview-desktop-dark.png` · `overview-mobile-dark.png` |
| Website traffic | `traffic-desktop.png` · `traffic-mobile.png` | `traffic-desktop-dark.png` · `traffic-mobile-dark.png` |

## Docs

- [CLAUDE.md](CLAUDE.md) — operating contract for any session working here.
- [docs/decisions.md](docs/decisions.md) — every decision, its alternative, its reason, and the test that proves it.
- [docs/superpowers/specs/](docs/superpowers/specs/) and [docs/superpowers/plans/](docs/superpowers/plans/) — design spec and implementation plan.
- [docs/reference/](docs/reference/) — the brief, findautumn.com research notes, and the "before" screenshots.
