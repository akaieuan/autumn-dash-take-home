# Quality pass and the activity calendar — implementation plan

> **For agentic workers:** the tasks below are ordered so each one leaves the app green. Gates for every task: `npm run typecheck`, `npm run lint`, `npm test`, and a real render in the browser pane at 390px and 1440px.

**Goal:** clear the seven quality-of-life defects the owner named on 2026-09-17, and add the day-by-day activity calendar (a GitHub contribution graph read as "when do people visit your site") as a real component on the Website Traffic screen.

**Architecture:** every fix lands in a primitive or a component, never in a page. The page keeps composing. One new query (`getActivity`), one new component folder entry (`website-traffic/activity-calendar.tsx`), one new colour ramp in `globals.css` derived with `color-mix()` so it follows both themes.

**Spec:** `docs/superpowers/specs/` has no spec for these; they are owner defects reported against the running app, with two screenshots (glossary overlap, table dead space). The originating design intent is the artboard at https://claude.ai/artifact/9GkFW1kMUzeWPS3Njcqg9x.

## Global constraints

- Responsiveness is CSS only: Tailwind breakpoints and container queries. No `useIsMobile`, no `matchMedia` width check (gated by `tests/architecture.test.ts`).
- Corners are concentric by token: inner radius = outer − inset. No `rounded-md|lg|xl` literal in a component (gated).
- No margin utilities in components; spacing is `gap` and token padding (gated).
- Components never import `@/lib/db` as a value; pages import barrels only (gated).
- `Intl` lives only in `src/lib/format.ts` (gated).
- Money is cents in every DTO, formatted only in `format.ts`.
- Colour comes from tokens. Sequential ramps are one hue, light → dark (dataviz skill).

---

### Task 1: Changing the range must not snap the page to the top

**Problem.** `RangeSelect`, `RangeSegment` and `MetricSelect` push a new URL. Next.js scrolls to the top on a push, so an owner reading the funnel loses their place, and `loading.tsx` flashes the whole skeleton.

**Files**
- Modify: `src/components/layout/range-select.tsx` (client), `src/components/charts/metric-select.tsx` (client)
- Create: `src/components/layout/use-view-param.ts` — one hook both controls use
- Modify: `src/components/layout/range-segment.tsx` — becomes a client component using the same hook, so the pill row behaves like the dropdown
- Test: `tests/components/layout.test.tsx`

**Approach.** `useRouter().push(url, { scroll: false })` inside `startTransition`, and the control renders `data-pending` while the transition runs (opacity and `aria-busy`, never a layout change). The old content stays on screen until the server sends the new payload, so there is no skeleton flash and no scroll jump.

```ts
// use-view-param.ts
export function useViewParam(basePath: string) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const go = (params: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    start(() => router.push(`${basePath}?${q}`, { scroll: false }));
  };
  return { go, pending };
}
```

**Steps**
- [ ] Write the failing test: rendering `RangeSegment` and clicking "90d" calls the mocked router with `{ scroll: false }`.
- [ ] Add the hook, move all three controls onto it.
- [ ] Verify in the browser: scroll to the funnel at 1440px, switch 30d → 90d, the scroll position does not move.

### Task 2: The sidebar's "Other" group sits at the bottom

**Files**
- Modify: `src/lib/navigation.ts` — each nav group gains `placement: "main" | "footer"`
- Modify: `src/components/layout/sidebar.tsx`
- Test: `tests/components/sidebar.test.tsx`

Main groups render inside a `flex-1` region; footer groups render after it inside a block with `border-t border-sidebar-border pt-3`, so "Other" is pinned to the bottom and separated by a hairline. No margins: the `flex-1` above it does the pushing.

### Task 3: Insights carry their own small graph instead of a "See the trend" link

**Problem.** The anchor links ("See the trend") only re-focus a chart the owner is already looking at.

**Files**
- Modify: `src/lib/insights.ts` — drop `anchor`, add `chart?: InsightChart`
- Create: `src/components/dashboard/insight-chart.tsx`
- Modify: `src/components/dashboard/insight-card.tsx`, `index.ts`
- Test: `tests/insights.test.ts`, `tests/components/dashboard.test.tsx`

```ts
export type InsightChart =
  | { kind: "bars"; format: "money" | "count" | "pct"; bars: { label: string; value: number; tone: "current" | "previous" | "lastYear" }[] }
  | { kind: "share"; segments: { label: string; share: number }[] };
```

Every rule fills its own payload from numbers it already has, so a card's graph can never disagree with its sentence:

| insight | graph |
|---|---|
| `value-up` / `value-down` | booking value: this period, previous, last year |
| `yoy-up` | bookings: this period vs the same period last year |
| `cheaper-than-ota` | fee per booking vs what an agency would have charged |
| `campaign-riser`, `ctr-drop`, `new-market`, `event-*` | that one campaign or city, now vs before |
| `mobile` | the device split as a share bar |

`InsightChart` renders horizontal bars scaled to the payload's own max: label, bar, value. Tone maps to `--chart-1/2/3`, the same colours the trend chart uses, so green always means "now".

