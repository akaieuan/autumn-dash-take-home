# The activity calendar follows the page range

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The activity calendar draws the same window every other panel draws (`?range=` 30d, 90d, ytd, 12m, all) instead of its own 13 weeks / 6 months / year toggle; its grid takes the panel's full width, and the day the reader picked is read out in a band under the grid, not in a tall card beside it.

**Architecture:** One query (`getActivity(db, from, to, metric)`) returns exactly the range's days. One pure helper decides nothing about width; the component renders every mode and container-query classes show one. The click information becomes a fixed-height horizontal band (`DayCard` re-laid), so the grid is never squeezed by a sidebar card and month blocks are needed only on real phones.

**Tech stack:** Next.js 16 App Router, React 19, Tailwind 4 container queries, Vitest 5 + PGlite.

**Owner's words (2026-09-17):** "every other component across the entire site uses the buttons in the header for the time span change. We should be using that for the activity calendar as well"; "less double information like the h1 sub h has information shown in the key"; "the large view on small screen sizing is over powering and we need to find a better way to keep it wide, with good tile size and move the on click information under the tile grid".

## Global constraints

- Pages compose, components render, queries fetch; barrel imports only (CLAUDE.md §2).
- No viewport hooks, no margin utilities, no literal radii, no `Intl` outside `format.ts` (`tests/architecture.test.ts`).
- Nothing moves on hover or pin. A change of range is the owner's action; heights may differ between ranges.
- Run `npm run typecheck` before `npm test`. Every new assertion goes red once.
- Stage by explicit path; never `git add -A`; never touch `.env*`; do not push.

## The modes

The tile area is the full width of the panel body and is its own `@container`.

| Range | Days | Wide (tile area ≥ 42rem, `@2xl`) | Narrow (< 42rem) |
|---|---|---|---|
| 30d | 30 | **Month calendar**: 7 columns Sun–Sat, one row per week (5 or 6), a cell shows the day number top-left and the count bottom-right | same 7 columns; the count is hidden under `@md` (28rem) |
| 90d | 90 | 13 columns × 7 rows of day squares, the count inside each square from `@lg` | same squares, no count (at 375px a square is 18px) |
| ytd | 1–366 | one column per week × 7 rows of day squares (37 columns on the seeded data) | month blocks, one per month in the range: `grid-cols-3` up to 6, `grid-cols-4` up to 12 |
| 12m | 365 | 53 columns × 7 rows of day squares | 12 month blocks, 4 × 3 |
| all | 730 | **24 month blocks, 12 × 2** (a year per row) | 24 month blocks, 6 × 4 |

A square is always a day where it can be at least 12px; where it cannot, a block is a month and the caption says so. "all" is two years, 105 weeks: 7px squares are not a calendar, so it is blocks at every width.

The day-square grid pads the first column: `leading = weekdayOf(days[0].date)` invisible cells (`aria-hidden`, `invisible`) before the first day, so Sunday stays the top row. The month calendar pads the same way and pads the tail to a whole row.

## What the panel shows, top to bottom

1. `PanelHeader` title "Every day people visited", **no description** (the legend already says darker is busier; the readout's idle text says "Point at a day"). Action slot: the readout as it is today (own line left under `sm`, fixed width right from `sm`). No span toggle.
2. The stage (one of the modes above).
3. The legend row, one line: left `"{count(total)} {unit} · {rangeLabel(from, to)}"` (no "busiest on": the busiest day is the default kept-open day and is read out below); middle, only in block mode, "Each block is a month."; right, the Fewer → More ramp.
4. A hairline, then the **day band** (`DayCard`, re-laid horizontally): eyebrow "Kept open" / "Pointing at", the date and its rank ("3rd of 90 days · 2nd of 13 Fridays") in the first column; then Visits (with "+31% vs a typical Friday" note), New visitors, Bookings ("1 in 43 visits booked"), Pages per visit; then the "Against a typical Friday" meter under the date column. Grid: `grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))]`; fixed height `min-h-(--card-day)` where `--card-day` becomes the band's height (measure: about 9.5rem stacked, 5.5rem from `sm`; use `min-h-[9.5rem] sm:min-h-(--card-day)` with `--card-day: 5.5rem`, and update the token's comment in `globals.css`). Every block always renders (dash / " " fallbacks as today) so hovering never reflows.
5. A hairline, then the context row exactly as today: `WeekStrip` and `MonthSummary`.

