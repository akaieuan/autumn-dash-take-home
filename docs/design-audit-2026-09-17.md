# Design audit — both screens and the component library — 2026-09-17

Scope: `main` at `19e1705`, the Overview and Website Traffic screens as they render against the live database, and every folder under `src/components`. Measured, not recalled: 80 component files outside `ui/` in six folders (3,395 lines), 25 client files, 10 component test files, 28 test files / 191 tests green, both routes dynamic and `/design-system` static.

Verdict in one line: the architecture is sound and enforced (pages compose, components render, queries fetch; CSS-only responsiveness; tokens only; every rule a red test), the two screens read as one product, and what is left is consolidation debt from building two screens fast: the same three or four small patterns are re-declared in a dozen files instead of being atoms.

## What is frontier-level already

- **Layering is enforced by tests, not reviews.** `tests/architecture.test.ts` greps every rule (no `@/lib/db` in components, barrel-only imports from pages, no margins, no literal radii, no viewport hooks, no `Intl` outside `format.ts`, nothing links to `/design-system`). A regression is a red test.
- **The client boundary is minimal and honest.** 25 client files, each because the browser is the source of truth: charts (Recharts), the four URL controls, the sidebar, the theme, the calendar, the pager. Every table, panel and list is server-rendered. No client data library.
- **State lives where it belongs.** Range and metric in the URL (shareable, server-rendered, no scroll jump); sidebar in a cookie (first paint correct); theme, chart style and calendar span in `localStorage` through `useSyncExternalStore` with a stable server snapshot. Nothing duplicated into context.
- **Money and time are handled once.** Cents at the query boundary, formatting only in `format.ts`, "today" is `MAX(date)`, buckets start on the range's first day. Query tests are PGlite with hand-computed expectations.
- **Colour is a system.** One coloured series with amber and grey comparisons; identity colours follow the entity (`campaignColor`, `deviceColor`), never the rank, so Discovery is the same amber on both screens; a five-step heat ramp mixed in oklab from one hue. Zero hex values in components.
- **Accessibility fundamentals hold on both screens.** One `h1`, one `main`, a clean `h2`/`h3` outline, no unnamed buttons or links, no duplicate ids, every decorative SVG hidden, every chart with an `aria-label`, the calendar's 179 tiles behind one roving tab stop. Measured at 1280px on both routes.
- **Nothing moves under the pointer.** The chart and its table twin share one box; the day card, the event card and the pager reserve their height; range changes keep the scroll position. Measured: paging four changes leaves the events panel, the chart panel and the page height unchanged.
- **The reference page is real.** `/design-system` renders 57 specimens of the actual components with fixture DTOs, tokens read from their live variables, unlinked and `noindex`.

## What to consolidate, in priority order

1. **One eyebrow, one column header, one numeric cell — as atoms.** The 11px caps label class is declared in 12 files (`EYEBROW`, `th`, `HEAD`), the right-aligned tabular class in 4. Add `Eyebrow`, `ColumnHeader` and `Num` to `src/components/copy` and delete the constants. A restyle then happens in one place.

2. **One table primitive.** Six tables exist in two dialects: three `div role="table"` grids (markets, campaigns, devices) and three shadcn `Table`s with the pinned-header scroll box (trend, campaign traffic, efficiency). Pick the shadcn dialect, wrap it as `DataTable` in `charts/` (scroll box, pinned header and footer, `table-fixed`, container-query column hiding by a `hideBelow` prop), and move the three grids onto it. The efficiency table's overflow fix from today then applies everywhere.

3. **Move `scroll-mt-20` and `id` into `Panel`.** 13 panels repeat `className="scroll-mt-20"` next to their `id`. `Panel` should add the scroll margin whenever it has an id.

4. **Helpers drifted out of `lib`.** `ordinal` is defined twice (day card, day context), `cap` twice (chart config, insights), `times` once, `toFixed(1)` for pages-per-visit in three places. Put `ordinal`, `cap`, `times` and `pagesPerVisit` in `format.ts`, tested.

5. **Fixed heights are magic numbers.** `min-h-[19rem]`, `min-h-[19.5rem]`, `min-h-[10.75rem]` reserve the day card, the event card and its comparison box. They work, but they are tuned by eye. Give them tokens (`--card-day`, `--card-event`) next to `--plot-height` so the two cards and their skeletons cannot disagree.

6. **`METRIC_LABELS` still disagrees with the glossary** ("People reached" vs "Saw your hotel"). Derive the chart's labels from `glossary.ts`; the charts test that pins the order stays.

7. **Query fan-out on the Overview** (audit item 1 from the architecture audit, still open). Markets, campaigns, funnel and all-breakdowns each aggregate the same `breakdowns` rows; one `getBreakdownBundle(range)` would replace four scans. Website Traffic's five queries are already distinct; its cost is `getRecentEventImpacts`, which is two window queries per event (ten for five events) and could be one grouped query.

8. **`className` is accepted by 10 of 66 components.** Fine for organisms (they own their layout), but the atoms and molecules that pages place in grids (`QuickStat`, `InsightCard`, `DayCard`, `EventImpactCard`) should take it so a page never wraps them in a `div` to position them.

9. **Two components carry two responsibilities.** `activity-calendar.tsx` (248 lines) both computes the span window, ranks and week/month context and renders the grid; the computations belong in `lib/activity.ts` (three of them already are). `campaign-traffic-chart.tsx` (192 lines) holds the marker grouping and the tooltip; the grouping is a pure helper.

10. **Copy consistency.** "Visits" means ad clicks on the traffic screen and site visits on the Overview's quick stat. Both are right for their query, but one glossary entry should say so in the innkeeper's words, and `TrafficIntro` should read from it.

## Measured and fine

- Server time to first byte, warm, three runs: Overview 37–58 ms, Website Traffic 46–52 ms (the shell; the body streams behind Suspense).
- No horizontal overflow in any panel at 375, 700, 900, 1024 and 1440 px on Website Traffic; none on the Overview at 375, 1024 and 1440 px.
- No `any`, no `TODO`, no `console.log` in `src`.
- Every test file names what it pins with the live literal, and every new assertion this week was falsified once (negative controls named in the commits).

## Not measured here

Lighthouse on the deployed URL (needs the migration applied and a deploy), colour contrast of the heat ramp's middle steps under text (no text sits on them), and the Overview's total SQL statement count per request (needs query logging).
