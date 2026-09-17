# Decision log

This file explains why the Autumn marketing dashboard looks and works the way
it does. It is written for someone reviewing the project who has not read the
code yet.

## What the project is

An independent-hotel owner opens this dashboard to answer one question: **is
Autumn helping my hotel get more direct bookings and revenue?** Autumn runs
the hotel's online advertising and charges a percentage only on the bookings
it brings in.

The dashboard has two screens that read live from a hosted Postgres
database:

- **Overview** (`/`): the headline answer, a trend chart, plain-language
  insights, where guests come from, and how each campaign is doing.
- **Website Traffic** (`/website-traffic`): which days visitors arrive, which
  campaigns produce them, what Autumn changed and what happened after, and
  where the next advertising dollar would do the most good.

The database holds two years of generated hotel-marketing data for one
fictional property, Harbor House Inn in South Haven, Michigan. The generator
is deterministic: running it again produces the same rows.

## How to read this file

Every settled question gets one entry with four parts:

- **We chose** the thing that was built.
- **Instead of** the alternative that was seriously considered.
- **Why**, argued from the hotel owner, the data, or the brief.
- **How we know it holds**: the test or check that would fail if someone
  quietly reversed the decision.

Each entry ends with a status:

- **verified**: the proving test exists, and it was deliberately broken once
  to confirm it fails, then restored.
- **tested**: the proving test exists and passes, but it has not been
  deliberately broken yet.
- **superseded**: a later decision replaced it. The entry stays so the
  reasoning is not lost.

Numbers quoted here were measured on 2026-09-17 against the live database,
not copied from a plan. On that date the gates read: typecheck clean, 31
test files and 241 tests passing, seed and verify agreeing on
`730 days, 730 daily rows, 12,286 breakdown rows, 918 bookings, $408,745.44
booking value, $29,521.54 ad spend, 4 campaigns, 24 events, 1,503 direct
bookings in all` (last segment added 2026-09-17, D40).

Identifiers (D1, D2, ...) are shared with the design spec in
`docs/superpowers/specs/` and with the project's operating contract in
`CLAUDE.md`. Numbering follows the order questions were settled, not the
order they appear here.

---

## 1. What the owner sees

### D1. The headline is one sentence

**We chose:** the top of the Overview is a sentence: how many direct
bookings Autumn brought, what they were worth, and what the owner kept after
Autumn's fee, with the change against the previous period in words.

**Instead of:** four equal stat cards led by gross booking value, which is
what the reference product does.

**Why:** the owner's first two questions are "did Autumn get me bookings?"
and "how much money?". Autumn's fee is a percentage of those bookings, so the
net figure is the one that decides whether they stay a customer. The
reference product never shows the fee at all.

**How we know it holds:** `tests/components/dashboard.test.tsx` renders the
headline and checks the sentence contains bookings, value, net and the
delta; `tests/queries/overview.test.ts` checks fee and net against values
computed by hand in the test.

**Status:** tested.

### D2 and D31. The second screen is Website Traffic

**We chose:** the second screen explains traffic through the days visits
arrive on and the campaigns that produce them. An activity calendar is the
hero. Below it: visits by campaign over time with every Autumn change
marked, a "what Autumn did" story with before and after numbers, a table of
where the next dollar goes, weekday rhythm, and device conversion. Nothing
that is already on the Overview repeats here.

**Instead of:** a bookings-attribution screen (the original D2 choice), or a
traffic page of channels, page paths and time of day like the reference
product.

**Why:** the owner ruled that the second screen must help decide the next
campaign, not just describe the past. Channels, page paths and time of day
are not in the data and were not faked to fill space. The three campaign
components the query layer already served answered the owner's question
better.

**How we know it holds:** `tests/queries/traffic.test.ts` (series, events
pinned to their buckets, efficiency figures computed by hand),
`tests/components/traffic-campaigns.test.tsx`,
`tests/components/website-traffic.test.tsx`, `tests/activity.test.ts`.

**Status:** verified 2026-09-17. D2 (Bookings) is superseded by D31.

### D3. The default range is 30 days with two comparisons

**We chose:** the last 30 days, compared to the previous 30 days and to the
same 30 days one year earlier. Presets: 30 days, 90 days, year to date, 12
months, all time. The range lives in the URL so both screens share it and
links can be sent to someone else.