The `lg:grid-cols-[minmax(0,1fr)_17.5rem]` two-column layout is gone at every width.

---

### Task 1: The query returns the range's days

**Files:**
- Modify: `src/lib/db/queries/activity.ts`
- Modify: `src/lib/db/queries/index.ts` (signature only if re-exported with a type)
- Test: `tests/queries/activity.test.ts`

**Interfaces:**
- Produces: `getActivity(db: AnyDb, from: string, to: string, metric: TrendMetric): Promise<ActivityDto>`; `ActivityDto { metric, from, to, weeks, max, total, days }` where `days` covers exactly `[from, to]`, `weeks = ceil((dayOfWeek(from) + days.length) / 7)`. `ActivityDay` unchanged.

- [ ] **Step 1:** Rewrite the two `getActivity` tests: `getActivity(db, "2026-09-03", "2026-09-10", "website_visits")` returns 8 days, `from === "2026-09-03"`, `weeks` computed by hand from the fixture's weekday (state the weekday in a comment), `total` and `max` computed by hand from the fixture rows; the `booking_value` test keeps its cents assertion. A day before the fixture's first row is `null` in every field.
- [ ] **Step 2:** Run `npx vitest run tests/queries/activity.test.ts`; expect failures on the signature.
- [ ] **Step 3:** Change the signature; drop `weeks` and the Sunday alignment from the query (the component pads); keep the JSDoc honest ("exactly the range's days").
- [ ] **Step 4:** Run the file green; `npm run typecheck` will now fail in the page and the design-system fixtures — that is Task 4's job; commit only the query and its test once the query test is green and `tsc` errors are limited to callers.

### Task 2: Pure helpers

**Files:**
- Modify: `src/lib/activity.ts`
- Test: `tests/activity.test.ts`

**Interfaces:**
- Produces: `monthCalendar(days: T[]): { leading: number; trailing: number; rows: number }` (blanks before the first day so it sits under its weekday, blanks after the last to finish the row, row count); `monthBlocksInRange(days, from, to): MonthBlock[]` = `monthBlocks(days, monthsBetween(from, to))` where `monthsBetween` counts calendar months inclusive ("2026-01-01".."2026-09-16" → 9; "2024-09-17".."2026-09-16" → 25 → **cap at 24 for "all"? No**: draw what the range holds; the "all" grid is `grid-cols-12` and 25 blocks make 3 rows with one block; ask instead: `monthBlocks(days, count)` already pads missing months, so pass `min(count, 24)` only when `count > 24`, and say so in the JSDoc).
- Delete: `visibleWindow`, `lastWeeks`, `ActivitySpan` and their tests.
- Keep: `heatLevel`, `monthColumns`, `weekdayAverages`, `monthTotals`, `weekOf`, `dayRank`, `monthContext`, `weekContext`, `monthBlocks`, `weekdayOf`.

- [ ] **Step 1:** Tests with hand-computed values: `monthCalendar` for 30 days starting on a Tuesday (leading 2, rows 5, trailing 3); 28 days starting Sunday (leading 0, rows 4, trailing 0); empty → zeros. `monthsBetween` for the two examples above and for a single month.
- [ ] **Step 2:** Red, then implement, then green. Delete the `visibleWindow`/`lastWeeks` tests and functions in the same commit.

### Task 3: The component

**Files:**
- Modify: `src/components/website-traffic/activity-calendar.tsx`, `day-card.tsx`, `month-blocks.tsx` (columns `3 | 4 | 6 | 12`, static class map), `index.ts`
- Delete: `src/components/website-traffic/use-calendar-span.ts`, `src/lib/calendar-span.ts`, `tests/calendar-span.test.ts`
- Modify: `src/app/globals.css` (`--card-day` value and comment)
- Test: `tests/components/website-traffic.test.tsx`

**Interfaces:**
- `ActivityCalendar({ activity, range, unit = "visits", title = "Every day people visited" })` where `range: Pick<DateRange, "preset" | "from" | "to">`. The mode is derived from `range.preset` (30d → calendar, 90d → squares, ytd/12m → squares-or-blocks, all → blocks); the narrow fallback classes from the table.
- `DayCard` keeps its props; its layout becomes the band (`className` still accepted).