### Task 4: "What these numbers mean" becomes a panel in the bento

**Problem (screenshot).** The glossary's tab list is `lg:flex-col` but shadcn's `TabsList` pins `group-data-horizontal/tabs:h-8`, so the three column items collapse into a 32px box and their labels overlap. The section also sits alone under the bento, in dead space.

**Files**
- Modify: `src/components/dashboard/glossary-section.tsx` → `GlossaryPanel`, a `Panel` whose header action is the group pills (horizontal, where `h-8` is correct)
- Modify: `src/components/layout/grid.tsx` — add the `detail` variant `lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]`
- Modify: `src/app/page.tsx` — bottom rows become `two` (markets, campaigns) then `detail` (funnel, glossary)
- Modify: `src/components/dashboard/funnel-section.tsx` — body grows so the device bar sits at the panel's foot
- Test: `tests/components/dashboard.test.tsx`

### Task 5: Area and Line stop looking alike

**Files**
- Modify: `src/components/charts/trend-chart.tsx`

Area gets a real gradient (`0.35 → 0.02` down the plot) and no dots: it reads as a mass. Line keeps no fill, a 2.25px stroke and a visible dot per bucket when there are 31 or fewer of them: it reads as measurements. Bars are unchanged.

### Task 6: The table fills the chart's box and reads like a chart

**Problem (screenshot).** `TrendTable` caps itself at `--plot-height` while the panel is `h-full`, so a tall panel leaves a band of dead space under the table.

**Files**
- Modify: `src/components/charts/trend-table.tsx`
- Test: `tests/components/charts.test.tsx`

Drop the inline `maxHeight`; the box becomes `flex-1 min-h-0 overflow-auto`, exactly the box the chart occupies. Each row gains an inline bar under the current value, scaled to the largest bucket, in `--chart-1` — the table then carries the shape as well as the numbers. Header and footer keep their hairlines and stay pinned.

### Task 7: The activity calendar

**Goal.** "Which days do people actually visit?" — 53 weeks of daily website visits as a heatmap, on the Website Traffic screen. Always the trailing year ending on the last seeded day, whatever range the header shows, and it says so in its caption.

**Files**
- Create: `src/lib/db/queries/activity.ts`
- Modify: `src/lib/db/queries/index.ts`
- Create: `src/components/website-traffic/activity-calendar.tsx` (client: one delegated pointer handler)
- Modify: `src/components/website-traffic/index.ts`, `traffic-skeleton.tsx`, `src/app/website-traffic/page.tsx`
- Modify: `src/app/globals.css` — the five-step heat ramp
- Test: `tests/queries/activity.test.ts` (PGlite, hand-computed), `tests/components/website-traffic.test.tsx`

**Query.**

```ts
export interface ActivityDay { date: string; value: number | null }  // null = before the data starts
export interface ActivityDto { from: string; to: string; weeks: number; max: number; total: number; days: ActivityDay[] }
export async function getActivity(db: AnyDb, to: string, metric: TrendMetric, weeks = 53): Promise<ActivityDto>
```

The grid starts on the Sunday on or before `to − (weeks × 7 − 1)`, so every column is a full week and the last column ends on `to`. Days with no row come back `null` and render as an empty cell, never as a zero.

**Colour.** Five steps, one hue, derived from the existing `--chart-1` so both themes follow automatically:

```css
--heat-0: var(--muted);
--heat-1: color-mix(in oklab, var(--chart-1) 22%, var(--card));
--heat-2: color-mix(in oklab, var(--chart-1) 45%, var(--card));
--heat-3: color-mix(in oklab, var(--chart-1) 70%, var(--card));
--heat-4: var(--chart-1);
```

Thresholds are quartiles of the window's own maximum, so a quiet hotel and a busy one both get a readable spread.

**Layout.** `grid-rows-7 grid-flow-col auto-cols-fr gap-[2px]`, cells `aspect-square rounded-(--radius-min)`. Because the columns are `1fr`, the whole year always fits its container and the squares shrink instead of scrolling sideways. Month labels sit above, each placed with `gridColumnStart` at the week its month begins; weekday initials sit to the left and hide under a container-query width.

**Hover.** One delegated `pointermove` handler on the grid reads `data-date` / `data-value` off the cell under the pointer and writes a readout into a fixed-height line in the panel header ("Tue, Sep 1 · 412 visits"). No floating bubble, so nothing can overflow the page, and no per-cell listeners. Every cell also carries an `aria-label`, and the legend runs "Fewer → More".

### Task 8: Gates, tests and the record

- [ ] `npm run typecheck`, `npm run lint`, `npm test` all green, counts re-measured from the run.
- [ ] `npm run build` clean, both routes listed.
- [ ] Browser pane at 390px and 1440px: no sideways scroll, no overlap, header one line.
- [ ] `docs/decisions.md` gains rows: insight graphs replace anchor links; glossary as a bento panel; the activity calendar and its trailing-year window; range changes without scroll.
- [ ] `docs/architecture-audit-2026-09-17.md` item 3 (skeleton flash) is struck through with the date it was fixed.