**Instead of:** year to date, which is the reference product's default.

**Why:** "what changed since last month?" needs the previous period. "Is
this seasonal or a problem?" needs last year. Year to date hides both behind
a denominator that grows every day.

**How we know it holds:** `tests/date-range.test.ts` checks the 30-day
default, both comparison windows, that year-to-date collapses to one
comparison and all-time has none, and that garbage input falls back to the
default.

**Status:** tested.

### D4. Plain words first, industry terms second

**We chose:** every metric is named in plain language. The industry term
appears once, in parentheses, with a tooltip explaining it. Click-through
rate is shown as "1 in N people clicked".

**Instead of:** industry labels (CTR, CVR, impressions) with an info icon.

**Why:** the brief says the owner may not know what CTR or attribution mean.
A label they have to decode is a label they skip.

**How we know it holds:** `tests/glossary.test.ts` fails if any label
contains a bare acronym or any meaning is not a full sentence;
`tests/components/copy.test.tsx` checks the metric label component shows the
plain label and offers the meaning.

**Status:** tested.

### D5. A small chart budget

**We chose:** one trend chart on the Overview. On Website Traffic, one
activity calendar and one campaign chart. Everything else is a ranked list,
a meter or a table.

**Instead of:** six donut charts and two data tables per screen, which is
what the reference product does.

**Why:** the brief says not to optimise for showing the most charts. A
ranked list answers "which one?" faster than a donut, and one trend line with
two comparison lines answers "what changed?" without a metric picker on
every card.

**How we know it holds:** the chart library in `src/components/charts/` has
no pie or donut component to reach for. Screens are reviewed by screenshot
at phone and desktop widths.

**Status:** tested.

### D6. Autumn's fee is shown at 15%

**We chose:** the fee is shown as 15% of attributed booking value. The rate
is a single constant in `src/lib/property.ts`, so it is one line to change.

**Instead of:** hiding the fee, or showing a flat monthly figure.

**Why:** Autumn's published model is pay-for-performance in the 11 to 19%
range, and 15% is the midpoint. Showing the fee next to the revenue it
produced is what builds the trust the brief asks for.

**How we know it holds:** `tests/queries/overview.test.ts` checks fee and
net on a hand-computed fixture; `tests/property.test.ts` keeps the app's
constant equal to the seed generator's copy so the copy and the data never
disagree.

**Status:** verified 2026-09-17. The exact percentage is the owner's call
and remains an open question below.

### D7. A warm, hospitality-native theme

**We chose:** a warm paper palette measured from Autumn's own marketing
site, with one sage accent. Light is the default. A dark theme was added
later as an option that follows the device setting or the owner's explicit
choice, using the same tokens.

**Instead of:** the dark analytics dashboard that the shadcn tooling
recommends by default.

**Why:** the brief asks for calm and hospitality-native. The company's own
site is paper-white. A dark analytics theme reads as an ad platform, which
is exactly what the brief says to avoid. Dark mode was added only because
some owners will open the dashboard on a phone set to dark at night.

**How we know it holds:** `tests/architecture.test.ts` checks that the
layout tokens and the dark theme block are both in the global stylesheet,
and that components use theme tokens rather than hard-coded colours.

**Status:** tested. The original "light only" ruling is superseded by the
theme toggle added on 2026-09-17.

### D8. One believable property

**We chose:** one seeded property: Harbor House Inn, South Haven, Michigan,
22 rooms, with Chicago as its main drive market.

**Instead of:** a generic "Hotel A" with flat demand.

**Why:** the reference screenshots already show Chicago, South Haven and
Detroit as feeder markets, so the geography is Autumn's own. A lakeshore inn
has strong, explainable seasonality, which makes the trend and
year-over-year views believable. The property is copy only; there is no
properties table.

**How we know it holds:** `tests/seed-profile.test.ts` checks that July
demand is more than twice January, weekends beat weekdays, holidays spike,
and room rates stay in a plausible band.

**Status:** tested.

### D9. Two full years, all under Autumn

**We chose:** a 730-day window ending on 2026-09-16, with Autumn active
throughout and an eight-week ramp at the start, plus 22% year-on-year
growth.