- [ ] **Step 1:** Rewrite the calendar tests: one `it` per preset asserting the mode's markers: 30d → seven column-header cells "Su".."Sa", `leading` blanks, a cell with `data-date` whose text contains the day number; 90d → 13 columns of `[data-date]` (91 cells counting leading blanks as `aria-hidden`), counts inside tiles carry the `@lg:inline` class; 12m → both a `[data-date]` grid with `hidden @2xl:grid` and 12 `[data-busiest]` blocks with `@2xl:hidden`; all → 24 blocks and no `[data-date]` grid; ytd (fixture Jan 1..Sep 16) → 9 blocks. No `ToggleGroup`, no text "13 weeks". The readout test and the hover/pin/keyboard tests stay, adjusted to the new props. The legend line reads `"{total} visits · {rangeLabel}"` and never "busiest on". `DayCard` band: same three-state height test as today (all blocks render). The header has no description paragraph.
- [ ] **Step 2:** Red. Implement. Green. Delete the span files and their test in this commit. `tsc` must be clean except the page (Task 4) — prefer to do Task 4 in the same commit if that is simpler; say so.

### Task 4: The page and the design system

**Files:**
- Modify: `src/app/(dashboard)/website-traffic/page.tsx` (no cookie; `getActivity(db, range.from, range.to, "website_visits")`; `<ActivityCalendar activity={activity} range={range} />`)
- Modify: `src/app/design-system/fixtures.ts` (the activity fixture becomes a 90-day range, plus a `range` for it), `src/app/design-system/page.tsx` (ActivityCalendar specimen with `range`; MonthBlocks specimens 4 × 3 and 12 × 2; DayCard specimen now the band; SpacingDemo note for `--card-day`), `src/components/design-system/tokens.tsx` (the `--card-day` note)
- Modify: `docs/decisions.md`: `### D41. The calendar follows the page range` (decision, alternative = its own span toggle in a cookie (D35/D37/D40, superseded today: the owner ruled every panel follows the header's range), reason, proving tests, status verified); mark D35/D37/D40's span parts superseded by D41 in their status lines and in the superseded table.
- Modify: `docs/superpowers/plans/2026-09-17-calendar-follows-the-range.md` — tick the boxes.

- [ ] **Step 1:** Page compiles, `npm run typecheck` clean, `npm run lint` clean, `npm test` green (report the printed lines), `npm run build` lists `/`, `/website-traffic`, `/design-system`.
- [ ] **Step 2:** Browser (dev server already running on http://localhost:3000 through the preview tool; do not start another): `/website-traffic?range=30d|90d|ytd|12m|all` at 375, 768 and 1280 (use `resize_window`; the app may clear a size when the pane changes, set it again). Confirm: no span toggle; grid full width; the day band under the grid; hovering a tile or block moves nothing (measure the band's and the readout's rects before/after); 30d shows the month calendar with counts at 1280 and numbers only at 375; 12m shows squares at 1280 and 12 blocks at 375; all shows 12 × 2 blocks at 1280 and 6 × 4 at 375. Screenshot each (range × width) into the scratchpad `shots/` folder named `traffic-<range>-<width>.png` and list the paths in the report. Check `read_console_messages` for errors.
- [ ] **Step 3:** Commit (title = what was wrong; body = measurements, what did not change, gates; `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`).

## Self-review

- Spec coverage: range follows header (Task 1, 3, 4); double information removed (Task 3 header/legend); wide grid, band under it (Task 3); every width handled (modes table).
- Types: `getActivity(db, from, to, metric)` in Task 1 and Task 4; `ActivityCalendar({ activity, range })` in Task 3 and Task 4; `MonthBlocks.columns` widened in Task 3 and used in Task 4's specimens.

---

## Amendment (2026-09-17, after the owner saw the 30-day render)

The owner's words: "this is too large per square, I wanted it to be more like GitHub still, not calendar tiles"; "like this is sooooo overwhelming"; and on the week strip / month summary row: "these can be added to the card above instead of its own section, we don't need a chart for that, it can just be added to the card that sits under the activity calendar, so that we can see the metrics under the component as well".

These rulings replace the parts of the plan they touch. Task 1 and Task 2 commits stand; the uncommitted Task 3/4 work on disk is the starting point.

### A. One geometry: GitHub squares, never calendar tiles

- **Every range that draws days draws weeks-as-columns, 7 rows, small squares.** 30d is 5 columns (with leading blanks so Sunday is the top row), 90d is 13, ytd ~37, 12m 53. Delete the month-calendar mode (`monthCalendar` helper, the 7-column grid, the weekday header row, the day numbers in cells) and its tests.
- **A square never stretches.** Columns are `minmax(0, 1fr)` capped: the tile grid gets `max-w` so a square is at most **1.5rem** — set `style={{ maxWidth: \`calc(${columns} * 1.5rem + ${columns - 1} * 3px)\` }}` on the grid (one inline size, computed from the column count; not a viewport read). At 1000px a 12m square is ~16px, a 90d square 24px, a 30d square 24px. Under `@2xl` a 37+ column grid falls to month blocks as the table says; 30d and 90d stay squares at every width (at 300px a 90d square is 20px).
- **No numbers inside squares.** The readout and the band carry the number. Remove the `@lg:inline` count span.
- **The row the grid sits in fills the panel width without stretching the grid**: `flex flex-wrap items-start gap-x-8 gap-y-3` with the grid first (its own `@container` wrapper keeps `min-w-0 grow` so 12m still uses the full width) and, after it, the legend column: the total line `"{count(total)} {unit} · {rangeLabel(from, to)}"` on one line and the Fewer → More ramp under it (`flex flex-col gap-1.5 text-xs text-muted-foreground`). "Each block is a month." stays in block mode only, in that column.
- Weekday labels (Mon/Wed/Fri) stay in the left gutter from `@md` as today; month labels stay above the columns.

### B. The week and the month move into the band; the chart goes

- Delete `src/components/website-traffic/day-context.tsx` (`WeekStrip`, `MonthSummary`), their barrel exports, their tests and their design-system specimens. Keep `weekContext`/`monthContext` in `src/lib/activity.ts`; add `weekSummary(days, date): { label: string; total: number | null; busiest: string | null } | null` (the Sunday..Saturday week around `date`: label is `shortDate` of its Sunday, total the sum of non-null values, busiest the date of the largest; null when no date). Test it by hand (a week with a null slot; no date → null).
- `DayCard` becomes the whole band under the grid: props `{ day, typical, mode, unit, rank, week: WeekSummary | null, month: MonthContext | null, className? }`. Layout, from `sm`: row 1 = `grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))]`: [eyebrow "Kept open"/"Pointing at", the date, the rank line] then Visits (note "+28% vs a typical Mon"), New visitors ("from any source"), Bookings ("1 in 21 visits booked"), Pages per visit ("per visit"). Row 2, a hairline above, `grid-cols-3`: **"A typical Monday"** — `"{count(typical)} {unit}"` (the meter is gone; the +28% note already says it); **"The week of Sep 6"** — `"{count(week.total)} {unit}"` and the note `"busiest on {weekdayShort(busiest)}"`; **"Sep 2026"** — `"{count(month.total)} {unit}"` and the note `"{ordinal(rank)} of {count} months · {deltaText vs the month before}"` (reuse the words `MonthSummary` used). Every cell always renders with the dash / non-breaking-space fallbacks so hovering never reflows; under `sm` the same cells in `grid-cols-2`. `--card-day` is the band's height from `sm` (measure it; about 10rem); under `sm` use a measured `min-h-[…]` arbitrary value and say the number in the commit.
- The calendar renders: header, the grid row (A), a hairline, the band. Nothing else. The `lg:` two-column layout, the context row and the description paragraph are gone.

### C. Tests and specimens

- `tests/components/website-traffic.test.tsx`: per-preset mode tests as before but 30d asserts 5 columns of squares (35 cells incl. leading blanks) and no "Su".."Sa" header; no cell text; the band shows the week and month figures for the kept day (hand-computed from the fixture); the description paragraph and `WeekStrip` are absent. `DayCard` three-state height test keeps all cells rendered.
- Design system: `DayCard` specimen shows the band with `week` and `month`; remove the `WeekStrip · MonthSummary` specimen; `ActivityCalendar` note updated ("GitHub squares capped at 1.5rem; the band under the grid carries the day, its week and its month").
- Decisions: D41's text names these rulings (squares capped, no numbers in squares, band replaces the week strip and month summary).
