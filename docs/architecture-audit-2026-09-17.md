# Architecture audit — 2026-09-17

Scope: the `feat/overview-component-library` branch as it stands after the sidebar landed (uncommitted work included). Measured, not recalled: 98 source files, 65 component files, 12 client components outside `ui/`, 118 tests in 22 files, `next build` clean with three dynamic routes (`/`, `/website-traffic`, `/_not-found`).

Verdict in one line: the layering is right and enforced, the server/client split is disciplined, and the two things worth fixing before more screens land are duplicated data fetching per request and the absence of any caching for data that only changes on reseed.

## What is sound

**Layering is real and gated.** Pages compose (`page.tsx` is 120 lines, no JSX beyond composition), queries fetch and return DTOs, components render DTOs and never import the database. `tests/architecture.test.ts` greps for every one of those rules plus the layout rules (no margin utilities, no radius literals, no viewport hooks, barrel-only imports), so a regression is a red test, not a review comment.

**Server-first, with client components only where the browser is the source of truth.** Twelve client files: the trend chart (Recharts), its style switch and metric select, the range dropdown, the collapsible, the theme switch, the sidebar and phone sheet, the nav list, and the assistant popover. Everything else, including every table and panel, is server-rendered. No client data library is installed and none is needed.

**State lives in the right place.** Range and metric are URL search params, so every view is shareable and server-rendered. Sidebar width is a cookie the root layout reads, so the first paint is already correct. Theme and chart style are per-browser preferences in `localStorage`, read through `useSyncExternalStore` with a stable server snapshot, and the theme is applied by an inline script before first paint. Nothing is duplicated into React context.

**Layout adapts by CSS alone.** Breakpoints for the page grid and header, container queries for tables and stat cells, and tokens for gutters, padding, radii and plot height. No `matchMedia` width checks anywhere; the gate forbids them.

**Money and time are handled once.** Dollars become cents at the query boundary, formatting happens only in `format.ts`, "today" is `MAX(date)`, buckets start on the range's first day. Query tests run against PGlite with hand-computed fixtures.

## What to fix, in priority order

1. **Redundant queries per request.** The Overview runs `getMarkets`, `getCampaigns`, `getFunnel` and `getAllBreakdowns`; the last three each re-aggregate the same `breakdowns` rows the first already fetched, so one request scans that table four times. Replace with one `getBreakdownBundle(range)` that aggregates once and derives markets, campaigns, devices and the insight input from it. Both pages also call `getDataBounds` separately from the range parse; fold the two into a `resolveRange(searchParams)` helper shared by every page.

2. **No caching for data that only changes on reseed.** Every navigation hits Supabase five or six times. Next.js 16 `"use cache"` with a long `cacheLife` on the query functions, keyed by range and metric, plus a tag the seed script revalidates, turns most navigations into cache hits. The root layout's `cookies()` read already makes everything dynamic, which is fine; caching belongs at the query layer, not the route.

3. ~~**Skeleton flash on every range or metric change.**~~ Fixed 2026-09-17 (D32): `useViewParam` pushes inside a transition with `scroll: false`. A search-param change re-renders the page and trips `loading.tsx`, so the whole body flickers to a skeleton for a fast query. Wrap the pushes in `RangeSelect` and `MetricSelect` in `startTransition` and show a subtle pending state on the control instead; the old content stays until the new one is ready.

4. **Route structure for growth.** The two screens are flat routes that each hand `AppShell` the same props. Move them under a `(dashboard)` route group with one `layout.tsx` owning the top bar chrome, a shared `loading.tsx` and `error.tsx`. The range must stay per-page because layouts do not receive search params, which is why item 1's helper matters.

5. **One metric, two names.** The chart's `METRIC_LABELS` says "People reached" where the glossary says "Saw your hotel". Derive chart labels from `glossary.ts` so a rename happens in one file.

6. **Error isolation.** One failing query inside the Suspense boundary takes down the whole lower half of the page. Give each panel its own error boundary with the calm "couldn't load" state, so a slow or broken breakdown does not hide the headline's neighbours.

7. **Repeated table header strings.** The uppercase `th` class string is copied into four files. Extract a `ColumnHeader` atom next to `MetricLabel`.

8. **Gate holes worth closing.** The margin gate misses negative and logical margins (`-mx-`, `ms-`); the greys used for comparison lines sit below 3:1 non-text contrast in light mode. Neither blocks, both are one-line fixes.

## Navigation patterns, checked

- Primary navigation is data (`src/lib/navigation.ts`); the sidebar, the phone sheet and the top bar all read it, so a new destination is one entry.
- Built destinations are `next/link` with `aria-current`; unbuilt ones are disabled buttons that say "Soon", never dead links.
- Insight links use in-page anchors to panels with `scroll-mt`, which also survives the sticky sidebar.
- The phone sheet closes on navigate; the collapsed rail keeps tooltips so icons stay labelled.
- Missing: a skip-to-content link, and keyboard shortcuts are not needed yet.

## Styling, checked

- Colour comes from tokens only; light and dark themes share hues. Identity colours for campaigns, cities and devices passed the colour-blind and contrast validator in both modes; amber is always paired with a text label.
- Corners are concentric by token, and the gate forbids literal radii.
- Type is one family with tabular numerals everywhere a number appears.
- Spacing is `gap`, never margins; padding comes from tokens; the one deliberate exception is the shadcn primitives, which are CLI-owned.

## Documentation debt

- `docs/decisions.md` lacks rows for D26 (chart tokens), D27 (layout rhythm), D28 (concentric corners), D29 (Overview composition), D30 (Ask Autumn), D31 (Website traffic as the second screen) and the new dark theme, which reverses D7.
- CLAUDE.md §12 still records light-only and `/bookings`; both need dated corrections.
- The query-layer handoff note lists a deleted export.

## Repository state

About forty files of work are uncommitted on the branch. Commit in coherent chunks (sidebar and navigation; theme; palette and share bars; funnel and glossary; website traffic scaffold) before the next feature, so each can be reverted alone.