**Instead of:** a shorter window, or a window with a pre-Autumn baseline.

**Why:** two full summers make the year-over-year comparison real rather
than partial. The earlier idea of a pre-Autumn baseline was dropped when the
data model was simplified (D21); the ramp gives the same "it grew" story
without a second mode of data.

**How we know it holds:** `tests/seed-generators.test.ts` checks at least
720 distinct days and that seasonality and year-on-year growth are visible
in the generated rows.

**Status:** verified 2026-09-17.

### D10. "Today" is the last day with data

**We chose:** every date range is anchored on the latest date in the
database, never on the wall clock.

**Instead of:** the current date.

**Why:** the deployed app must be correct whenever it is opened, weeks after
seeding, with no scheduled job to reseed. Anchoring on the clock would decay
into an empty "last 30 days".

**How we know it holds:** `tests/date-range.test.ts` checks the range ends
on the data maximum; `tests/queries/overview.test.ts` checks the bounds
query returns the true min and max.

**Status:** tested.

### D32. Changing the range does not move the page

**We chose:** switching range or metric updates the URL without scrolling
and inside a transition, so the page keeps its scroll position and the old
content stays visible until the new data arrives.

**Instead of:** a plain navigation, which scrolls to the top and shows the
loading skeleton.

**Why:** an owner reading the funnel who switches from 30 to 90 days should
still be looking at the funnel. Measured at desktop width: scroll position
went from 1200 to 1158 after a switch (the page got slightly shorter), never
to 0.

**How we know it holds:** `tests/components/shell.test.tsx` checks the
navigation is called with scrolling disabled and that re-selecting the
current range does not navigate.

**Status:** verified 2026-09-17.

### D33. Every insight carries its own small graph

**We chose:** each insight card includes a small chart (two or three bars,
or a share bar) built from the same numbers its sentence quotes, in the
trend chart's colours.

**Instead of:** a "See the trend" link that scrolled to the big chart.

**Why:** the link only re-focused a chart already on screen. The small
graph is the evidence for that one sentence and cannot disagree with it,
because both come from the same rule.

**How we know it holds:** `tests/insights.test.ts` checks a value-down
insight carries the three figures with range-derived labels;
`tests/components/dashboard.test.tsx` checks bar widths and that no link is
rendered.

**Status:** verified 2026-09-17.

### D34. The glossary is a panel, always fully visible

**We chose:** the glossary sits in the Overview grid beside the funnel, with
every group of terms visible at once.

**Instead of:** a full-width section under the grid with a tab list.

**Why:** the tab list collapsed into a fixed row height and its labels
overlapped in the owner's screenshot. Showing all terms means nothing to
click and no empty band under a short group.

**How we know it holds:** `tests/components/dashboard.test.tsx` checks every
group renders as a region and a term from the last group is visible.

**Status:** verified 2026-09-17.

### D35 and D37. The activity calendar

**We chose:** a calendar of daily visits, one tile per day, ending on the
last seeded day regardless of the header range. The span (a year, six
months, or 13 weeks) is a per-browser preference. Columns stretch to fit so
the year never scrolls sideways. Clicking a day pins it, and the day card,
week strip and month summary all read from that one pinned day. Hover shows
in a fixed line in the header; nothing floats over the tiles.

**Instead of:** a heatmap bound to the header range (sparse at 30 days), a
fixed 53-week grid, or a floating tooltip per tile.

**Why:** "which days do people visit?" needs a year to read seasonality. The
owner's review said the panel had dead space and a clicked day should
surface its data immediately. Days before the data began are blank, never
shown as zero.

**How we know it holds:** `tests/queries/activity.test.ts` (starts on the
Sunday before the window, null before the first row, totals by hand);
`tests/components/website-traffic.test.tsx` (heat levels, month labels, one
tile per day, the 13-week span shows 13 columns, click pins, arrow keys
move a week, the day card follows).

**Status:** verified 2026-09-17.

### D38. "What Autumn did" shows one change at a time

**We chose:** one change at a time with previous and next arrows. The chosen
change shades its after-window on the campaign chart and enlarges its
marker; clicking a marker selects that change.

**Instead of:** the full list beside the chart, which made the row twice the
viewport height.

