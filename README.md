# Autumn marketing dashboard

A calm, plain-language marketing dashboard for an independent-hotel owner,
answering one question: **is Autumn helping my hotel get more direct bookings
and revenue?** Two connected screens, an Overview and a Bookings detail, read
live from a hosted Postgres database seeded with two years of believable
hotel-marketing data.

- Live: _(URL added at deploy)_
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

Applies the generated migration in `drizzle/` (two tables, one index, one
foreign key, one check constraint).

**4. Seed 730 days of data**

```bash
npm run db:seed
```

Wipes both tables and inserts a deterministic two-year dataset. It prints one
line that a partial or wrong run could not produce:

```
Seeded 730 days 2024-09-17..2026-09-16: 730 daily rows, 12286 breakdown rows, 581 bookings, $257770.90 booking value
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

Two tables at two grains. The full reasoning is in
[docs/decisions.md](docs/decisions.md) (D21–D25).

| Table | Grain | Columns |
|---|---|---|
| `daily_metrics` | one row per day; `date` is the primary key | `impressions`, `clicks`, `website_visits`, `bookings`, `booking_value numeric(10,2)`, `new_visitors`, `pages_per_session numeric(4,2)` |
| `breakdowns` | one row per day per dimension value | `date` (FK), `dimension` ∈ `campaign` \| `device` \| `feeder_market` (check constraint), `dimension_value`, `impressions`, `clicks`, `bookings`, `booking_value`; index on `(date, dimension)` |

- `daily_metrics` is the source of truth; every headline and trend reads it.
- `breakdowns` is derived from each day's totals by exact apportionment, so
  campaigns, devices and feeder markets each add up to the day to the cent.
- One generic `breakdowns` table serves three structurally identical sections
  with one seeding function and one query shape.
- There is no insights table. Insights are computed at render time from
  `daily_metrics` (`src/lib/insights.ts`), so they can never disagree with the
  numbers beside them.

## How the seed stays believable

Generated in `scripts/seed/`, daily totals first, then breakdowns.

- **Seasonality:** a Lake Michigan inn's demand curve (July 1.0, January 0.42,
  a fall-colour bump in October), weekday effects, and holiday spikes.
- **Program shape:** an eight-week ramp to full delivery, then +22% per year
  compounding. July 2025 to July 2026 bookings go 39 → 46.
- **Rates in the reference dashboard's bands:** blended click-through 16%,
  conversion 4%, average booking $444, rising with the season.
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

## Docs

- [CLAUDE.md](CLAUDE.md) — operating contract for any session working here.
- [docs/decisions.md](docs/decisions.md) — every decision, its alternative, its reason, and the test that proves it.
- [docs/superpowers/specs/](docs/superpowers/specs/) and [docs/superpowers/plans/](docs/superpowers/plans/) — design spec and implementation plan.
- [docs/reference/](docs/reference/) — the brief, findautumn.com research notes, and the "before" screenshots.