**Why:** the owner's review said the row was too tall to read in one screen,
and a picked change should show on the graph. After the change, chart and
list are the same height at desktop width.

**How we know it holds:** `tests/components/traffic-campaigns.test.tsx`
checks the "1 of N" counter, that Next moves to the second card, that
selection is reported, and that arrows disable at the ends.

**Status:** verified 2026-09-17.

---

### D41. The dashboard warns about two more things

**We chose:** two more Watch rules. Ad spend per booking up 30% or more
against the previous period, paired with what Autumn does about it; and a
feeder market that sent three or more bookings the period before and none
now. The "Other" bucket is exempt, because it is every small market folded
together, not a place.

**Instead of:** leaving "Is anything concerning?" to the two rules that
existed (booking value down, click-through down), which would stay silent
while a booking quietly took twice the advertising to win or a city stopped
sending guests.

**Why:** those are the two things an account manager notices first. Spend
per booking is Autumn's cost, not the owner's, and the copy says so; it is
still the earliest signal of competition or a slow stretch, and the owner
should hear it from the dashboard before a slower month.

**How we know it holds:** `tests/insights.test.ts` builds the fixtures by
hand: $1,500 over 40 bookings against $1,500 over 60 fires (up 50%); against
50 does not (up 25%); a previous period under five bookings never compares.
Chicago at 4 then 0 fires; Detroit at 2 then 0 and Other at 6 then 0 do not.
Both tests were red before the rules existed.

**Status:** verified 2026-09-17.

---

## 2. The data and how it is generated

### D21. Two tables at two grains

**We chose:** `daily_metrics` holds one row per day (the date is the primary
key). `breakdowns` holds one row per day per dimension value, where the
dimension is campaign, device, or feeder market. Two small supporting
tables, `campaigns` and `campaign_events`, describe what Autumn is running
and what it changed.

**Instead of:** the eight-table model in the original spec, with a
bookings table, hourly data and a stored insights table.

**Why:** the two grains are genuinely different. Mixing them either repeats
the daily total on every breakdown row or forces a group-by to ask "what
happened today?". One generic breakdowns table serves three structurally
identical screen sections with one seeding function and one component.
Fewer tables means less surface area to get wrong. What was given up:
booking lead time, booking hour and a recent-bookings list, which need a
per-booking grain.

**How we know it holds:** `tests/queries/schema.test.ts` applies the real
migration in an in-process Postgres and checks both tables exist, the
day-and-dimension index exists, and an unknown dimension is rejected.

**Status:** verified 2026-09-17.

### D22. Breakdowns add up to their day exactly

**We chose:** daily totals are the source of truth. Each breakdown row is
carved out of its day's total by exact apportionment: impressions by the
largest-remainder method, clicks and bookings by a weighted draw. Clicks
never exceed impressions and bookings never exceed clicks on any row.

**Instead of:** independently random numbers per breakdown row that only
sum "close to" the day.

**Why:** the brief asks for data that is not random noise. A breakdown that
adds up to its day without any tolerance satisfies that, and it lets the
verify script check equality strictly, so a partial insert is caught.
The weighted draw for bookings was added after the first version always
handed a single daily booking to the heaviest market, leaving eight of ten
markets at zero over 30 days.

**How we know it holds:** `tests/seed-apportion.test.ts` and
`tests/seed-generators.test.ts` check every dimension sums exactly for all
four metrics, the monotone constraints, that zero bookings means zero
value, and that no market or campaign has zero bookings over the full
window. `db:verify` reconciles all three dimensions against the live
database. After the reseed, Chicago is 49% of 30-day bookings and eight of
ten markets book.

**Status:** verified 2026-09-17.

### D25. Bookings per day use error diffusion, not a coin flip

**We chose:** the expected bookings for a day (clicks times conversion
rate, with jitter) is accumulated, and the fractional remainder carries to
the next day.

**Instead of:** a binomial draw per day.

**Why:** with about one booking a day, binomial noise swung monthly totals
by 15% and hid a 22% annual growth trend in the first run (July 2025: 45
bookings, July 2026: 42). Error diffusion keeps daily counts lumpy (zero to
three) while monthly totals track the rate, so seasonality and growth are
visible in the data rather than only in the parameters.

**How we know it holds:** `tests/seed-generators.test.ts` ("shows
seasonality and year-over-year growth"). Measured from the generator: July 2025 has 54
bookings, July 2026 has 78, January 2026 has 19.

**Status:** verified 2026-09-17.

### D26. Events cause the data

**We chose:** a `campaign_events` table lists what Autumn did (a budget
raise, a copy refresh, a new campaign) with a date and a plain note. The
generator applies each event's effect from its date forward. There are 24
events over the two years.

**Instead of:** inferring "what changed" from the numbers alone, or a static
list of activity unconnected to the data.

**Why:** the owner's questions "what changed since last month?" and "what is
Autumn doing about it?" need a cause, not a correlation. With events driving
the generator, an insight that says "after the copy refresh, clicks rose"
is true by construction.

**How we know it holds:** `tests/seed-generators.test.ts` checks every
event is inside the window, names a real campaign, and that launch dates
match campaign start dates. `tests/queries/events.test.ts` checks the
before-and-after windows against hand-computed values. The causality proof
itself is D30.

**Status:** verified 2026-09-17.

### D30. Causality is proven by a controlled regeneration

**We chose:** to prove an event moves the data, the tests generate the
dataset twice from the same seed, once with one event's effect switched
off, and compare. Every daily row before the event's date must be
byte-identical, which also proves effects are strictly forward-acting.

**Instead of:** comparing the window before an event with the window after
it in a single run.

**Why:** season, weekday mix and other events drift across the boundary too.
Measured: across one copy refresh, the campaign with a 15% click-through
effect appeared to move 0.6% while an untouched control campaign moved
2.8%. The old test was reading drift, and it broke the moment the random
stream shifted. With the effect neutralised, the same campaign reads 11.61%
click-through against 12.77% with it.

**How we know it holds:** `tests/seed-generators.test.ts` ("an effect moves
only its own campaign, and only from its own date").

**Status:** verified 2026-09-17.

### D27. Campaigns are data, not copy

**We chose:** a `campaigns` table with four rows: a plain objective, a
focus, a launch date, a status and a monthly budget. The campaign name
matches the breakdown dimension value.

**Instead of:** campaign labels only, with descriptions hard-coded in the
glossary.

**Why:** "what is this campaign for?" and "where is it pointed?" are facts
about the campaign, not interface copy, and belong beside the events that
change it.

**How we know it holds:** `tests/queries/schema.test.ts` checks an event
naming an unknown campaign is rejected; `tests/queries/events.test.ts`
checks labels and budgets; `tests/seed-generators.test.ts` checks the
metadata rows match the seeded campaign set.

**Status:** verified 2026-09-17.

### D28. Ad spend sits beside fee and booking value

**We chose:** a `spend` column on both metric tables, priced per campaign
click and apportioned to devices and markets by clicks.

**Instead of:** showing only Autumn's fee.

**Why:** "how much money?" was the owner's first question. Autumn funds the
ads, so spend beside fee and booking value is the honest cost-versus-return
story. On the seeded data, spend runs about 7% of booking value against a
15% fee.

**How we know it holds:** `tests/seed-generators.test.ts` (spend sums
exactly per dimension, zero clicks means zero spend, spend stays between 4%
and 15% of value); `db:verify` reconciles spend per dimension; the overview
and breakdown query tests check spend on hand-built fixtures.

**Status:** verified 2026-09-17.

### D29. Pages per visit is a weighted figure

**We chose:** total pageviews divided by total sessions over the range, with
both counts stored per day.

**Instead of:** averaging the stored daily rate across days.

**Why:** an average stored without its denominator cannot be re-aggregated.
Averaging daily rates weights a quiet Tuesday the same as a peak Saturday.
Storing the counts also made "new visitors" a real share of a real number;
before this fix it exceeded total sessions on every row.

**How we know it holds:** `tests/queries/overview.test.ts` (weighted 3.68
where the naive average reads 3.5; a single day equals its stored rate; an
empty window reads zero rather than dividing by zero);
`tests/seed-generators.test.ts` (new visitors never exceed sessions). On the
live data the correction moves the figure by 0.17% over 30 days and 0.38%
over two years, because the seeded rate is drawn from a tight band.

**Status:** verified 2026-09-17.

### D15. The seed is deterministic and proves itself

**We chose:** the generator uses a fixed-seed random number generator,
truncates and re-inserts, and prints one acceptance line built from what it
inserted. A separate verify script recomputes the same line from the live
database with `count`, `min`, `max` and `sum`.

**Instead of:** a random seed, append-only inserts, or a boolean "seeded
ok".

**Why:** repeatable setup is part of what is being judged. A derived line
that a partial or wrong run could not produce is the cheapest proof that
the database matches the generator.

**How we know it holds:** `tests/seed-generators.test.ts` (two runs are
identical); `tests/queries/seed.test.ts` runs the real seed function twice
against an in-process Postgres and checks the acceptance line matches both
times. On the hosted database, seed and verify printed the same line.

**Status:** verified 2026-09-17.

### D24. Insights are computed, never stored

**We chose:** insights are calculated when the page renders, from the same
rows the charts use: this period against the previous, against last year,
the biggest movers per dimension, and the most recent Autumn change with
its before and after.

**Instead of:** an insights table filled by the seed (the original D17).

**Why:** a stored insight is a derived fact that has to be kept in sync
with the numbers under it, the same two-sources-of-truth problem the
two-table design avoids. Computed at render, an insight can never disagree
with the chart beside it.

**How we know it holds:** `tests/insights.test.ts` covers each rule (value
against previous with last year as the seasonal check, year over year, cost
against travel-agency commission, a rising campaign, a click-through drop
paired with what Autumn does about it, a new market, phone share, the
latest event) with titles and ordering computed by hand. Watches sort
first.

**Status:** verified 2026-09-17.

---

### D40. All direct bookings are stored beside Autumn's

**We chose:** a column on `daily_metrics`, `all_direct_bookings`: every
direct booking the property took that day, from any source. Autumn's
`bookings` is a subset, enforced by a check constraint. The headline reads
"80 of your 112 direct bookings" instead of "80", the way the traffic page
already reads "1,548 people, about 1 in 8 of the 12,679 visits". The seed
draws the organic part (season, a slow 5%/yr drift, no ramp, no campaign
events) from its own random stream, seeded one past the main constant.

**Instead of:** leaving the headline as Autumn's count alone, which answers
"did Autumn grow" when the owner asked "did Autumn help". 80 out of 85 and
80 out of 800 read the same and mean the opposite. A bookings table with a
source per row was the other option and was not taken: the two-grain model
(D21) stands, and one denominator is what the question needs.

**Why:** the brief's first question is "Did Autumn help me get more direct
bookings?", and "more" wants a baseline the schema did not hold. A separate
stream for the organic draw means every column seeded before it kept its
bytes (918 bookings, $408,745.44, the same acceptance line plus one
segment), so no screenshot or quoted figure moved.

**How we know it holds:** `tests/seed-generators.test.ts` asserts the
column is never below Autumn's on any day, that Autumn's share rises from
the first winter to the last 90 days (48% to 69% measured), and that
neutralising a campaign event leaves the organic part identical on all 730
days while Autumn's bookings move. Drawing the organic part from the shared
stream instead turned that last test red, and the existing causality test
with it. `tests/queries/schema.test.ts` inserts a day with more Autumn
bookings than direct bookings and expects the constraint to refuse it.
`tests/queries/overview.test.ts` reads 3 of 10 from hand-built rows.
`db:verify` re-derives the total from `SUM`. The migration is three files,
because a live table needs the backfill before the check.

**Status:** verified 2026-09-17.

---

## 3. How the code is put together

### D11. Server Components read the database directly

**We chose:** Next.js App Router pages are Server Components that call the
query layer directly. There is no REST layer. The only client components
are the range control, the charts and small interactive pieces.

**Instead of:** client-side fetching with a data library, or API route
handlers.

**Why:** two screens of read-only aggregates are the textbook case for
Server Components: no request waterfall, database access stays on the
server, and the URL carries all state so links are shareable. Route
handlers would add a layer nothing else consumes.

**How we know it holds:** `npm run build` lists both screens as
server-rendered; there is no API directory; component tests render with
fixture data and no network mock.

**Status:** tested.

### D23. Supabase Postgres with Drizzle ORM

**We chose:** a hosted Supabase Postgres database, reached through a
connection pooler suited to serverless functions, with Drizzle ORM and
generated migrations. Migrations run over a separate direct connection.

**Instead of:** Neon over an HTTP driver (the original D12), or a document
database, or SQLite on disk.

**Why:** the data is relational and every screen is an aggregate, which
Postgres does natively. Supabase was the owner's platform choice. The
schema, the seed and every query are driver-agnostic, so the switch from
Neon was a one-file change.

**How we know it holds:** `tests/queries/seed.test.ts` runs the production
seed unchanged against an in-process Postgres. On the hosted database,
migrate, seed and verify all passed on 2026-09-17, and the query layer
answered in 32 to 69 ms on a warm connection over three runs.

**Status:** verified 2026-09-17. D12 (Neon) is superseded.

### D39. Row security is on, with no policies

**We chose:** every table has row-level security enabled and no policies.
The app never uses Supabase's REST API; it reads Postgres directly as the
`postgres` role, which bypasses row security, so nothing the owner sees
changes. Supabase's public API, reachable by anyone holding the project's
publishable key, now returns no rows and refuses writes.

**Instead of:** leaving row security off, which Supabase flags as critical on
every table in the `public` schema, or writing read-only policies for an API
the product does not use.

**Why:** the publishable key is designed to be public. With row security off,
anyone with it could read the four tables through the REST API, and could
also write to them, including emptying the seed the live dashboard reads.
No policies is the honest shape: the product has no API consumers, so the
API should return nothing. The migration is five statements and reversible
in one.

**How we know it holds:** `tests/queries/schema.test.ts` asserts
`relrowsecurity` is true on all four tables and that the foreign-key index on
`campaign_events` exists; it runs against the real migration. Measured live
on 2026-09-17, before and after applying it: with the publishable key,
`GET /rest/v1/daily_metrics` returned 2 rows before and 0 after, on all four
tables; a `POST /rest/v1/campaigns` after returned 401, "new row violates
row-level security policy". `db:verify` and the deployed site were unchanged
throughout. Negative control: removing one `ENABLE ROW LEVEL SECURITY`
statement from the migration turned the test red; restored.

**Status:** verified 2026-09-17.

### D13. Query tests run against a real Postgres in memory

**We chose:** query tests use PGlite, an in-process Postgres, apply the
real generated migration, and load a fixture whose expected values are
computed by hand in the test.

**Instead of:** mocking the ORM, or testing only against the hosted
database.

**Why:** a mocked query cannot fail for a SQL reason. A hosted-only test
needs a secret in CI and pays network latency per case. PGlite runs the
real migration, so the schema is tested too.

**How we know it holds:** every file under `tests/queries/`. Recorded
negative control: dropping a source filter turned the direct-share test
red.

**Status:** tested.

### D14. Money is integer cents below the render layer

**We chose:** the database stores dollars as `numeric`. The query layer
converts to integer cents once, at the boundary. Every view model carries
cents. Formatting to dollars happens only in `src/lib/format.ts`.

**Instead of:** floating-point dollars in the view models.

**Why:** sums of floats drift; cents sum exactly and the fee arithmetic
stays integer. One formatter means one place to change how money looks.

**How we know it holds:** `tests/format.test.ts`;
`tests/queries/overview.test.ts` (a `1250.50` row reads as `125050` cents
and net is exact); `tests/architecture.test.ts` fails if money is formatted
anywhere but the formatter.

**Status:** verified 2026-09-17.

### D18. Pages compose, components render, queries fetch

**We chose:** a component library under `src/components/<area>/`, each
area exporting through its own index file. Components take typed view
models as props and never fetch. Pages only compose. The shadcn-generated
primitives in `components/ui` are owned by the CLI and are not edited by
hand.

**Instead of:** colocating components under the routes, or one global
export file.

**Why:** pages that only compose are easy to read and to re-plan. Typed
view models are the contract that lets components be tested with fixtures.
Per-area exports keep imports clean without one module dragging every
component into every route.

**How we know it holds:** `tests/architecture.test.ts` scans the source and
fails if a component imports the database layer, a page imports a file
inside a component folder, a component sets outer margins, or any file
uses a JavaScript viewport hook instead of CSS breakpoints.

**Status:** tested.

### D19. Trend buckets start from the first day of the range

**We chose:** the query fetches per-day rows and buckets them in
TypeScript from the first day of the chosen range.

**Instead of:** SQL `date_trunc`, which snaps to calendar weeks.

**Why:** a "last 90 days" view should bucket from its own first day, not
from a Monday the owner did not pick. Rows per query never exceed 730, so
the cost is negligible.

**How we know it holds:** `tests/queries/overview.test.ts` checks bucket
starts, that comparisons align by index, and the week sums.

**Status:** verified 2026-09-17.

### D20. The answer paints first, the rest streams

**We chose:** each screen awaits its headline data, sends it, then streams
the slower sections behind one Suspense boundary. Inside that boundary the
remaining queries run in a single round trip.

**Instead of:** streaming every section separately, or waiting for
everything.

**Why:** the headline is the answer and should appear first. One boundary
for the rest is faster than five, because the sections are all visible
together on desktop.

**How we know it holds:** both page files follow this shape; the loading
skeleton reserves the chart height so the page does not shift
(`tests/components/dashboard.test.tsx`). Measured with Lighthouse on the
deployed site on 2026-09-17: performance 100 on desktop and 91 on the
throttled mobile profile for both screens, layout shift at or near zero,
server response 20 to 60 ms warm and about 1.7 s on a cold function.

**Status:** verified 2026-09-17 (measured, not falsified).

### D36. A design-system page outside the product

**We chose:** the two dashboard screens live in a route group whose layout
owns the sidebar frame. A separate `/design-system` page renders every
token, primitive and component from the real code with fixture data. It is
unlinked from the product and marked not to be indexed.

**Instead of:** hiding the sidebar on one route, or a Storybook.

**Why:** the reference must show the real components in the real theme
without a second toolchain, and an owner must never stumble into it.

**How we know it holds:** `tests/architecture.test.ts` fails if any product
file links to the design-system page; `npm run build` lists it as a static
page beside the two dynamic screens.

**Status:** verified 2026-09-17.

---

## 4. Superseded decisions, kept for the record

| ID | What it was | Replaced by | Why |
|---|---|---|---|
| D2 | Second screen is a Bookings attribution page | D31 | The owner ruled the second screen must help decide the next campaign. |
| D7 (original) | Light theme only | D7 as written above | A dark option that follows the device was added on 2026-09-17; the warm palette and light default stand. |
| D8 (original) | A `properties` table | D8 as written above | The two-table model has no properties table; the property is a constant. |
| D9 (original) | A pre-Autumn baseline inside the window | D9 as written above | The whole window is under Autumn with a ramp; simpler data, same story. |
| D12 | Neon Postgres over an HTTP driver | D23 | Owner's platform choice; one-file change. |
| D16 | Campaign metrics derived from a bookings table | D22 | Same principle, now enforced as exact apportionment of daily totals. |
| D17 | Insights generated by the seed and stored | D24 | Stored insights can drift from the numbers under them. |

## 5. Tried and dropped, with the number that decided it

| Date | Tried | Result | Kept instead |
|---|---|---|---|
| 2026-09-17 | Before/after comparison as the causality test (D30) | An untouched control campaign moved 2.8% while the campaign with a 15% effect moved 0.6% | Regenerate with the effect switched off and compare |
| 2026-09-17 | Binomial draw for daily bookings (D25) | July 2025 = 45, July 2026 = 42 despite 20% more impressions; monthly noise about 15% | Error diffusion with a carried remainder |
| 2026-09-17 | Largest-remainder apportionment for bookings (D22) | Eight of ten markets showed zero bookings over 30 days | Weighted draw for clicks and bookings; largest remainder kept for impressions |
| 2026-09-17 | Averaging daily pages-per-visit rates (D29) | Reads 3.5 where the true weighted figure is 3.68 on the fixture | Store both counts and divide the sums |

## 6. Open questions for the owner

| ID | Question | Current choice | Blocking? |
|---|---|---|---|
| D6 | Which fee percentage to display | 15%, the midpoint of the published range. One constant to change. | No |
