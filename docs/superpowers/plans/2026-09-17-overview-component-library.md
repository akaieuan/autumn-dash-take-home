# Overview Screen and Component Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Model routing (owner's rule, 2026-09-17):** the coordinator that plans, briefs, reviews and merges is Fable 5.1; every builder and reviewer subagent is dispatched with `model: "opus"` (Opus 5), stated explicitly on each Agent call. Builders work in their own worktree with `DATABASE_URL` and `npm install` done before any gate; they never push.

**Goal:** Build the atomic component library and the redesigned Overview screen (`/`) so that a hotel owner opens the deployed page and reads, in one sentence and one strip of numbers, whether Autumn is bringing them direct bookings, with feeder markets, live campaigns, one trend chart and computed insights underneath.

**Architecture:** Server Components fetch typed DTOs through `src/lib/db/queries/*` and hand them to organisms in `src/components/{layout,copy,charts,dashboard,assistant}` (the owner's folder layout of 2026-09-17: shared atoms in `layout/`, `copy/`, `charts/`; the Overview's organisms in `dashboard/`; the second screen's in `website-traffic/`, empty until that plan); the page only composes. Layout is CSS-only (Tailwind breakpoints and container queries, spacing tokens in `globals.css`); every async region has a same-size skeleton so nothing shifts. Five client components exist because they need the browser (trend chart, chart style switch, metric select, collapsible, assistant popover); everything else is server-rendered.

**Tech Stack:** Next.js 16.3 App Router, React 19.2, TypeScript, Tailwind 4, shadcn CLI 4 (radix-nova) with `chart` (Recharts 3), Drizzle + postgres-js on Supabase, Vitest 5 with PGlite (queries) and jsdom (components).

**Spec:** `docs/superpowers/specs/2026-09-17-autumn-dashboard-design.md` (§3 Overview, §5 architecture, §6 empty states, §7 tests) as corrected by the design artboard "Autumn Dashboard Redesign" (https://claude.ai/artifact/9GkFW1kMUzeWPS3Njcqg9x, boards: User story, Architecture, Atoms, Molecules, Organisms, Overview 1280 / 390 / 1728, Ask Autumn popover). Where the artboard and spec §3 differ, the artboard wins; Task 12 records the differences in `docs/decisions.md` and corrects the spec in place.

## Global Constraints

- Node 24, npm. Pin every dependency to the version `npm install` resolves; no `latest` in `package.json`.
- **Pages compose, components render, queries fetch.** No `@/lib/db` import under `src/components`. No SQL outside `src/lib/db/queries`. No `Intl` outside `src/lib/format.ts`. Pages import a folder's `index.ts` barrel (`@/components/dashboard`), never a file inside it. `src/components/ui` is CLI-owned and has no barrel.
- **Money:** `numeric` dollars in the database, integer cents in every DTO (converted once, in the query with `toCents`), formatted only in `format.ts`. Percentages computed in the query from the same rows.
- **"Today" is `MAX(date)`** from `daily_metrics`; never `new Date()` in a query, page or component.
- **Fee:** 15% (`PROPERTY.feeRateBps = 1500`) of attributed booking value. OTA commission for comparisons: 18%.
- **Copy:** every metric rendered has a `glossary.ts` entry; acronyms appear once per screen, in parentheses after the plain phrase; click-through shown as "1 in N".
- **Theme:** light only; tokens from `globals.css`; components use theme classes (`bg-card`, `text-muted-foreground`, `text-primary`), never hex.
- **Responsive layout is CSS only.** Tailwind breakpoints (`sm: 640`, `lg: 1024`, `2xl: 1536`) and container queries (`@container`, `@md:`, `@lg:`). Never `useIsMobile`, `matchMedia`, `window.innerWidth` or any hook that branches layout in JS (owner's rule, 2026-09-17; `tests/architecture.test.ts` enforces it).
- **Spacing standard (the "rhythm"):** parents set `gap`, children never set outer margins. Scale: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 48 px (`gap-1 … gap-12`). Page gutter, stack gap, panel padding and plot height are CSS variables in `globals.css` (`--page-gutter`, `--stack-gap`, `--panel-pad`, `--plot-height`) that change per breakpoint; components reference them (`px-(--page-gutter)`, `p-(--panel-pad)`), never a literal.
- **Concentric corners (owner's rule, 2026-09-17):** a rounded box inside a rounded box takes the parent's radius minus its inset, never a guessed value. Tokens: `--radius-panel` (outer cards and popovers), `--panel-pad`, `--r-in` = `--radius-panel − --panel-pad` (any inset box directly inside a panel), `--radius-min` (the clamp, 4px), `--radius-float` and `--float-pad` (tooltips). Components use `rounded-(--radius-panel)`, `rounded-(--r-in)`, `rounded-(--radius-float)` or `rounded-full` (pills are exempt) and never `rounded-md|lg|xl|2xl` literals; `tests/architecture.test.ts` greps for it. Paddings are the same tokens, so the geometry is fixed by construction.
- **No layout shift:** every `Suspense` fallback is the same organism's `*Skeleton` with identical box classes; plot heights are fixed by `--plot-height`; the chart style switch and the collapsible never change a container's height on hydration (collapsibles render closed on server and client; chart style is read from `localStorage` after mount inside a fixed-height box); every number uses `tabular-nums`.
- **Charts:** one coloured series per chart (this period in `--chart-1`), comparisons in greys (`--chart-2`, `--chart-3`); the only two-series case (campaign share meters) uses `--chart-1` and `--chart-4` with labels. No pie, donut, radar or dual axis. Every chart has an `aria-label`, a legend when it has 2+ series, and a table twin reachable without hover.
- **Tests:** component tests carry `// @vitest-environment jsdom` on line 1 (the config default is `node` for PGlite). Every new assertion is falsified once (break, red, restore) and the control is named in the commit.
- Every task ends green on `npm run typecheck && npm run lint && npm test`. Tasks 11 and 12 also run `npm run build` and, with `DATABASE_URL` present, the dev server through the preview tool for screenshots at 390, 1280 and 1728 px (sent to the owner, never described).
- Commits: title says what was wrong or missing; body lists the gates run with their printed lines and the negative control; end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Never `git add -A` (`.env.example` is tracked; stage paths).
- Human gates (CLAUDE.md §4): push, deploy, anything judged by eye. A task that reaches one stops and reports.

## File Structure

```
src/app/globals.css                          + layout tokens, re-stepped chart tokens
src/app/layout.tsx                           unchanged
src/app/page.tsx                             REPLACED: awaits searchParams → parseRange → queries → compose
src/app/loading.tsx, error.tsx, not-found.tsx NEW
src/lib/property.ts                          PROPERTY, OTA_COMMISSION_RATE (the app never imports scripts/)
src/lib/format.ts                            money, compact, pct, delta, deltaText, oneIn, dates
src/lib/glossary.ts                          glossary entries, campaign/device key maps, MARKET_HINTS
src/lib/insights.ts                          computeInsights(input): InsightDto[]  (pure, D24)
src/lib/db/queries/types.ts                  PeriodTotals, n(), toCents(), chunkSums()
src/lib/db/queries/meta.ts                   getDataBounds
src/lib/db/queries/overview.ts               getOverview, getQuickAnalytics
src/lib/db/queries/trend.ts                  getTrend
src/lib/db/queries/breakdowns.ts             getMarkets, getCampaigns, getFunnel
src/components/ui/{popover,collapsible,toggle-group}.tsx   shadcn CLI adds
src/components/layout/{page-shell,stack,grid,panel,empty-state,collapsible-section,top-bar,range-segment,app-shell,index}.tsx
src/components/copy/{metric-label,delta-text,value,insight-tag,live-dot,glossary-entry,index}.tsx
src/components/charts/{chart-config,meter,sparkline,chart-legend,use-chart-style,style-segment,metric-select,trend-table,trend-chart,index}.ts(x)
src/components/dashboard/{headline,quick-stat,quick-analytics,insight-card,insight-list,glossary-section,overview-skeleton,market-row,feeder-markets,campaign-row,campaign-summary,funnel-step,funnel-section,index}.tsx
src/components/website-traffic/                (owner's folder for the second screen; nothing lands here in this plan)
src/components/assistant/{prompt-chip,assistant-popover,index}.tsx
tests/{format,glossary,property,insights,architecture}.test.ts
tests/queries/{fixture,overview,trend,breakdowns}.test.ts
tests/components/{layout,copy,charts,dashboard,dashboard-sources,assistant,shell}.test.tsx
docs/decisions.md                            rows D26–D29
docs/superpowers/specs/2026-09-17-autumn-dashboard-design.md   §3 corrected in place, dated
```

Each file has one responsibility. Atoms (`copy/`, `charts/` atoms) know nothing about DTOs; molecules take one DTO row; organisms take one DTO; the page takes the URL. Folders are by screen for organisms (`dashboard/`, `website-traffic/`) and by kind for what both screens share (`layout/`, `copy/`, `charts/`, `assistant/`).

---

### Task 1: Layout tokens, shadcn primitives, and the layout atoms

**Files:**
- Modify: `src/app/globals.css` (append after the `:root` block; replace the five `--chart-*` lines)
- Create: `src/components/layout/page-shell.tsx`, `stack.tsx`, `grid.tsx`, `panel.tsx`, `empty-state.tsx`, `index.ts`
- Create (CLI): `src/components/ui/popover.tsx`, `collapsible.tsx`, `toggle-group.tsx`
- Test: `tests/components/layout.test.tsx`, `tests/architecture.test.ts`

**Interfaces:**
- Produces:
  - `PageShell({ children }): JSX` — `<main>` with `px-(--page-gutter)`, vertical `gap-(--stack-gap)`, full width.
  - `Stack({ gap?: "sm" | "md" | "lg"; className?; children })` — vertical flex, `gap-3 | gap-(--stack-gap) | gap-8`.
  - `Grid({ variant: "two" | "three" | "sidebar" | "wide-three"; className?; children })` — `two`: 1 → 2 cols at lg; `three`: 1 → 3 at lg; `sidebar`: 1 → `2fr 1fr` at lg; `wide-three`: 1 → 2 at lg → 3 at 2xl. Always `gap-(--stack-gap)`.
  - `Panel({ id?, className?, children })`, `PanelHeader({ title, description?, action?, headingId? })`, `PanelBody({ className?, children })` — a card with `p-(--panel-pad)`; `PanelHeader` renders `<h2 id={headingId}>`.
  - `EmptyState({ title, description? })`.
  - `tests/architecture.test.ts` — the grep gates every later task must keep green.

- [ ] **Step 1: Add shadcn primitives with the CLI (never hand-written)**

Run:
```bash
npx shadcn@latest add popover collapsible toggle-group
```
Expected: three new files under `src/components/ui/`; `git status` shows nothing else changed except possibly `package.json`/lockfile (radix-ui is already a dependency; if the CLI adds a package, pin the resolved version).

- [ ] **Step 2: Write the failing architecture test**

```ts
// tests/architecture.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out); else if (/\.(ts|tsx|css)$/.test(name)) out.push(p);
  }
  return out;
}
const read = (p: string) => readFileSync(p, "utf8");
const components = () => walk("src/components").filter((p) => !p.includes("/ui/"));

describe("architecture gates (CLAUDE.md §2 invariants)", () => {
  it("components never fetch: no @/lib/db import under src/components", () => {
    for (const f of components()) expect(read(f), f).not.toMatch(/from\s+["']@\/lib\/db/);
  });
  it("layout adapts by CSS only: no viewport hooks anywhere in src", () => {
    for (const f of walk("src")) expect(read(f), f).not.toMatch(/useIsMobile|matchMedia|window\.innerWidth|useMediaQuery/);
  });
  it("money is formatted only in format.ts", () => {
    for (const f of walk("src").filter((p) => !p.endsWith("src/lib/format.ts"))) expect(read(f), f).not.toMatch(/Intl\.NumberFormat/);
  });
  it("pages import barrels, never a file inside a component folder", () => {
    for (const f of walk("src/app")) expect(read(f), f).not.toMatch(/from\s+["']@\/components\/(layout|copy|charts|dashboard|website-traffic|bookings|assistant)\/[a-z]/);
  });
  it("globals.css carries the layout tokens and no dark block", () => {
    const css = read("src/app/globals.css");
    for (const t of ["--page-gutter", "--stack-gap", "--panel-pad", "--plot-height", "--radius-panel", "--r-in", "--radius-min", "--radius-float"]) expect(css).toContain(`${t}:`);
    expect(css).not.toMatch(/\.dark\s*\{/);
    expect(css).toMatch(/--chart-1:\s*#3f6b55/);
  });
  it("components set no outer margins (parents own spacing with gap)", () => {
    // Any margin utility (m-, mt-, mx-, ml-…) anywhere in a component file, whether in className="…" or inside cn("…").
    for (const f of components()) expect(read(f), f).not.toMatch(/(?<![\w-])m[tblrxy]?-[\w(\[]/);
  });
  it("corners are concentric: only radius tokens or pills, never rounded-md/lg/xl literals", () => {
    // Includes directional forms such as rounded-t-xl and rounded-tl-md.
    for (const f of components()) expect(read(f), f).not.toMatch(/\brounded-(?:[trblse]{1,2}-)?(xs|sm|md|lg|xl|2xl|3xl|4xl)\b/);
  });
});
```

- [ ] **Step 3: Run it to see it fail on the tokens**

Run: `npx vitest run tests/architecture.test.ts`
Expected: FAIL on "globals.css carries the layout tokens" (`--page-gutter` missing, `--chart-1` still `#6f8b7a`). The other five pass on an empty library; they exist to catch later tasks.

- [ ] **Step 4: Add the tokens to globals.css**

Replace the five `--chart-*` lines inside `:root` with:
```css
  /* Chart marks, re-stepped 2026-09-17 for contrast on the paper surface (dataviz validator: this period + greys = emphasis form; D26) */
  --chart-1: #3f6b55; /* this period */
  --chart-2: #a9a8a2; /* previous period */
  --chart-3: #cfcdc6; /* same period last year */
  --chart-4: #a0661e; /* second series, campaigns only */
  --chart-5: #95938c;
```
Append after the `:root { … }` block (before `@layer base`):
```css
/* Layout rhythm (D27) and concentric corners (D28). Components reference these; they never carry a literal gutter, padding or radius. */
:root {
  --page-gutter: 1rem;
  --stack-gap: 1rem;
  --plot-height: 200px;
  --radius-panel: 1.5rem;   /* outer cards, popovers */
  --panel-pad: 1rem;        /* inset of anything directly inside a panel */
  --radius-min: 4px;
  --r-in: max(var(--radius-min), calc(var(--radius-panel) - var(--panel-pad)));   /* 8px: rows, chips, empty states inside a panel */
  --radius-float: 1rem;     /* chart tooltips */
  --float-pad: 0.75rem;
  --r-float-in: max(var(--radius-min), calc(var(--radius-float) - var(--float-pad)));
}
@media (min-width: 640px) {
  :root { --page-gutter: 1.5rem; }
}
@media (min-width: 1024px) {
  :root { --page-gutter: 2rem; --stack-gap: 1.25rem; --plot-height: 260px; --radius-panel: 1.75rem; --panel-pad: 1.25rem; }  /* 28 − 20 keeps --r-in at 8px */
}
@media (min-width: 1536px) {
  :root { --page-gutter: 3rem; }
}
```

- [ ] **Step 5: Write the failing layout render test**

```tsx
// @vitest-environment jsdom
// tests/components/layout.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageShell, Stack, Grid, Panel, PanelHeader, PanelBody, EmptyState } from "@/components/layout";

describe("layout atoms", () => {
  it("PageShell is a main landmark that uses the gutter token", () => {
    render(<PageShell><p>hi</p></PageShell>);
    const main = screen.getByRole("main");
    expect(main.className).toContain("px-(--page-gutter)");
    expect(main.className).toContain("gap-(--stack-gap)");
  });
  it("Grid variants map to breakpoint classes only", () => {
    const { container } = render(<Grid variant="wide-three"><div /></Grid>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("grid-cols-1");
    expect(el.className).toContain("lg:grid-cols-2");
    expect(el.className).toContain("2xl:grid-cols-3");
  });
  it("Panel renders a titled section with the padding token", () => {
    render(<Panel id="markets"><PanelHeader headingId="mk" title="Where your guests come from" description="Ranked by bookings." action={<a href="#all">All</a>} /><PanelBody>body</PanelBody></Panel>);
    expect(screen.getByRole("heading", { level: 2, name: "Where your guests come from" })).toBeInTheDocument();
    expect(screen.getByText("Ranked by bookings.")).toBeInTheDocument();
    expect(document.getElementById("markets")?.className).toContain("p-(--panel-pad)");
    expect(document.getElementById("markets")?.className).toContain("rounded-(--radius-panel)");
    expect(document.getElementById("markets")?.className).not.toContain("rounded-xl"); // cn must drop the Card's base radius
    expect(document.getElementById("markets")?.className).toContain("overflow-visible"); // chart tooltips must not clip at the panel edge
  });
  it("EmptyState says something rather than rendering a blank card", () => {
    render(<EmptyState title="Nothing needs your attention this period" description="Autumn will flag anything that changes." />);
    expect(screen.getByText("Nothing needs your attention this period")).toBeInTheDocument();
    expect(screen.getByText("Nothing needs your attention this period").parentElement?.className).toContain("rounded-(--r-in)");
  });
  it("Stack exposes small, default and large gaps", () => {
    const { container } = render(<Stack gap="lg"><i /></Stack>);
    expect((container.firstElementChild as HTMLElement).className).toContain("gap-8");
  });
});
```

- [ ] **Step 6: Run it red**

Run: `npx vitest run tests/components/layout.test.tsx`
Expected: FAIL — cannot resolve `@/components/layout`.

- [ ] **Step 7: Implement the layout atoms**

```tsx
// src/components/layout/page-shell.tsx
import { cn } from "@/lib/utils";

/** The page column: full width, gutter and vertical rhythm from globals.css tokens. */
export function PageShell({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <main className={cn("flex w-full flex-1 flex-col gap-(--stack-gap) px-(--page-gutter) pb-12 pt-6", className)}>
      {children}
    </main>
  );
}
```

```tsx
// src/components/layout/stack.tsx
import { cn } from "@/lib/utils";

const GAPS = { sm: "gap-3", md: "gap-(--stack-gap)", lg: "gap-8" } as const;

export function Stack({ gap = "md", className, children }: { gap?: keyof typeof GAPS; className?: string; children: React.ReactNode }) {
  return <div className={cn("flex flex-col", GAPS[gap], className)}>{children}</div>;
}
```

```tsx
// src/components/layout/grid.tsx
import { cn } from "@/lib/utils";

/** Page-level grids. Column changes are breakpoint classes only; never a JS viewport check. */
const VARIANTS = {
  two: "grid-cols-1 lg:grid-cols-2",
  three: "grid-cols-1 lg:grid-cols-3",
  sidebar: "grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]",
  "wide-three": "grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3",
} as const;

export function Grid({ variant, className, children }: { variant: keyof typeof VARIANTS; className?: string; children: React.ReactNode }) {
  return <div className={cn("grid gap-(--stack-gap) *:min-w-0", VARIANTS[variant], className)}>{children}</div>;
}
```

```tsx
// src/components/layout/panel.tsx
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

/** A titled card. Radius and padding come from tokens so an inset child using rounded-(--r-in) is concentric with it (D28). */
export function Panel({ id, className, children }: { id?: string; className?: string; children: React.ReactNode }) {
  return (
    <Card id={id} className={cn("gap-4 overflow-visible rounded-(--radius-panel) p-(--panel-pad) [--card-spacing:0px]", className)}>
      {children}
    </Card>
  );
}

export function PanelHeader({ title, description, action, headingId }: { title: string; description?: string; action?: React.ReactNode; headingId?: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 id={headingId} className="text-base font-semibold leading-snug">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0 text-xs font-medium">{action}</div> : null}
    </div>
  );
}

export function PanelBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("flex min-w-0 flex-col", className)}>{children}</div>;
}
```

```tsx
// src/components/layout/empty-state.tsx
export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-(--r-in) bg-background px-4 py-6 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}
```

```ts
// src/components/layout/index.ts
export { PageShell } from "./page-shell";
export { Stack } from "./stack";
export { Grid } from "./grid";
export { Panel, PanelHeader, PanelBody } from "./panel";
export { EmptyState } from "./empty-state";
```

- [ ] **Step 8: Run green, then all gates**

Run: `npx vitest run tests/components/layout.test.tsx tests/architecture.test.ts` — Expected: 12 passed.
Run: `npm run typecheck && npm run lint && npm test` — Expected: typecheck no output, lint exit 0, `Test Files  N passed` with N re-measured.

Negative control: change `--chart-1` back to `#6f8b7a`, run the architecture test, watch it go red, restore.

- [ ] **Step 9: Commit**

```bash
git add src/app/globals.css src/components/layout src/components/ui/popover.tsx src/components/ui/collapsible.tsx src/components/ui/toggle-group.tsx tests/components/layout.test.tsx tests/architecture.test.ts package.json package-lock.json
git commit -m "Add layout rhythm tokens, layout atoms and the architecture gate

Gutter, stack gap, panel padding, panel radius and plot height are CSS
variables that change per breakpoint; --r-in derives the concentric inner
radius from them. PageShell, Stack, Grid, Panel and EmptyState reference them. tests/architecture.test.ts fails on any @/lib/db import
under components, any viewport hook, Intl outside format.ts, a page
importing past a barrel, a component with an outer margin, or a
rounded-lg literal where a radius token belongs.
Negative control: reverting --chart-1 reddened the token assertion (restored).
Gates: vitest <N> files passed; typecheck 0; lint 0.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Pure logic — `property.ts`, `format.ts`, `glossary.ts`

**Files:**
- Create: `src/lib/property.ts`, `src/lib/format.ts`, `src/lib/glossary.ts`
- Test: `tests/property.test.ts`, `tests/format.test.ts`, `tests/glossary.test.ts`

**Interfaces:**
- Produces:
  - `PROPERTY = { name, city, region, roomCount, feeRateBps: 1500 }`, `OTA_COMMISSION_RATE = 0.18`
  - `money(cents): string` (`$18,240`), `moneyCompact(cents)` (`$18.2k`), `compact(n)` (`6.4k`), `pct(fraction, digits = 0)` (`48%`), `delta(current, previous | null): { pct: number | null; direction: "up" | "down" | "flat" }`, `deltaText(current, previous, vsLabel): string | null` (`+17% vs the previous 30 days`), `oneIn(rate): string` (`1 in 12`), `shortDate(iso)` (`Sep 1`), `longDate(iso)` (`Sep 1, 2026`), `bucketLabel(iso, granularity)`, `rangeLabel(from, to)` (`Aug 18 – Sep 16, 2026`)
  - `type GlossaryKey`, `type CampaignKey`, `type DeviceKey`, `interface GlossaryEntry { label; industryTerm?; meaning; purpose? }`, `glossary: Record<GlossaryKey, GlossaryEntry>`, `campaignKey(seedLabel): CampaignKey | null`, `deviceKey(seedLabel): DeviceKey | null`, `MARKET_HINTS: Record<string, string>`

- [ ] **Step 1: Failing tests**

```ts
// tests/property.test.ts
import { describe, it, expect } from "vitest";
import { PROPERTY, OTA_COMMISSION_RATE } from "@/lib/property";
import { PROPERTY as SEEDED } from "../scripts/seed/profile";

describe("property", () => {
  it("matches the seeded property so copy and fee agree with the data", () => {
    expect(PROPERTY).toEqual(SEEDED);
    expect(PROPERTY.feeRateBps).toBe(1500);
    expect(OTA_COMMISSION_RATE).toBe(0.18);
  });
});
```

```ts
// tests/format.test.ts
import { describe, it, expect } from "vitest";
import { money, moneyCompact, compact, pct, delta, deltaText, oneIn, shortDate, longDate, bucketLabel, rangeLabel } from "@/lib/format";

describe("format", () => {
  it("money renders whole dollars from cents", () => {
    expect(money(1824000)).toBe("$18,240");
    expect(money(0)).toBe("$0");
    expect(money(-125000)).toBe("-$1,250");
    expect(money(44450)).toBe("$445");
  });
  it("compact forms abbreviate", () => {
    expect(moneyCompact(1824000)).toBe("$18.2k");
    expect(moneyCompact(125000000)).toBe("$1.25M");
    expect(compact(6400)).toBe("6.4k");
    expect(compact(950)).toBe("950");
  });
  it("pct rounds fractions", () => {
    expect(pct(0.4821)).toBe("48%");
    expect(pct(0.4821, 1)).toBe("48.2%");
  });
  it("delta handles zero and null previous", () => {
    expect(delta(41, 35)).toEqual({ pct: 17, direction: "up" });
    expect(delta(90, 100)).toEqual({ pct: -10, direction: "down" });
    expect(delta(100, 100)).toEqual({ pct: 0, direction: "flat" });
    expect(delta(5, 0)).toEqual({ pct: null, direction: "up" });
    expect(delta(5, null)).toEqual({ pct: null, direction: "flat" });
  });
  it("deltaText is a plain sentence fragment", () => {
    expect(deltaText(41, 35, "the previous 30 days")).toBe("+17% vs the previous 30 days");
    expect(deltaText(100, 100, "this time last year")).toBe("No change vs this time last year");
    expect(deltaText(5, 0, "last year")).toBeNull();
  });
  it("oneIn and dates read the way an owner says them", () => {
    expect(oneIn(0.083)).toBe("1 in 12");
    expect(oneIn(0)).toBe("none");
    expect(shortDate("2026-09-01")).toBe("Sep 1");
    expect(longDate("2026-09-01")).toBe("Sep 1, 2026");
    expect(bucketLabel("2026-09-01", "month")).toBe("Sep 2026");
    expect(bucketLabel("2026-08-31", "week")).toBe("Wk of Aug 31");
    expect(bucketLabel("2026-09-01", "day")).toBe("Sep 1");
    expect(rangeLabel("2026-08-18", "2026-09-16")).toBe("Aug 18 – Sep 16, 2026");
    expect(rangeLabel("2025-12-20", "2026-01-05")).toBe("Dec 20, 2025 – Jan 5, 2026");
  });
});
```

```ts
// tests/glossary.test.ts
import { describe, it, expect } from "vitest";
import { glossary, campaignKey, deviceKey, MARKET_HINTS } from "@/lib/glossary";
import { DIMENSION_DEFS } from "../scripts/seed/profile";

describe("glossary", () => {
  it("every entry has a plain label and a meaning without a bare acronym", () => {
    for (const [key, e] of Object.entries(glossary)) {
      expect(e.label, key).not.toMatch(/\b(CTR|CVR|ROAS|CPC|OTA)\b/);
      expect(e.meaning.length, key).toBeGreaterThan(20);
    }
  });
  it("maps every seeded campaign and device label to a key", () => {
    for (const d of DIMENSION_DEFS.campaign) expect(campaignKey(d.label), d.label).not.toBeNull();
    for (const d of DIMENSION_DEFS.device) expect(deviceKey(d.label), d.label).not.toBeNull();
    expect(campaignKey("Nope")).toBeNull();
  });
  it("has a drive hint for every named feeder market except Other", () => {
    for (const d of DIMENSION_DEFS.feeder_market) if (d.label !== "Other") expect(MARKET_HINTS[d.label], d.label).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run red**

Run: `npx vitest run tests/property.test.ts tests/format.test.ts tests/glossary.test.ts`
Expected: FAIL — modules missing.

- [ ] **Step 3: Implement**

```ts
// src/lib/property.ts
/** The one seeded property. The app imports this, never scripts/. tests/property.test.ts keeps it equal to the seed's copy. */
export const PROPERTY = { name: "Harbor House Inn", city: "South Haven", region: "Michigan", roomCount: 22, feeRateBps: 1500 } as const;
/** What an online travel agency typically charges; used only for "commission avoided" comparisons. */
export const OTA_COMMISSION_RATE = 0.18;
```

```ts
// src/lib/format.ts
import type { Granularity } from "./date-range";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const int = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export const money = (cents: number) => usd.format(Math.round(cents / 100));
export const count = (n: number) => int.format(Math.round(n));

const trim = (v: number, d: number) => String(Number(v.toFixed(d)));
export function compact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${trim(n / 1_000_000, 2)}M`;
  if (abs >= 1_000) return `${trim(n / 1_000, 1)}k`;
  return String(Math.round(n));
}
export const moneyCompact = (cents: number) => `${cents < 0 ? "-" : ""}$${compact(Math.abs(cents) / 100)}`;
export const pct = (fraction: number, digits = 0) => `${(fraction * 100).toFixed(digits)}%`;

export type Direction = "up" | "down" | "flat";
export function delta(current: number, previous: number | null): { pct: number | null; direction: Direction } {
  if (previous === null) return { pct: null, direction: "flat" };
  if (previous === 0) return { pct: null, direction: current > 0 ? "up" : "flat" };
  const p = Math.round(((current - previous) / previous) * 100);
  return { pct: p, direction: p > 0 ? "up" : p < 0 ? "down" : "flat" };
}
export function deltaText(current: number, previous: number | null, vsLabel: string): string | null {
  const d = delta(current, previous);
  if (d.pct === null) return null;
  if (d.pct === 0) return `No change vs ${vsLabel}`;
  return `${d.pct > 0 ? "+" : ""}${d.pct}% vs ${vsLabel}`;
}
export const oneIn = (rate: number) => (rate <= 0 ? "none" : `1 in ${Math.round(1 / rate)}`);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const parts = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return { y, m, d }; };
export const shortDate = (iso: string) => { const { m, d } = parts(iso); return `${MONTHS[m - 1]} ${d}`; };
export const longDate = (iso: string) => { const { y, m, d } = parts(iso); return `${MONTHS[m - 1]} ${d}, ${y}`; };
export function bucketLabel(iso: string, g: Granularity): string {
  const { y, m } = parts(iso);
  if (g === "month") return `${MONTHS[m - 1]} ${y}`;
  if (g === "week") return `Wk of ${shortDate(iso)}`;
  return shortDate(iso);
}
/** "Aug 18 – Sep 16, 2026", or both years when the range crosses one. */
export function rangeLabel(from: string, to: string): string {
  return parts(from).y === parts(to).y ? `${shortDate(from)} – ${longDate(to)}` : `${longDate(from)} – ${longDate(to)}`;
}
```

```ts
// src/lib/glossary.ts
export type CampaignKey = "brand_protection" | "discovery" | "hotel_ads" | "retargeting";
export type DeviceKey = "device_mobile" | "device_desktop" | "device_tablet";
export type GlossaryKey =
  | "direct_bookings" | "booking_value" | "autumn_fee" | "net_revenue"
  | "impressions" | "clicks" | "website_visits" | "new_visitors" | "pages_per_session" | "ctr" | "conversion"
  | CampaignKey | DeviceKey;

export interface GlossaryEntry { label: string; industryTerm?: string; meaning: string; purpose?: string }

/** One entry per figure an owner can see. Plain label first; the industry term appears once, in parentheses, in the tooltip. */
export const glossary: Record<GlossaryKey, GlossaryEntry> = {
  direct_bookings: { label: "Direct bookings", industryTerm: "attributed bookings", meaning: "Rooms booked on your own website after a guest saw or clicked an ad Autumn ran for you." },
  booking_value: { label: "Booking value", meaning: "The room revenue those bookings are worth, before Autumn's fee." },
  autumn_fee: { label: "Autumn's fee", meaning: "Autumn pays for the ads and charges 15% only on the bookings it brought you. Nothing on other bookings." },
  net_revenue: { label: "What you kept", meaning: "Booking value minus Autumn's fee. Money that stayed with the hotel." },
  impressions: { label: "People reached", industryTerm: "impressions", meaning: "How many times your hotel appeared in Google search or Google Hotels because of Autumn's ads." },
  clicks: { label: "Clicked to your website", industryTerm: "ad clicks", meaning: "How many of the people who saw an ad clicked through to your website." },
  website_visits: { label: "Website visits from ads", meaning: "People who arrived on your website from Autumn's ads. Slightly fewer than clicks, because a few pages never finish loading." },
  new_visitors: { label: "New visitors", meaning: "People who visited your website for the first time in this period." },
  pages_per_session: { label: "Pages per visit", meaning: "How many pages a visitor looked at, on average. More usually means more interest." },
  ctr: { label: "Clicked", industryTerm: "click-through rate", meaning: "Of the people who saw an ad, how many clicked. Shown as 1 in N." },
  conversion: { label: "Went on to book", industryTerm: "conversion rate", meaning: "Of the people who clicked, how many booked a room. Shown as 1 in N." },
  brand_protection: { label: "Protecting your name", industryTerm: "brand protection", meaning: "Ads on searches for your hotel's own name.", purpose: "Keeps online travel agencies from winning guests who were already looking for you." },
  discovery: { label: "Finding new guests", industryTerm: "discovery and competitor search", meaning: "Ads on searches like 'South Haven inn' or 'Lake Michigan bed and breakfast'.", purpose: "Reaches travellers who don't know you yet." },
  hotel_ads: { label: "Winning the price comparison", industryTerm: "Google Hotel Ads", meaning: "Your direct rate shown next to the agencies' prices on Google Hotels.", purpose: "Wins the comparison so guests book with you, not them." },
  retargeting: { label: "Reminding past visitors", industryTerm: "retargeting", meaning: "Ads shown to people who visited your site but didn't book.", purpose: "Brings back guests who were already interested." },
  device_mobile: { label: "Phone", meaning: "Visits and bookings made on a phone." },
  device_desktop: { label: "Computer", meaning: "Visits and bookings made on a laptop or desktop computer." },
  device_tablet: { label: "Tablet", meaning: "Visits and bookings made on a tablet." },
};

const CAMPAIGN_KEYS: Record<string, CampaignKey> = {
  "Brand Protection": "brand_protection",
  "Discovery & Competitors": "discovery",
  "Google Hotel Ads": "hotel_ads",
  Retargeting: "retargeting",
};
const DEVICE_KEYS: Record<string, DeviceKey> = { Mobile: "device_mobile", Desktop: "device_desktop", Tablet: "device_tablet" };

/** Seeded dimension_value → glossary key. Null for a label the glossary does not know (rendered as-is, and a test fails). */
export const campaignKey = (seedLabel: string): CampaignKey | null => CAMPAIGN_KEYS[seedLabel] ?? null;
export const deviceKey = (seedLabel: string): DeviceKey | null => DEVICE_KEYS[seedLabel] ?? null;

/** Drive-time hints for the seeded feeder markets (copy only; South Haven, Michigan as origin). */
export const MARKET_HINTS: Record<string, string> = {
  "Chicago, IL": "2 h 15 drive",
  "Grand Rapids, MI": "1 h 10 drive",
  "Detroit, MI": "2 h 45 drive",
  "Indianapolis, IN": "3 h 30 drive",
  "Milwaukee, WI": "by ferry",
  "Kalamazoo, MI": "45 min drive",
  "Columbus, OH": "5 h drive",
  "St. Louis, MO": "5 h 30 drive",
  "Toronto, ON": "6 h drive",
};
```

- [ ] **Step 4: Run green, all gates**

Run: `npx vitest run tests/property.test.ts tests/format.test.ts tests/glossary.test.ts` — Expected: 10 passed.
Run: `npm run typecheck && npm run lint && npm test`.

Negative control: rename `"Google Hotel Ads"` to `"Google Hotel Ad"` in `CAMPAIGN_KEYS`, run the glossary test, see "maps every seeded campaign" go red, restore.

- [ ] **Step 5: Commit**

```bash
git add src/lib/property.ts src/lib/format.ts src/lib/glossary.ts tests/property.test.ts tests/format.test.ts tests/glossary.test.ts
git commit -m "Add formatting, plain-language glossary and the property constants

Every seeded campaign and device label maps to a glossary key with a plain
name; feeder markets carry a drive-time hint. Money formats in one file.
Negative control: misspelling a campaign label reddened the map test (restored).
Gates: vitest <N> files passed; typecheck 0; lint 0.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---
### Task 3: Query layer — meta, overview totals, quick analytics

**Files:**
- Create: `src/lib/db/queries/types.ts`, `meta.ts`, `overview.ts`
- Test: `tests/queries/fixture.ts`, `tests/queries/overview.test.ts`

**Interfaces:**
- Consumes: `AnyDb`, `rowsOf` from `src/lib/db/types.ts`; `DateRange`, `eachDay` from `src/lib/date-range.ts`; `GlossaryKey` from `src/lib/glossary.ts`.
- Produces:
  - `interface PeriodTotals { bookings: number; valueCents: number; impressions: number; clicks: number; websiteVisits: number; newVisitors: number; pagesPerSession: number }`
  - `n(v: unknown): number`, `toCents(dollars: unknown): number`, `chunkSums(values: number[], chunks: number): number[]`
  - `getDataBounds(db): Promise<{ min: string; max: string }>`
  - `periodTotals(db, from, to): Promise<PeriodTotals>`
  - `interface OverviewDto { from; to; days; prevLabel: string | null; lastYearLabel: string | null; current: PeriodTotals; previous: PeriodTotals | null; lastYear: PeriodTotals | null; feeRateBps: number; feeCents: number; netCents: number }`; `getOverview(db, range, feeRateBps): Promise<OverviewDto>`
  - `interface QuickStatDto { key: GlossaryKey; kind: "count" | "money"; value: number; previous: number | null; spark: number[] }`; `interface QuickAnalyticsDto { stats: QuickStatDto[] }`; `getQuickAnalytics(db, range): Promise<QuickAnalyticsDto>`

- [ ] **Step 1: The fixture, with every expected value derivable by hand**

Windows: current `2026-09-01..2026-09-10` (10 days), previous `2026-08-22..2026-08-31`, last year `2025-09-01..2025-09-10`. Filler days are `100 impressions · 10 clicks · 10 visits · 0 bookings · $0 · 5 new · 3.0 pages`. Breakdown rows exist only for the three "event" days of the current window and one day of the previous window, on purpose: a total read from `breakdowns` instead of `daily_metrics` comes out wrong (5,500 shown instead of 6,200), which is exactly the invariant the tests guard.

```ts
// tests/queries/fixture.ts
import type { TestDb } from "./setup";
import { dailyMetrics, breakdowns } from "@/lib/db/schema";
import { eachDay } from "@/lib/date-range";

type DayOverride = Partial<{ impressions: number; clicks: number; websiteVisits: number; bookings: number; bookingValue: number; newVisitors: number; pagesPerSession: number }>;
const day = (date: string, o: DayOverride = {}) => ({
  date, impressions: 100, clicks: 10, websiteVisits: 10, bookings: 0, bookingValue: 0, newVisitors: 5, pagesPerSession: 3.0, ...o,
});
const br = (date: string, dimension: "campaign" | "device" | "feeder_market", dimensionValue: string, impressions: number, clicks: number, bookings: number, bookingValue: number) =>
  ({ date, dimension, dimensionValue, impressions, clicks, bookings, bookingValue });

export async function loadFixture(db: TestDb) {
  const events: Record<string, DayOverride> = {
    // current window
    "2026-09-02": { impressions: 1000, clicks: 100, websiteVisits: 97, bookings: 1, bookingValue: 1000, newVisitors: 80, pagesPerSession: 3.0 },
    "2026-09-05": { impressions: 4000, clicks: 200, websiteVisits: 195, bookings: 1, bookingValue: 500, newVisitors: 120, pagesPerSession: 3.5 },
    "2026-09-09": { impressions: 500, clicks: 50, websiteVisits: 48, bookings: 1, bookingValue: 300, newVisitors: 40, pagesPerSession: 4.0 },
    // previous window
    "2026-08-25": { impressions: 500, clicks: 50, websiteVisits: 48, bookings: 1, bookingValue: 900, newVisitors: 30, pagesPerSession: 3.2 },
    // last year
    "2025-09-03": { impressions: 300, clicks: 30, websiteVisits: 29, bookings: 1, bookingValue: 200, newVisitors: 20 },
    "2025-09-08": { impressions: 300, clicks: 30, websiteVisits: 29, bookings: 1, bookingValue: 200, newVisitors: 20 },
    // outside every window (bounds and leakage checks)
    "2026-08-21": { impressions: 99999, clicks: 9999, bookings: 9, bookingValue: 99999 },
    "2026-09-11": { impressions: 99999, clicks: 9999, bookings: 9, bookingValue: 99999 },
  };
  const dates = [...eachDay("2025-09-01", "2025-09-10"), ...eachDay("2026-08-21", "2026-09-11")];
  await db.insert(dailyMetrics).values(dates.map((d) => day(d, events[d] ?? {})));
  await db.insert(breakdowns).values([
    // campaign: sums equal the day's daily_metrics
    br("2026-09-02", "campaign", "Brand Protection", 300, 60, 1, 1000), br("2026-09-02", "campaign", "Discovery & Competitors", 700, 40, 0, 0),
    br("2026-09-05", "campaign", "Brand Protection", 1000, 100, 0, 0), br("2026-09-05", "campaign", "Discovery & Competitors", 3000, 100, 1, 500),
    br("2026-09-09", "campaign", "Brand Protection", 100, 20, 1, 300), br("2026-09-09", "campaign", "Discovery & Competitors", 400, 30, 0, 0),
    br("2026-08-25", "campaign", "Retargeting", 500, 50, 1, 900),
    // feeder_market
    br("2026-09-02", "feeder_market", "Chicago, IL", 600, 70, 1, 1000), br("2026-09-02", "feeder_market", "Detroit, MI", 400, 30, 0, 0),
    br("2026-09-05", "feeder_market", "Chicago, IL", 2500, 120, 1, 500), br("2026-09-05", "feeder_market", "Detroit, MI", 1500, 80, 0, 0),
    br("2026-09-09", "feeder_market", "Chicago, IL", 200, 20, 0, 0), br("2026-09-09", "feeder_market", "Detroit, MI", 300, 30, 1, 300),
    br("2026-08-25", "feeder_market", "Chicago, IL", 300, 40, 1, 900), br("2026-08-25", "feeder_market", "Detroit, MI", 200, 10, 0, 0),
    // device
    br("2026-09-02", "device", "Mobile", 600, 60, 1, 1000), br("2026-09-02", "device", "Desktop", 400, 40, 0, 0),
    br("2026-09-05", "device", "Mobile", 2000, 120, 1, 500), br("2026-09-05", "device", "Desktop", 2000, 80, 0, 0),
    br("2026-09-09", "device", "Mobile", 300, 30, 0, 0), br("2026-09-09", "device", "Desktop", 200, 20, 1, 300),
  ]);
}

/** Hand-computed totals for the current window (10 days: 3 event days + 7 filler days). */
export const CURRENT = { bookings: 3, valueCents: 180000, impressions: 6200, clicks: 420, websiteVisits: 410, newVisitors: 275, pagesPerSession: 3.15 };
export const PREVIOUS = { bookings: 1, valueCents: 90000, impressions: 1400, clicks: 140, websiteVisits: 138, newVisitors: 75, pagesPerSession: 3.02 };
export const LAST_YEAR = { bookings: 2, valueCents: 40000, impressions: 1400, clicks: 140, websiteVisits: 138, newVisitors: 80, pagesPerSession: 3 };

export const FIXTURE_RANGE = {
  preset: "30d" as const, from: "2026-09-01", to: "2026-09-10", days: 10, granularity: "day" as const, label: "Test",
  comparison: { prevFrom: "2026-08-22", prevTo: "2026-08-31", prevLabel: "the previous 10 days", lastYearFrom: "2025-09-01", lastYearTo: "2025-09-10", lastYearLabel: "this time last year" },
};
export const NO_COMPARISON_RANGE = { ...FIXTURE_RANGE, preset: "all" as const, comparison: null };
```
Arithmetic to check before trusting the constants: current impressions `1000 + 4000 + 500 + 7 × 100 = 6200`; clicks `100 + 200 + 50 + 70 = 420`; visits `97 + 195 + 48 + 70 = 410`; new visitors `80 + 120 + 40 + 35 = 275`; pages `(3.0 + 3.5 + 4.0 + 7 × 3.0) / 10 = 3.15`. Previous: `500 + 9 × 100 = 1400`, pages `(3.2 + 9 × 3.0) / 10 = 3.02`. Last year: `300 + 300 + 8 × 100 = 1400`, new `20 + 20 + 40 = 80`.

- [ ] **Step 2: Failing overview tests**

```ts
// tests/queries/overview.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { makeTestDb, type TestDb } from "./setup";
import { loadFixture, FIXTURE_RANGE, NO_COMPARISON_RANGE, CURRENT, PREVIOUS, LAST_YEAR } from "./fixture";
import { chunkSums } from "@/lib/db/queries/types";
import { getDataBounds } from "@/lib/db/queries/meta";
import { getOverview, getQuickAnalytics, periodTotals } from "@/lib/db/queries/overview";

let db: TestDb; let close: () => Promise<void>;
beforeAll(async () => { ({ db, close } = await makeTestDb()); await loadFixture(db); });
afterAll(() => close());

describe("chunkSums", () => {
  it("splits into near-equal chunks, larger ones first", () => {
    expect(chunkSums([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 4)).toEqual([6, 15, 15, 19]);
    expect(chunkSums(Array(30).fill(1), 4)).toEqual([8, 8, 7, 7]);
    expect(chunkSums([5], 4)).toEqual([5, 0, 0, 0]);
  });
});

describe("getDataBounds", () => {
  it("reads MIN and MAX date from daily_metrics", async () => {
    expect(await getDataBounds(db)).toEqual({ min: "2025-09-01", max: "2026-09-11" });
  });
});

describe("periodTotals / getOverview", () => {
  it("sums the window from daily_metrics only, converting dollars to cents once", async () => {
    expect(await periodTotals(db, FIXTURE_RANGE.from, FIXTURE_RANGE.to)).toEqual(CURRENT);
  });
  it("computes fee and net from the same rows, with both comparisons", async () => {
    const o = await getOverview(db, FIXTURE_RANGE, 1500);
    expect(o.current).toEqual(CURRENT);
    expect(o.previous).toEqual(PREVIOUS);
    expect(o.lastYear).toEqual(LAST_YEAR);
    expect(o.feeCents).toBe(27000);      // 180000 × 1500 / 10000
    expect(o.netCents).toBe(153000);
    expect(o).toMatchObject({ from: "2026-09-01", to: "2026-09-10", days: 10, prevLabel: "the previous 10 days", lastYearLabel: "this time last year", feeRateBps: 1500 });
  });
  it("has null comparisons and labels for the all-time range", async () => {
    const o = await getOverview(db, NO_COMPARISON_RANGE, 1500);
    expect(o.previous).toBeNull(); expect(o.lastYear).toBeNull(); expect(o.prevLabel).toBeNull();
  });
});

describe("getQuickAnalytics", () => {
  it("returns four stats with previous-period values and four-bucket sparklines", async () => {
    const q = await getQuickAnalytics(db, FIXTURE_RANGE);
    expect(q.stats.map((s) => s.key)).toEqual(["direct_bookings", "booking_value", "website_visits", "impressions"]);
    expect(q.stats[0]).toEqual({ key: "direct_bookings", kind: "count", value: 3, previous: 1, spark: [1, 1, 0, 1] });
    expect(q.stats[1]).toEqual({ key: "booking_value", kind: "money", value: 180000, previous: 90000, spark: [100000, 50000, 0, 30000] });
    expect(q.stats[2]).toEqual({ key: "website_visits", kind: "count", value: 410, previous: 138, spark: [117, 215, 20, 58] });
    expect(q.stats[3]).toEqual({ key: "impressions", kind: "count", value: 6200, previous: 1400, spark: [1200, 4200, 200, 600] });
  });
  it("has null previous when the range has no comparison", async () => {
    const q = await getQuickAnalytics(db, NO_COMPARISON_RANGE);
    expect(q.stats.every((s) => s.previous === null)).toBe(true);
  });
});
```
Spark arithmetic (chunks of days 1–3, 4–6, 7–8, 9–10): bookings `0+1+0 · 0+1+0 · 0+0 · 1+0`; value `100000 · 50000 · 0 · 30000`; visits `10+97+10 · 10+195+10 · 10+10 · 48+10`; impressions `100+1000+100 · 100+4000+100 · 100+100 · 500+100`.

- [ ] **Step 3: Run red**

Run: `npx vitest run tests/queries/overview.test.ts` — Expected: FAIL, modules missing.

- [ ] **Step 4: Implement**

```ts
// src/lib/db/queries/types.ts
import type { AnyDb } from "../types";
export type { AnyDb };
export { rowsOf } from "../types";

/** Whole-period sums from daily_metrics. Money is integer cents (D14). */
export interface PeriodTotals {
  bookings: number; valueCents: number; impressions: number; clicks: number;
  websiteVisits: number; newVisitors: number; pagesPerSession: number;
}

export const n = (v: unknown): number => Number(v ?? 0);
/** numeric(10,2) dollars from the driver (string) → integer cents, once, at the query boundary. */
export const toCents = (dollars: unknown): number => Math.round(n(dollars) * 100);

/** Sums `values` into `chunks` groups of near-equal length, the first groups one longer when it does not divide. */
export function chunkSums(values: number[], chunks: number): number[] {
  const base = Math.floor(values.length / chunks), extra = values.length % chunks;
  const out: number[] = []; let i = 0;
  for (let c = 0; c < chunks; c++) {
    const len = base + (c < extra ? 1 : 0);
    out.push(values.slice(i, i + len).reduce((a, b) => a + b, 0)); i += len;
  }
  return out;
}
```

```ts
// src/lib/db/queries/meta.ts
import { sql } from "drizzle-orm";
import { rowsOf, type AnyDb } from "./types";

/** "Today" is the last seeded day (D10). Throws a readable error on an empty database. */
export async function getDataBounds(db: AnyDb): Promise<{ min: string; max: string }> {
  const [r] = rowsOf<{ min: string | null; max: string | null }>(await db.execute(sql`select min(date)::text as min, max(date)::text as max from daily_metrics`));
  if (!r?.min || !r.max) throw new Error("daily_metrics is empty. Run `npm run db:seed` first.");
  return { min: r.min, max: r.max };
}
```

```ts
// src/lib/db/queries/overview.ts
import { sql } from "drizzle-orm";
import type { DateRange } from "@/lib/date-range";
import { eachDay } from "@/lib/date-range";
import type { GlossaryKey } from "@/lib/glossary";
import { rowsOf, n, toCents, chunkSums, type AnyDb, type PeriodTotals } from "./types";

export async function periodTotals(db: AnyDb, from: string, to: string): Promise<PeriodTotals> {
  const [r] = rowsOf<Record<string, unknown>>(await db.execute(sql`
    select coalesce(sum(impressions), 0) as impressions, coalesce(sum(clicks), 0) as clicks,
           coalesce(sum(website_visits), 0) as website_visits, coalesce(sum(bookings), 0) as bookings,
           coalesce(sum(booking_value), 0) as booking_value, coalesce(sum(new_visitors), 0) as new_visitors,
           coalesce(avg(pages_per_session), 0) as pages_per_session
    from daily_metrics where date between ${from} and ${to}`));
  const row = r ?? {};
  return {
    bookings: n(row.bookings), valueCents: toCents(row.booking_value), impressions: n(row.impressions), clicks: n(row.clicks),
    websiteVisits: n(row.website_visits), newVisitors: n(row.new_visitors), pagesPerSession: Math.round(n(row.pages_per_session) * 100) / 100,
  };
}

export interface OverviewDto {
  from: string; to: string; days: number;
  prevLabel: string | null; lastYearLabel: string | null;
  current: PeriodTotals; previous: PeriodTotals | null; lastYear: PeriodTotals | null;
  feeRateBps: number; feeCents: number; netCents: number;
}

export async function getOverview(db: AnyDb, range: DateRange, feeRateBps: number): Promise<OverviewDto> {
  const c = range.comparison;
  const [current, previous, lastYear] = await Promise.all([
    periodTotals(db, range.from, range.to),
    c ? periodTotals(db, c.prevFrom, c.prevTo) : null,
    c ? periodTotals(db, c.lastYearFrom, c.lastYearTo) : null,
  ]);
  const feeCents = Math.round((current.valueCents * feeRateBps) / 10000);
  return {
    from: range.from, to: range.to, days: range.days,
    prevLabel: c?.prevLabel ?? null, lastYearLabel: c?.lastYearLabel ?? null,
    current, previous, lastYear, feeRateBps, feeCents, netCents: current.valueCents - feeCents,
  };
}

export interface QuickStatDto { key: GlossaryKey; kind: "count" | "money"; value: number; previous: number | null; spark: number[] }
export interface QuickAnalyticsDto { stats: QuickStatDto[] }

const SPARK_BUCKETS = 4;

export async function getQuickAnalytics(db: AnyDb, range: DateRange): Promise<QuickAnalyticsDto> {
  type Row = { date: string; bookings: unknown; booking_value: unknown; website_visits: unknown; impressions: unknown };
  const [rows, previous] = await Promise.all([
    rowsOf<Row>(await db.execute(sql`select date::text as date, bookings, booking_value, website_visits, impressions from daily_metrics where date between ${range.from} and ${range.to}`)),
    range.comparison ? periodTotals(db, range.comparison.prevFrom, range.comparison.prevTo) : null,
  ]);
  const byDay = new Map(rows.map((r) => [r.date, r]));
  const series = (f: (r: Row) => number) => eachDay(range.from, range.to).map((d) => { const r = byDay.get(d); return r ? f(r) : 0; });
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const stat = (key: GlossaryKey, kind: "count" | "money", xs: number[], prev: number | null): QuickStatDto =>
    ({ key, kind, value: sum(xs), previous: prev, spark: chunkSums(xs, SPARK_BUCKETS) });
  const bookings = series((r) => n(r.bookings)), value = series((r) => toCents(r.booking_value));
  const visits = series((r) => n(r.website_visits)), impressions = series((r) => n(r.impressions));
  return { stats: [
    stat("direct_bookings", "count", bookings, previous?.bookings ?? null),
    stat("booking_value", "money", value, previous?.valueCents ?? null),
    stat("website_visits", "count", visits, previous?.websiteVisits ?? null),
    stat("impressions", "count", impressions, previous?.impressions ?? null),
  ] };
}
```

- [ ] **Step 5: Run green; negative control; gates**

Run: `npx vitest run tests/queries/overview.test.ts` — Expected: 8 passed.
Negative control: change `toCents(row.booking_value)` to `n(row.booking_value)` in `periodTotals`, run, see `valueCents` fail (1800 ≠ 180000), restore.
Run: `npm run typecheck && npm run lint && npm test`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/queries/types.ts src/lib/db/queries/meta.ts src/lib/db/queries/overview.ts tests/queries/fixture.ts tests/queries/overview.test.ts
git commit -m "Add overview and quick-analytics queries with a hand-computed PGlite fixture

Totals come from daily_metrics only; the fixture omits breakdown rows on
filler days so a breakdown-derived total would read 5,500 instead of 6,200.
Dollars become cents once, in the query. Sparklines are four near-equal
day chunks. Negative control: dropping toCents reddened valueCents (restored).
Gates: vitest <N> files passed; typecheck 0; lint 0.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Query layer — trend, markets, campaigns, funnel

**Files:**
- Create: `src/lib/db/queries/trend.ts`, `src/lib/db/queries/breakdowns.ts`
- Test: `tests/queries/trend.test.ts`, `tests/queries/breakdowns.test.ts`

**Interfaces:**
- Consumes: Task 3's `periodTotals`, `rowsOf`, `n`, `toCents`; `campaignKey`, `deviceKey`, `glossary`, `MARKET_HINTS` from glossary; `addDays`, `eachDay`, `Granularity` from date-range.
- Produces:
  - `type TrendMetric = "booking_value" | "direct_bookings" | "website_visits"`; `TREND_METRICS: TrendMetric[]`; `isTrendMetric(v: unknown): v is TrendMetric`
  - `interface TrendPoint { bucket: string; current: number; previous: number | null; lastYear: number | null }`; `interface TrendDto { metric: TrendMetric; granularity: Granularity; points: TrendPoint[] }`; `getTrend(db, range, metric): Promise<TrendDto>`
  - `interface MarketDto { name: string; hint: string | null; visits: number; previousVisits: number | null; bookings: number; valueCents: number; share: number }`; `getMarkets(db, range, limit = 5): Promise<MarketDto[]>` (ranked by bookings; the tail and the seeded "Other" fold into one "Everywhere else" row; `share` = bookings ÷ top row's bookings)
  - `interface CampaignDto { key: CampaignKey | null; name: string; live: boolean; shown: number; visits: number; ctr: number; bookings: number; valueCents: number; share: number }`; `interface CampaignSummaryDto { campaigns: CampaignDto[]; total: { shown: number; visits: number; ctr: number; bookings: number; valueCents: number } }`; `getCampaigns(db, range): Promise<CampaignSummaryDto>` (`total` from `daily_metrics`; `live` = impressions in the last 7 days of the range; `share` = bookings ÷ total bookings)
  - `interface FunnelStepDto { key: GlossaryKey; people: number; onwardRatio: number | null; valueCents: number | null }`; `interface FunnelDto { steps: FunnelStepDto[]; newVisitors: number; pagesPerSession: number; devices: { key: DeviceKey; share: number }[] }`; `getFunnel(db, range): Promise<FunnelDto>` (device share by clicks)

- [ ] **Step 1: Failing trend tests**

```ts
// tests/queries/trend.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { makeTestDb, type TestDb } from "./setup";
import { loadFixture, FIXTURE_RANGE, NO_COMPARISON_RANGE } from "./fixture";
import { getTrend, bucketStarts, isTrendMetric } from "@/lib/db/queries/trend";

let db: TestDb; let close: () => Promise<void>;
beforeAll(async () => { ({ db, close } = await makeTestDb()); await loadFixture(db); });
afterAll(() => close());

describe("bucketStarts", () => {
  it("starts weeks on the range's first day and months on the 1st after the first", () => {
    expect(bucketStarts("2026-08-18", "2026-09-16", "week")).toEqual(["2026-08-18", "2026-08-25", "2026-09-01", "2026-09-08", "2026-09-15"]);
    expect(bucketStarts("2024-09-17", "2024-12-05", "month")).toEqual(["2024-09-17", "2024-10-01", "2024-11-01", "2024-12-01"]);
    expect(bucketStarts("2026-09-01", "2026-09-03", "day")).toEqual(["2026-09-01", "2026-09-02", "2026-09-03"]);
  });
});

describe("getTrend", () => {
  it("returns one point per day with comparisons aligned by index", async () => {
    const t = await getTrend(db, FIXTURE_RANGE, "booking_value");
    expect(t.metric).toBe("booking_value"); expect(t.granularity).toBe("day"); expect(t.points).toHaveLength(10);
    expect(t.points[1]).toEqual({ bucket: "2026-09-02", current: 100000, previous: 0, lastYear: 0 });
    expect(t.points[2]).toMatchObject({ bucket: "2026-09-03", current: 0, lastYear: 20000 }); // 2025-09-03 is index 2 of the last-year window
    expect(t.points[3]).toMatchObject({ bucket: "2026-09-04", previous: 90000 });               // 2026-08-25 is index 3 of the previous window
    expect(t.points[9]).toMatchObject({ bucket: "2026-09-10", current: 0 });                    // 2026-09-11 (outside) must not leak in
  });
  it("switches the column by metric and keeps counts as counts", async () => {
    const b = await getTrend(db, FIXTURE_RANGE, "direct_bookings");
    expect(b.points[1].current).toBe(1); expect(b.points[4].current).toBe(1);
    const v = await getTrend(db, FIXTURE_RANGE, "website_visits");
    expect(v.points[1].current).toBe(97); expect(v.points[0].current).toBe(10);
  });
  it("buckets into weeks and sums the days inside each", async () => {
    const t = await getTrend(db, { ...FIXTURE_RANGE, granularity: "week" }, "booking_value");
    expect(t.points.map((p) => p.bucket)).toEqual(["2026-09-01", "2026-09-08"]);
    expect(t.points[0].current).toBe(150000); // 09-02 + 09-05
    expect(t.points[1].current).toBe(30000);  // 09-09
  });
  it("has null comparisons without a comparison window", async () => {
    const t = await getTrend(db, NO_COMPARISON_RANGE, "booking_value");
    expect(t.points[1]).toEqual({ bucket: "2026-09-02", current: 100000, previous: null, lastYear: null });
  });
  it("guards the URL metric", () => {
    expect(isTrendMetric("website_visits")).toBe(true); expect(isTrendMetric("evil")).toBe(false);
  });
});
```

- [ ] **Step 2: Failing breakdown tests**

```ts
// tests/queries/breakdowns.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { makeTestDb, type TestDb } from "./setup";
import { loadFixture, FIXTURE_RANGE, NO_COMPARISON_RANGE } from "./fixture";
import { getMarkets, getCampaigns, getFunnel } from "@/lib/db/queries/breakdowns";

let db: TestDb; let close: () => Promise<void>;
beforeAll(async () => { ({ db, close } = await makeTestDb()); await loadFixture(db); });
afterAll(() => close());

describe("getMarkets", () => {
  it("ranks by bookings, adds drive hints and previous-period visits, share against the top row", async () => {
    const m = await getMarkets(db, FIXTURE_RANGE);
    expect(m).toEqual([
      { name: "Chicago, IL", hint: "2 h 15 drive", visits: 210, previousVisits: 40, bookings: 2, valueCents: 150000, share: 1 },
      { name: "Detroit, MI", hint: "2 h 45 drive", visits: 140, previousVisits: 10, bookings: 1, valueCents: 30000, share: 0.5 },
    ]);
  });
  it("folds the tail past the limit into Everywhere else", async () => {
    const m = await getMarkets(db, FIXTURE_RANGE, 1);
    expect(m[1]).toEqual({ name: "Everywhere else", hint: null, visits: 140, previousVisits: 10, bookings: 1, valueCents: 30000, share: 0.5 });
  });
  it("has null previousVisits without a comparison", async () => {
    const m = await getMarkets(db, NO_COMPARISON_RANGE);
    expect(m[0].previousVisits).toBeNull();
  });
});

describe("getCampaigns", () => {
  it("names campaigns from the glossary and takes the total from daily_metrics, not breakdowns", async () => {
    const c = await getCampaigns(db, FIXTURE_RANGE);
    expect(c.campaigns).toEqual([
      { key: "brand_protection", name: "Protecting your name", live: true, shown: 1400, visits: 180, ctr: 180 / 1400, bookings: 2, valueCents: 130000, share: 2 / 3 },
      { key: "discovery", name: "Finding new guests", live: true, shown: 4100, visits: 170, ctr: 170 / 4100, bookings: 1, valueCents: 50000, share: 1 / 3 },
    ]);
    expect(c.total).toEqual({ shown: 6200, visits: 420, ctr: 420 / 6200, bookings: 3, valueCents: 180000 }); // 5500/350 would mean breakdowns were summed
  });
  it("marks a campaign not live when it had no impressions in the last seven days", async () => {
    // Range ending 2026-09-04: the last 7 days are 08-29..09-04, where only 09-02 has campaign rows (both campaigns) → both live.
    // Range 2026-08-22..2026-08-31: only Retargeting on 08-25, and 08-25 is inside the last 7 days (08-25..08-31) → live.
    const c = await getCampaigns(db, { ...NO_COMPARISON_RANGE, from: "2026-08-22", to: "2026-08-31" });
    expect(c.campaigns.map((x) => [x.key, x.live])).toEqual([["retargeting", true]]);
    // Range 2026-08-22..2026-09-01: last 7 days are 08-26..09-01, Retargeting's only row (08-25) is before that → not live.
    const d = await getCampaigns(db, { ...NO_COMPARISON_RANGE, from: "2026-08-22", to: "2026-09-01" });
    expect(d.campaigns.map((x) => [x.key, x.live])).toEqual([["retargeting", false]]);
  });
});

describe("getFunnel", () => {
  it("chains impressions → clicks → bookings with onward ratios, and device share by clicks", async () => {
    const f = await getFunnel(db, FIXTURE_RANGE);
    expect(f.steps).toEqual([
      { key: "impressions", people: 6200, onwardRatio: 420 / 6200, valueCents: null },
      { key: "clicks", people: 420, onwardRatio: 3 / 420, valueCents: null },
      { key: "direct_bookings", people: 3, onwardRatio: null, valueCents: 180000 },
    ]);
    expect(f.newVisitors).toBe(275); expect(f.pagesPerSession).toBe(3.15);
    expect(f.devices).toEqual([{ key: "device_mobile", share: 0.6 }, { key: "device_desktop", share: 0.4 }]);
  });
});
```
Market arithmetic: Chicago visits `70 + 120 + 20 = 210`, value `1000 + 500 = 1500`; Detroit `30 + 80 + 30 = 140`, value `300`. Campaign: Brand `300 + 1000 + 100 = 1400` shown, `60 + 100 + 20 = 180` visits, value `1000 + 300`; Discovery `700 + 3000 + 400 = 4100`, `40 + 100 + 30 = 170`. Devices by clicks: Mobile `60 + 120 + 30 = 210`, Desktop `40 + 80 + 20 = 140`, so `0.6 / 0.4`.

- [ ] **Step 3: Run red**

Run: `npx vitest run tests/queries/trend.test.ts tests/queries/breakdowns.test.ts` — Expected: FAIL, modules missing.

- [ ] **Step 4: Implement trend**

```ts
// src/lib/db/queries/trend.ts
import { sql } from "drizzle-orm";
import type { DateRange, Granularity } from "@/lib/date-range";
import { addDays, eachDay } from "@/lib/date-range";
import { rowsOf, n, toCents, type AnyDb } from "./types";

export type TrendMetric = "booking_value" | "direct_bookings" | "website_visits";
export const TREND_METRICS: TrendMetric[] = ["booking_value", "direct_bookings", "website_visits"];
export const isTrendMetric = (v: unknown): v is TrendMetric => TREND_METRICS.includes(v as TrendMetric);

export interface TrendPoint { bucket: string; current: number; previous: number | null; lastYear: number | null }
export interface TrendDto { metric: TrendMetric; granularity: Granularity; points: TrendPoint[] }

/** Bucket boundaries start on the range's first day, not on a calendar Monday (D19). */
export function bucketStarts(from: string, to: string, g: Granularity): string[] {
  if (g === "day") return eachDay(from, to);
  if (g === "week") { const out: string[] = []; for (let d = from; d <= to; d = addDays(d, 7)) out.push(d); return out; }
  const out = [from]; let [y, m] = from.split("-").map(Number);
  for (;;) { m += 1; if (m > 12) { m = 1; y += 1; } const s = `${y}-${String(m).padStart(2, "0")}-01`; if (s > to) break; out.push(s); }
  return out;
}

async function bucketSums(db: AnyDb, from: string, to: string, g: Granularity, metric: TrendMetric): Promise<number[]> {
  const column = metric === "booking_value" ? sql`booking_value` : metric === "direct_bookings" ? sql`bookings` : sql`website_visits`;
  const rows = rowsOf<{ d: string; v: unknown }>(await db.execute(sql`select date::text as d, ${column} as v from daily_metrics where date between ${from} and ${to}`));
  const byDay = new Map(rows.map((r) => [r.d, metric === "booking_value" ? toCents(r.v) : n(r.v)]));
  const starts = bucketStarts(from, to, g);
  return starts.map((s, i) => {
    const end = i + 1 < starts.length ? addDays(starts[i + 1], -1) : to;
    let sum = 0; for (const d of eachDay(s, end)) sum += byDay.get(d) ?? 0; return sum;
  });
}

export async function getTrend(db: AnyDb, range: DateRange, metric: TrendMetric): Promise<TrendDto> {
  const g = range.granularity, c = range.comparison;
  const [cur, prev, ly] = await Promise.all([
    bucketSums(db, range.from, range.to, g, metric),
    c ? bucketSums(db, c.prevFrom, c.prevTo, g, metric) : null,
    c ? bucketSums(db, c.lastYearFrom, c.lastYearTo, g, metric) : null,
  ]);
  const points = bucketStarts(range.from, range.to, g).map((bucket, i) => ({
    bucket, current: cur[i], previous: prev ? (prev[i] ?? 0) : null, lastYear: ly ? (ly[i] ?? 0) : null,
  }));
  return { metric, granularity: g, points };
}
```

- [ ] **Step 5: Implement breakdowns**

```ts
// src/lib/db/queries/breakdowns.ts
import { sql } from "drizzle-orm";
import type { DateRange } from "@/lib/date-range";
import { addDays } from "@/lib/date-range";
import type { Dimension } from "@/lib/db/schema";
import { campaignKey, deviceKey, glossary, MARKET_HINTS, type CampaignKey, type DeviceKey, type GlossaryKey } from "@/lib/glossary";
import { rowsOf, n, toCents, type AnyDb } from "./types";
import { periodTotals } from "./overview";

interface DimRow { value: string; impressions: number; clicks: number; bookings: number; valueCents: number }

async function dimensionRows(db: AnyDb, dimension: Dimension, from: string, to: string): Promise<DimRow[]> {
  const rows = rowsOf<Record<string, unknown>>(await db.execute(sql`
    select dimension_value as value, sum(impressions) as impressions, sum(clicks) as clicks, sum(bookings) as bookings, sum(booking_value) as booking_value
    from breakdowns where dimension = ${dimension} and date between ${from} and ${to}
    group by dimension_value order by 4 desc, 3 desc, 1`));
  return rows.map((r) => ({ value: String(r.value), impressions: n(r.impressions), clicks: n(r.clicks), bookings: n(r.bookings), valueCents: toCents(r.booking_value) }));
}
const ratio = (num: number, den: number) => (den > 0 ? num / den : 0);

export interface MarketDto { name: string; hint: string | null; visits: number; previousVisits: number | null; bookings: number; valueCents: number; share: number }

const SEEDED_OTHER = "Other";
export async function getMarkets(db: AnyDb, range: DateRange, limit = 5): Promise<MarketDto[]> {
  const c = range.comparison;
  const [rows, prevRows] = await Promise.all([
    dimensionRows(db, "feeder_market", range.from, range.to),
    c ? dimensionRows(db, "feeder_market", c.prevFrom, c.prevTo) : null,
  ]);
  const prevClicks = prevRows ? new Map(prevRows.map((r) => [r.value, r.clicks])) : null;
  const named = rows.filter((r) => r.value !== SEEDED_OTHER);
  const top = named.slice(0, limit), rest = [...named.slice(limit), ...rows.filter((r) => r.value === SEEDED_OTHER)];
  const max = top[0]?.bookings || 1;
  const toDto = (r: DimRow): MarketDto => ({
    name: r.value, hint: MARKET_HINTS[r.value] ?? null, visits: r.clicks,
    previousVisits: prevClicks ? (prevClicks.get(r.value) ?? 0) : null,
    bookings: r.bookings, valueCents: r.valueCents, share: r.bookings / max,
  });
  const out = top.map(toDto);
  if (rest.length) {
    const sum = (f: (r: DimRow) => number) => rest.reduce((a, r) => a + f(r), 0);
    out.push({
      name: "Everywhere else", hint: null, visits: sum((r) => r.clicks),
      previousVisits: prevClicks ? sum((r) => prevClicks.get(r.value) ?? 0) : null,
      bookings: sum((r) => r.bookings), valueCents: sum((r) => r.valueCents), share: sum((r) => r.bookings) / max,
    });
  }
  return out;
}

export interface CampaignDto { key: CampaignKey | null; name: string; live: boolean; shown: number; visits: number; ctr: number; bookings: number; valueCents: number; share: number }
export interface CampaignSummaryDto { campaigns: CampaignDto[]; total: { shown: number; visits: number; ctr: number; bookings: number; valueCents: number } }

const LIVE_WINDOW_DAYS = 7;
export async function getCampaigns(db: AnyDb, range: DateRange): Promise<CampaignSummaryDto> {
  const liveFrom = addDays(range.to, -(LIVE_WINDOW_DAYS - 1));
  const [rows, recent, totals] = await Promise.all([
    dimensionRows(db, "campaign", range.from, range.to),
    dimensionRows(db, "campaign", liveFrom < range.from ? range.from : liveFrom, range.to),
    periodTotals(db, range.from, range.to), // totals come from daily_metrics, never from breakdowns
  ]);
  const live = new Set(recent.filter((r) => r.impressions > 0).map((r) => r.value));
  const campaigns = rows.map((r): CampaignDto => {
    const key = campaignKey(r.value);
    return { key, name: key ? glossary[key].label : r.value, live: live.has(r.value), shown: r.impressions, visits: r.clicks, ctr: ratio(r.clicks, r.impressions), bookings: r.bookings, valueCents: r.valueCents, share: ratio(r.bookings, totals.bookings) };
  });
  return { campaigns, total: { shown: totals.impressions, visits: totals.clicks, ctr: ratio(totals.clicks, totals.impressions), bookings: totals.bookings, valueCents: totals.valueCents } };
}

export interface FunnelStepDto { key: GlossaryKey; people: number; onwardRatio: number | null; valueCents: number | null }
export interface FunnelDto { steps: FunnelStepDto[]; newVisitors: number; pagesPerSession: number; devices: { key: DeviceKey; share: number }[] }

export async function getFunnel(db: AnyDb, range: DateRange): Promise<FunnelDto> {
  const [t, deviceRows] = await Promise.all([periodTotals(db, range.from, range.to), dimensionRows(db, "device", range.from, range.to)]);
  const clicks = deviceRows.reduce((a, r) => a + r.clicks, 0);
  const devices = deviceRows.flatMap((r) => { const key = deviceKey(r.value); return key ? [{ key, share: ratio(r.clicks, clicks) }] : []; })
    .sort((a, b) => b.share - a.share);
  return {
    steps: [
      { key: "impressions", people: t.impressions, onwardRatio: t.impressions ? t.clicks / t.impressions : null, valueCents: null },
      { key: "clicks", people: t.clicks, onwardRatio: t.clicks ? t.bookings / t.clicks : null, valueCents: null },
      { key: "direct_bookings", people: t.bookings, onwardRatio: null, valueCents: t.valueCents },
    ],
    newVisitors: t.newVisitors, pagesPerSession: t.pagesPerSession, devices,
  };
}
```

- [ ] **Step 6: Run green; negative control; timing; gates**

Run: `npx vitest run tests/queries/trend.test.ts tests/queries/breakdowns.test.ts` — Expected: 11 passed.
Negative control: in `getCampaigns`, compute `total` from `rows` (sum of breakdowns) instead of `totals`; the `total` assertion goes red with `shown: 5500`; restore.
Timing: with `DATABASE_URL` set, run `npx tsx -e` three times against Supabase for `getTrend(db, parseRange("all", …), "booking_value")` and `getMarkets`, note the ms in the commit body (D23 measured 32–69 ms warm; anything over 100 ms gets a row in decisions.md "Rejected with measurement" or an index).
Run: `npm run typecheck && npm run lint && npm test`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/queries/trend.ts src/lib/db/queries/breakdowns.ts tests/queries/trend.test.ts tests/queries/breakdowns.test.ts
git commit -m "Add trend, market, campaign and funnel queries

Buckets start on the range's first day; comparisons align by index.
Campaign and funnel totals read daily_metrics; the fixture's missing
breakdown rows prove a breakdown-derived total would be wrong (5,500 vs 6,200).
Negative control: summing breakdowns for the campaign total reddened it (restored).
Timing on Supabase, three runs: trend(all) <a>/<b>/<c> ms; markets(30d) <a>/<b>/<c> ms.
Gates: vitest <N> files passed; typecheck 0; lint 0.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Insights, computed at render time

**Files:**
- Create: `src/lib/insights.ts`
- Test: `tests/insights.test.ts`

**Interfaces:**
- Consumes: `OverviewDto` (Task 3), `MarketDto`, `CampaignSummaryDto` (Task 4); `delta`, `oneIn`, `money`, `count`, `pct` from format.
- Produces: `type InsightKind = "win" | "watch" | "action"`; `type InsightAnchor = "markets" | "campaigns" | "funnel"`; `interface InsightDto { kind: InsightKind; title: string; body: string; anchor: InsightAnchor | null }`; `interface InsightInput { overview: OverviewDto; markets: MarketDto[]; campaigns: CampaignSummaryDto }`; `computeInsights(input, limit = 3): InsightDto[]`

Rules, in priority order (the first `limit` that fire are returned; each is one pure function so a test can hit it alone):
1. **Booking value vs previous period** ≥ +10% → `win`; ≤ −10% → `watch`. Anchor none.
2. **Top market's visits fell** ≥ 12% vs previous period → `watch`, anchor `markets`.
3. **Protecting your name outperforms**: brand-protection click-through ≥ 1.5 × the blended rate → `action` ("Autumn is keeping your name at the top"), anchor `campaigns`.
4. **Direct bookings vs last year** ≥ +10% → `win`.
5. **Blended click-through fell** ≥ 15% vs previous period → `action` ("Autumn is rebalancing where your ads show"), anchor `funnel`.

- [ ] **Step 1: Failing tests**

```ts
// tests/insights.test.ts
import { describe, it, expect } from "vitest";
import { computeInsights, type InsightInput } from "@/lib/insights";
import type { OverviewDto } from "@/lib/db/queries/overview";
import type { MarketDto, CampaignSummaryDto } from "@/lib/db/queries/breakdowns";

const totals = (o: Partial<OverviewDto["current"]> = {}) => ({ bookings: 3, valueCents: 180000, impressions: 6200, clicks: 420, websiteVisits: 410, newVisitors: 275, pagesPerSession: 3.15, ...o });
const overview = (o: Partial<OverviewDto> = {}): OverviewDto => ({
  from: "2026-09-01", to: "2026-09-10", days: 10, prevLabel: "the previous 10 days", lastYearLabel: "this time last year",
  current: totals(), previous: totals({ bookings: 1, valueCents: 90000, impressions: 1400, clicks: 140 }), lastYear: totals({ bookings: 2, valueCents: 40000 }),
  feeRateBps: 1500, feeCents: 27000, netCents: 153000, ...o,
});
const market = (m: Partial<MarketDto> = {}): MarketDto => ({ name: "Chicago, IL", hint: "2 h 15 drive", visits: 210, previousVisits: 40, bookings: 2, valueCents: 150000, share: 1, ...m });
const campaigns = (brandCtr = 180 / 1400, totalCtr = 420 / 6200): CampaignSummaryDto => ({
  campaigns: [{ key: "brand_protection", name: "Protecting your name", live: true, shown: 1400, visits: 180, ctr: brandCtr, bookings: 2, valueCents: 130000, share: 2 / 3 }],
  total: { shown: 6200, visits: 420, ctr: totalCtr, bookings: 3, valueCents: 180000 },
});
const input = (over: Partial<InsightInput> = {}): InsightInput => ({ overview: overview(), markets: [market()], campaigns: campaigns(), ...over });

describe("computeInsights", () => {
  it("fires a win when booking value is up at least 10% on the previous period", () => {
    const [first] = computeInsights(input());
    expect(first).toEqual({ kind: "win", title: "Booking value up 100% on the previous 10 days", body: "3 direct bookings worth $1,800, against $900 in the period before.", anchor: null });
  });
  it("fires a watch when booking value is down at least 10%", () => {
    const [first] = computeInsights(input({ overview: overview({ current: totals({ valueCents: 70000 }) }) }));
    expect(first.kind).toBe("watch"); expect(first.title).toBe("Booking value down 22% on the previous 10 days");
  });
  it("watches the top market when its visits fell 12% or more", () => {
    const out = computeInsights(input({ markets: [market({ visits: 44, previousVisits: 50 })] }));
    expect(out).toContainEqual({ kind: "watch", title: "Chicago, IL sent fewer visitors", body: "Visits from Chicago, IL fell 12% on the previous 10 days while bookings held at 2. Worth watching, not acting on yet.", anchor: "markets" });
  });
  it("credits brand protection when its click-through is 1.5× the blended rate", () => {
    const out = computeInsights(input());
    expect(out).toContainEqual({ kind: "action", title: "Autumn is keeping your name at the top", body: "1 in 8 people who searched for your name clicked through, against 1 in 15 across all ads.", anchor: "campaigns" });
  });
  it("returns at most limit, in rule order, and nothing when nothing fires", () => {
    expect(computeInsights(input(), 1)).toHaveLength(1);
    const quiet = input({ overview: overview({ current: totals({ valueCents: 92000, bookings: 2, clicks: 140, impressions: 1400 }), lastYear: totals({ bookings: 2 }) }), markets: [market({ visits: 40, previousVisits: 40 })], campaigns: campaigns(0.1, 0.1) });
    expect(computeInsights(quiet)).toEqual([]);
  });
  it("skips comparison rules for the all-time range", () => {
    expect(computeInsights(input({ overview: overview({ previous: null, lastYear: null, prevLabel: null, lastYearLabel: null }), markets: [market({ previousVisits: null })], campaigns: campaigns(0.1, 0.1) }))).toEqual([]);
  });
});
```
Arithmetic: 180000 vs 90000 → +100%; 70000 vs 90000 → −22%; 44 vs 50 → −12%; brand `180/1400 = 0.1286 → 1 in 8`, blended `420/6200 = 0.0677 → 1 in 15`, and `0.1286 / 0.0677 = 1.9 ≥ 1.5`. In the quiet case `92000 vs 90000 = +2%`, clicks `140/1400 = 0.1` equals the previous `140/1400`, bookings `2 vs 2`.

- [ ] **Step 2: Run red**

Run: `npx vitest run tests/insights.test.ts` — Expected: FAIL, module missing.

- [ ] **Step 3: Implement**

```ts
// src/lib/insights.ts
import type { OverviewDto } from "@/lib/db/queries/overview";
import type { MarketDto, CampaignSummaryDto } from "@/lib/db/queries/breakdowns";
import { delta, money, oneIn, count } from "@/lib/format";

export type InsightKind = "win" | "watch" | "action";
export type InsightAnchor = "markets" | "campaigns" | "funnel";
export interface InsightDto { kind: InsightKind; title: string; body: string; anchor: InsightAnchor | null }
export interface InsightInput { overview: OverviewDto; markets: MarketDto[]; campaigns: CampaignSummaryDto }

type Rule = (i: InsightInput) => InsightDto | null;

const valueVsPrevious: Rule = ({ overview: o }) => {
  if (!o.previous || !o.prevLabel) return null;
  const d = delta(o.current.valueCents, o.previous.valueCents);
  if (d.pct === null || Math.abs(d.pct) < 10) return null;
  const dir = d.pct > 0 ? "up" : "down";
  return {
    kind: d.pct > 0 ? "win" : "watch",
    title: `Booking value ${dir} ${Math.abs(d.pct)}% on ${o.prevLabel}`,
    body: `${count(o.current.bookings)} direct bookings worth ${money(o.current.valueCents)}, against ${money(o.previous.valueCents)} in the period before.`,
    anchor: null,
  };
};

const topMarketVisitsFell: Rule = ({ overview: o, markets }) => {
  const m = markets[0];
  if (!m || m.previousVisits === null || !o.prevLabel) return null;
  const d = delta(m.visits, m.previousVisits);
  if (d.pct === null || d.pct > -12) return null;
  return {
    kind: "watch",
    title: `${m.name} sent fewer visitors`,
    body: `Visits from ${m.name} fell ${Math.abs(d.pct)}% on ${o.prevLabel} while bookings held at ${count(m.bookings)}. Worth watching, not acting on yet.`,
    anchor: "markets",
  };
};

const brandProtectionWins: Rule = ({ campaigns }) => {
  const brand = campaigns.campaigns.find((c) => c.key === "brand_protection");
  if (!brand || campaigns.total.ctr <= 0 || brand.ctr < 1.5 * campaigns.total.ctr) return null;
  return {
    kind: "action",
    title: "Autumn is keeping your name at the top",
    body: `${oneIn(brand.ctr)} people who searched for your name clicked through, against ${oneIn(campaigns.total.ctr)} across all ads.`,
    anchor: "campaigns",
  };
};

const bookingsVsLastYear: Rule = ({ overview: o }) => {
  if (!o.lastYear || !o.lastYearLabel) return null;
  const d = delta(o.current.bookings, o.lastYear.bookings);
  if (d.pct === null || d.pct < 10) return null;
  return {
    kind: "win",
    title: `More direct bookings than ${o.lastYearLabel}`,
    body: `${count(o.current.bookings)} this period against ${count(o.lastYear.bookings)} a year ago, up ${d.pct}%.`,
    anchor: null,
  };
};

const clickThroughFell: Rule = ({ overview: o }) => {
  if (!o.previous || !o.prevLabel || !o.previous.impressions || !o.current.impressions) return null;
  const d = delta(o.current.clicks / o.current.impressions, o.previous.clicks / o.previous.impressions);
  if (d.pct === null || d.pct > -15) return null;
  return {
    kind: "action",
    title: "Autumn is rebalancing where your ads show",
    body: `${oneIn(o.current.clicks / o.current.impressions)} people who saw an ad clicked, down from ${oneIn(o.previous.clicks / o.previous.impressions)} on ${o.prevLabel}.`,
    anchor: "funnel",
  };
};

const RULES: Rule[] = [valueVsPrevious, topMarketVisitsFell, brandProtectionWins, bookingsVsLastYear, clickThroughFell];

/** Insights are derived from the same DTOs the page renders, so they can never disagree with the numbers beside them (D24). */
export function computeInsights(input: InsightInput, limit = 3): InsightDto[] {
  const out: InsightDto[] = [];
  for (const rule of RULES) { const r = rule(input); if (r) out.push(r); if (out.length >= limit) break; }
  return out;
}
```
`count` is exported from `format.ts` in Task 2 (`int.format`).

- [ ] **Step 4: Run green; negative control; gates**

Run: `npx vitest run tests/insights.test.ts` — Expected: 6 passed.
Negative control: change the brand rule's `1.5` to `3`, run, see the credit test go red, restore.
Run: `npm run typecheck && npm run lint && npm test`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/insights.ts tests/insights.test.ts
git commit -m "Compute insights from the rendered DTOs instead of storing them

Five pure rules in priority order (value vs previous, top-market visits,
brand protection, bookings vs last year, click-through); each fires only
with a comparison window. Negative control: raising the brand threshold
to 3x reddened its test (restored).
Gates: vitest <N> files passed; typecheck 0; lint 0.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---
### Task 6: Copy atoms — the words next to every number

**Files:**
- Create: `src/components/copy/metric-label.tsx`, `delta-text.tsx`, `value.tsx`, `insight-tag.tsx`, `live-dot.tsx`, `glossary-entry.tsx`, `index.ts`
- Test: `tests/components/copy.test.tsx`

**Interfaces:**
- Consumes: `glossary`, `GlossaryKey` (Task 2); `money`, `count`, `deltaText`, `delta` (Task 2); `InsightKind` (Task 5); shadcn `Tooltip*`; lucide `Info`, `TrendingUp`, `TrendingDown`, `Minus`.
- Produces:
  - `MetricLabel({ glossaryKey, className? })` — uppercase label + an icon button whose tooltip is the glossary meaning with the industry term once, in parentheses.
  - `DeltaText({ current, previous, vsLabel, className? })` — "+17% vs the previous 30 days" with an arrow icon; `null` when there is nothing to say.
  - `Value({ kind: "money" | "count", value, size?: "sm" | "md" | "lg" })` — tabular numerals; money takes cents.
  - `InsightTag({ kind })` — "Win" / "Watch" / "Autumn is on it".
  - `LiveDot({ label? })`; `GlossaryEntry({ glossaryKey })` — `<dt>` label, `<dd>` meaning.

- [ ] **Step 1: Failing tests**

```tsx
// @vitest-environment jsdom
// tests/components/copy.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MetricLabel, DeltaText, Value, InsightTag, LiveDot, GlossaryEntry } from "@/components/copy";

const wrap = (ui: React.ReactNode) => render(<TooltipProvider>{ui}</TooltipProvider>);

describe("copy atoms", () => {
  it("MetricLabel shows the plain label and offers the meaning without a bare acronym", () => {
    wrap(<MetricLabel glossaryKey="impressions" />);
    expect(screen.getByText("People reached")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "What does People reached mean?" })).toBeInTheDocument();
    expect(screen.queryByText(/\bCTR\b/)).toBeNull();
  });
  it("DeltaText writes the change as a sentence fragment, or nothing", () => {
    const { container } = wrap(<DeltaText current={41} previous={35} vsLabel="the previous 30 days" />);
    expect(screen.getByText("+17% vs the previous 30 days")).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
    const { container: empty } = wrap(<DeltaText current={5} previous={0} vsLabel="last year" />);
    expect(empty.textContent).toBe("");
  });
  it("DeltaText tones a drop as watch, never as an error", () => {
    wrap(<DeltaText current={90} previous={100} vsLabel="last year" />);
    expect(screen.getByText("-10% vs last year").parentElement?.className).toContain("text-watch");
  });
  it("Value formats money from cents and counts with separators, tabular", () => {
    wrap(<><Value kind="money" value={1824000} /><Value kind="count" value={6400} size="lg" /></>);
    expect(screen.getByText("$18,240").className).toContain("tabular-nums");
    expect(screen.getByText("6,400").className).toContain("text-2xl");
  });
  it("InsightTag reads in plain words", () => {
    wrap(<><InsightTag kind="win" /><InsightTag kind="watch" /><InsightTag kind="action" /></>);
    expect(screen.getByText("Win")).toBeInTheDocument();
    expect(screen.getByText("Watch")).toBeInTheDocument();
    expect(screen.getByText("Autumn is on it")).toBeInTheDocument();
  });
  it("LiveDot and GlossaryEntry render their copy", () => {
    wrap(<><LiveDot /><dl><GlossaryEntry glossaryKey="ctr" /></dl></>);
    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(screen.getByText("Clicked (click-through rate)")).toBeInTheDocument();
    expect(screen.getByText(/Shown as 1 in N/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run red**

Run: `npx vitest run tests/components/copy.test.tsx` — Expected: FAIL, module missing.

- [ ] **Step 3: Implement**

```tsx
// src/components/copy/metric-label.tsx
import { Info } from "lucide-react";
import { glossary, type GlossaryKey } from "@/lib/glossary";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Plain label first; the industry term appears once, in the tooltip, in parentheses (D4). */
export function MetricLabel({ glossaryKey, className }: { glossaryKey: GlossaryKey; className?: string }) {
  const e = glossary[glossaryKey];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground", className)}>
      {e.label}
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" aria-label={`What does ${e.label} mean?`} className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground/70 hover:text-foreground">
            <Info className="size-3.5" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-64 rounded-(--radius-float) p-(--float-pad) text-sm leading-snug">
          {e.industryTerm ? `${e.meaning} (${e.industryTerm})` : e.meaning}
        </TooltipContent>
      </Tooltip>
    </span>
  );
}
```

```tsx
// src/components/copy/delta-text.tsx
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { delta, deltaText } from "@/lib/format";
import { cn } from "@/lib/utils";

const TONE = { up: "text-positive", down: "text-watch", flat: "text-muted-foreground" } as const;
const ICON = { up: TrendingUp, down: TrendingDown, flat: Minus } as const;

/** "+17% vs the previous 30 days". A drop is something to watch, so it wears the watch tone, not the error tone. */
export function DeltaText({ current, previous, vsLabel, className }: { current: number; previous: number | null; vsLabel: string; className?: string }) {
  const text = deltaText(current, previous, vsLabel);
  if (!text) return null;
  const d = delta(current, previous).direction;
  const Icon = ICON[d];
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", TONE[d], className)}>
      <Icon className="size-3.5" aria-hidden="true" />
      <span>{text}</span>
    </span>
  );
}
```

```tsx
// src/components/copy/value.tsx
import { money, count } from "@/lib/format";
import { cn } from "@/lib/utils";

const SIZE = { sm: "text-sm font-medium", md: "text-base font-semibold", lg: "text-2xl font-semibold tracking-tight" } as const;

export function Value({ kind, value, size = "md", className }: { kind: "money" | "count"; value: number; size?: keyof typeof SIZE; className?: string }) {
  return <span className={cn("tabular-nums", SIZE[size], className)}>{kind === "money" ? money(value) : count(value)}</span>;
}
```

```tsx
// src/components/copy/insight-tag.tsx
import type { InsightKind } from "@/lib/insights";
import { cn } from "@/lib/utils";

const COPY: Record<InsightKind, string> = { win: "Win", watch: "Watch", action: "Autumn is on it" };
const TONE: Record<InsightKind, string> = { win: "bg-primary/15 text-primary", watch: "bg-watch/15 text-watch", action: "bg-muted text-foreground" };

export function InsightTag({ kind }: { kind: InsightKind }) {
  return <span className={cn("inline-flex h-6 items-center rounded-(--r-in) px-2 text-[11px] font-semibold uppercase tracking-wide", TONE[kind])}>{COPY[kind]}</span>;
}
```

```tsx
// src/components/copy/live-dot.tsx
export function LiveDot({ label = "Live" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
      <span aria-hidden="true" className="size-2 rounded-full bg-primary ring-3 ring-primary/20" />
      {label}
    </span>
  );
}
```

```tsx
// src/components/copy/glossary-entry.tsx
import { glossary, type GlossaryKey } from "@/lib/glossary";

export function GlossaryEntry({ glossaryKey }: { glossaryKey: GlossaryKey }) {
  const e = glossary[glossaryKey];
  return (
    <div className="flex flex-col gap-0.5 py-2">
      <dt className="text-sm font-semibold">{e.industryTerm ? `${e.label} (${e.industryTerm})` : e.label}</dt>
      <dd className="text-sm text-muted-foreground">{e.purpose ? `${e.meaning} ${e.purpose}` : e.meaning}</dd>
    </div>
  );
}
```

```ts
// src/components/copy/index.ts
export { MetricLabel } from "./metric-label";
export { DeltaText } from "./delta-text";
export { Value } from "./value";
export { InsightTag } from "./insight-tag";
export { LiveDot } from "./live-dot";
export { GlossaryEntry } from "./glossary-entry";
```
Note `text-positive` / `text-watch` exist because `globals.css` maps `--color-positive` and `--color-watch` in `@theme inline`.

- [ ] **Step 4: Run green; negative control; gates**

Run: `npx vitest run tests/components/copy.test.tsx` — Expected: 6 passed.
Negative control: swap `TONE.down` to `text-negative`, run, see "tones a drop as watch" go red, restore.
Run: `npm run typecheck && npm run lint && npm test`.

- [ ] **Step 5: Commit**

```bash
git add src/components/copy tests/components/copy.test.tsx
git commit -m "Add copy atoms: metric labels with glossary tooltips, deltas in words, values

Every label comes from glossary.ts; a drop wears the watch tone, not an
error tone. Negative control: retoning a drop as negative reddened the
tone test (restored).
Gates: vitest <N> files passed; typecheck 0; lint 0.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Chart atoms and the trend chart

**Files:**
- Create: `src/components/charts/chart-config.ts`, `meter.tsx`, `sparkline.tsx`, `chart-legend.tsx`, `use-chart-style.ts`, `style-segment.tsx`, `metric-select.tsx`, `trend-table.tsx`, `trend-chart.tsx`, `index.ts`
- Modify: `tests/setup.ts` (append a `ResizeObserver` stub; Recharts guards on it, the stub keeps jsdom quiet)
- Test: `tests/components/charts.test.tsx`

**Interfaces:**
- Consumes: `TrendDto`, `TrendMetric`, `TrendPoint` (Task 4); `bucketLabel`, `money`, `moneyCompact`, `compact`, `count` (Task 2); shadcn `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ToggleGroup`, `ToggleGroupItem`, `Select*`; Recharts `AreaChart`, `Area`, `BarChart`, `Bar`, `LineChart`, `Line`, `CartesianGrid`, `XAxis`, `YAxis`.
- Produces:
  - `type ChartStyle = "area" | "bars" | "line"`; `CHART_STYLES`; `useChartStyle(): [ChartStyle, (s: ChartStyle) => void]` (localStorage key `autumn:chart-style`, server snapshot `"area"`).
  - `trendChartConfig: ChartConfig`; `METRIC_LABELS: Record<TrendMetric, string>`; `metricKind(m): "money" | "count"`.
  - `Meter({ share, label })`, `Sparkline({ points, tone? })`, `ChartLegend({ items })`, `StyleSegment()`, `MetricSelect({ metric, range, basePath })`, `TrendTable({ trend, prevLabel, lastYearLabel })`, `TrendChart({ trend, prevLabel, lastYearLabel })`.

- [ ] **Step 1: Stub ResizeObserver for jsdom**

Append to `tests/setup.ts`:
```ts
// Recharts' ResponsiveContainer checks for ResizeObserver; jsdom has none. A no-op keeps chart tests quiet.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
}
```

- [ ] **Step 2: Failing tests**

```tsx
// @vitest-environment jsdom
// tests/components/charts.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, renderHook, act } from "@testing-library/react";
import { Meter, Sparkline, ChartLegend, TrendTable, TrendChart, useChartStyle, StyleSegment } from "@/components/charts";
import type { TrendDto } from "@/lib/db/queries/trend";

const trend: TrendDto = {
  metric: "booking_value", granularity: "day",
  points: [
    { bucket: "2026-09-01", current: 0, previous: 0, lastYear: 0 },
    { bucket: "2026-09-02", current: 100000, previous: 0, lastYear: 0 },
    { bucket: "2026-09-03", current: 0, previous: 90000, lastYear: 20000 },
  ],
};

describe("chart atoms", () => {
  it("Meter is an accessible meter with a pill track", () => {
    const { container } = render(<Meter share={0.64} label="Chicago share of bookings" />);
    const m = screen.getByRole("meter", { name: "Chicago share of bookings" });
    expect(m.getAttribute("aria-valuenow")).toBe("0.64");
    expect((container.querySelector("[data-slot=meter-fill]") as HTMLElement).style.width).toBe("64%");
  });
  it("Sparkline is decorative and draws one polyline", () => {
    const { container } = render(<Sparkline points={[1, 3, 2, 4]} />);
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelectorAll("polyline")).toHaveLength(1);
  });
  it("ChartLegend names every series", () => {
    render(<ChartLegend items={[{ label: "This period", kind: "line", color: "var(--chart-1)" }, { label: "Same days last year", kind: "dashed", color: "var(--chart-3)" }]} />);
    expect(screen.getByText("This period")).toBeInTheDocument();
    expect(screen.getByText("Same days last year")).toBeInTheDocument();
  });
  it("TrendTable is the chart's twin: one row per bucket, money formatted", () => {
    render(<TrendTable trend={trend} prevLabel="Previous 10 days" lastYearLabel="Same days last year" />);
    expect(screen.getByText("View as table")).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Sep 3/ })).toHaveTextContent("$0$900$200");
  });
  it("TrendChart renders an accessible figure, a legend and the table twin", () => {
    render(<TrendChart trend={trend} prevLabel="Previous 10 days" lastYearLabel="Same days last year" />);
    expect(screen.getByRole("figure", { name: "Booking value, day by day" })).toBeInTheDocument();
    expect(screen.getAllByText("Previous 10 days").length).toBeGreaterThan(0);
    expect(screen.getByText("View as table")).toBeInTheDocument();
  });
});

describe("chart style preference", () => {
  it("defaults to area, persists a change to localStorage, and the segment reflects it", () => {
    const { result } = renderHook(() => useChartStyle());
    expect(result.current[0]).toBe("area");
    act(() => result.current[1]("bars"));
    expect(result.current[0]).toBe("bars");
    expect(window.localStorage.getItem("autumn:chart-style")).toBe("bars");
    render(<StyleSegment />);
    expect(screen.getByRole("radio", { name: "Bars" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("radio", { name: "Line" }));
    expect(window.localStorage.getItem("autumn:chart-style")).toBe("line");
  });
});
```

- [ ] **Step 3: Run red**

Run: `npx vitest run tests/components/charts.test.tsx` — Expected: FAIL, module missing.

- [ ] **Step 4: Implement the atoms and the preference**

```ts
// src/components/charts/chart-config.ts
import type { ChartConfig } from "@/components/ui/chart";
import type { TrendMetric } from "@/lib/db/queries/trend";

/** One coloured series, comparisons in grey: the emphasis form (D26). Tokens only. */
export const trendChartConfig = {
  current: { label: "This period", color: "var(--chart-1)" },
  previous: { label: "Previous period", color: "var(--chart-2)" },
  lastYear: { label: "Same period last year", color: "var(--chart-3)" },
} satisfies ChartConfig;

export const METRIC_LABELS: Record<TrendMetric, string> = { booking_value: "Booking value", direct_bookings: "Direct bookings", website_visits: "Website visits" };
export const metricKind = (m: TrendMetric): "money" | "count" => (m === "booking_value" ? "money" : "count");
```

```tsx
// src/components/charts/meter.tsx
/** A single-hue share bar. The track is a pill (exempt from concentric corners). */
export function Meter({ share, label }: { share: number; label: string }) {
  const clamped = Math.max(0, Math.min(1, share));
  return (
    <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={1} aria-valuenow={Number(clamped.toFixed(2))} className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div data-slot="meter-fill" className="h-full rounded-full bg-primary" style={{ width: `${Math.round(clamped * 100)}%` }} />
    </div>
  );
}
```

```tsx
// src/components/charts/sparkline.tsx
const W = 72, H = 22;
/** Decorative trend hint beside a value; the value and its delta carry the meaning, so this is aria-hidden. */
export function Sparkline({ points, tone = "primary" }: { points: number[]; tone?: "primary" | "muted" }) {
  const max = Math.max(...points), min = Math.min(...points), span = max - min || 1;
  const pts = points.map((v, i) => `${((i / Math.max(1, points.length - 1)) * W).toFixed(1)},${(H - 2 - ((v - min) / span) * (H - 4)).toFixed(1)}`).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className="shrink-0">
      <polyline points={pts} fill="none" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" className={tone === "primary" ? "stroke-(--chart-1)" : "stroke-(--chart-2)"} />
    </svg>
  );
}
```

```tsx
// src/components/charts/chart-legend.tsx
export interface LegendItem { label: string; kind: "line" | "dashed" | "rect"; color: string }
/** Legend keys mirror the mark: a stroke for lines, a dashed stroke for the dashed series, a swatch for fills. */
export function ChartLegend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legend">
      {items.map((i) => (
        <li key={i.label} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={i.kind === "rect" ? "size-3 rounded-(--radius-min)" : i.kind === "dashed" ? "w-3.5 border-t-2 border-dashed" : "h-0.5 w-3.5"} style={i.kind === "dashed" ? { borderColor: i.color } : { background: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
```

```ts
// src/components/charts/use-chart-style.ts
"use client";
import { useSyncExternalStore } from "react";

export type ChartStyle = "area" | "bars" | "line";
export const CHART_STYLES: ChartStyle[] = ["area", "bars", "line"];
const KEY = "autumn:chart-style";
const EVENT = "autumn:chart-style-change";

const read = (): ChartStyle => {
  try { const v = window.localStorage.getItem(KEY); return CHART_STYLES.includes(v as ChartStyle) ? (v as ChartStyle) : "area"; } catch { return "area"; }
};
const subscribe = (cb: () => void) => { window.addEventListener("storage", cb); window.addEventListener(EVENT, cb); return () => { window.removeEventListener("storage", cb); window.removeEventListener(EVENT, cb); }; };

/** A per-browser preference. The server snapshot is always "area", so the first paint never differs from the server HTML. */
export function useChartStyle(): [ChartStyle, (s: ChartStyle) => void] {
  const style = useSyncExternalStore(subscribe, read, () => "area" as ChartStyle);
  const set = (s: ChartStyle) => { try { window.localStorage.setItem(KEY, s); } catch { /* private mode: the choice lasts for this render only */ } window.dispatchEvent(new Event(EVENT)); };
  return [style, set];
}
```

```tsx
// src/components/charts/style-segment.tsx
"use client";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useChartStyle, CHART_STYLES, type ChartStyle } from "./use-chart-style";

const LABEL: Record<ChartStyle, string> = { area: "Area", bars: "Bars", line: "Line" };

export function StyleSegment() {
  const [style, setStyle] = useChartStyle();
  return (
    <ToggleGroup type="single" value={style} onValueChange={(v) => { if (CHART_STYLES.includes(v as ChartStyle)) setStyle(v as ChartStyle); }} aria-label="Chart style" className="rounded-full border border-border bg-card p-0.5">
      {CHART_STYLES.map((s) => (
        <ToggleGroupItem key={s} value={s} aria-label={LABEL[s]} className="h-7 rounded-full px-3 text-xs font-medium text-muted-foreground data-[state=on]:bg-foreground data-[state=on]:text-card">
          {LABEL[s]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
```
If the generated `toggle-group.tsx` renders items with `role="radio"` (Radix does for `type="single"`), the test's `getByRole("radio")` holds; if the generated file adds its own `aria-label`, keep ours on the item so the test name matches.

```tsx
// src/components/charts/metric-select.tsx
"use client";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TREND_METRICS, type TrendMetric } from "@/lib/db/queries/trend";
import type { RangePreset } from "@/lib/date-range";
import { METRIC_LABELS } from "./chart-config";

/** Writes ?metric= next to the current ?range=; the page re-renders on the server with the new DTO. */
export function MetricSelect({ metric, range, basePath }: { metric: TrendMetric; range: RangePreset; basePath: string }) {
  const router = useRouter();
  return (
    <Select value={metric} onValueChange={(m) => router.push(`${basePath}?range=${range}&metric=${m}`)}>
      <SelectTrigger aria-label="Metric" className="h-7 rounded-full text-xs"><SelectValue /></SelectTrigger>
      <SelectContent className="rounded-(--radius-float)">
        {TREND_METRICS.map((m) => <SelectItem key={m} value={m}>{METRIC_LABELS[m]}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
```

```tsx
// src/components/charts/trend-table.tsx
import type { TrendDto } from "@/lib/db/queries/trend";
import { bucketLabel, money, count } from "@/lib/format";
import { METRIC_LABELS, metricKind } from "./chart-config";

/** The chart's twin. Native <details>, closed by default: no JS, no hydration shift, every value reachable without hover. */
export function TrendTable({ trend, prevLabel, lastYearLabel }: { trend: TrendDto; prevLabel: string | null; lastYearLabel: string | null }) {
  const fmt = metricKind(trend.metric) === "money" ? money : count;
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-primary underline-offset-4 hover:underline">View as table</summary>
      <div className="pt-2"><table className="w-full tabular-nums">
        <thead className="text-left text-muted-foreground">
          <tr><th scope="col" className="py-1 font-medium">Period</th><th scope="col" className="py-1 text-right font-medium">{METRIC_LABELS[trend.metric]}</th>{prevLabel ? <th scope="col" className="py-1 text-right font-medium">{prevLabel}</th> : null}{lastYearLabel ? <th scope="col" className="py-1 text-right font-medium">{lastYearLabel}</th> : null}</tr>
        </thead>
        <tbody>
          {trend.points.map((p) => (
            <tr key={p.bucket} aria-label={bucketLabel(p.bucket, trend.granularity)} className="border-t border-border">
              <th scope="row" className="py-1 font-normal">{bucketLabel(p.bucket, trend.granularity)}</th>
              <td className="py-1 text-right">{fmt(p.current)}</td>
              {prevLabel ? <td className="py-1 text-right">{p.previous === null ? "—" : fmt(p.previous)}</td> : null}
              {lastYearLabel ? <td className="py-1 text-right">{p.lastYear === null ? "—" : fmt(p.lastYear)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table></div>
    </details>
  );
}
```

```tsx
// src/components/charts/trend-chart.tsx
"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { TrendDto } from "@/lib/db/queries/trend";
import { bucketLabel, money, moneyCompact, compact, count } from "@/lib/format";
import { trendChartConfig, METRIC_LABELS, metricKind } from "./chart-config";
import { useChartStyle } from "./use-chart-style";
import { ChartLegend } from "./chart-legend";
import { TrendTable } from "./trend-table";

const GRAN = { day: "day by day", week: "week by week", month: "month by month" } as const;

/** One metric, three periods. Style (area | bars | line) is the viewer's preference; the box height is fixed by --plot-height so switching never shifts the page. */
export function TrendChart({ trend, prevLabel, lastYearLabel }: { trend: TrendDto; prevLabel: string | null; lastYearLabel: string | null }) {
  const [style] = useChartStyle();
  const kind = metricKind(trend.metric);
  const axis = kind === "money" ? (v: number) => moneyCompact(v) : (v: number) => compact(v);
  const full = kind === "money" ? money : count;
  const title = `${METRIC_LABELS[trend.metric]}, ${GRAN[trend.granularity]}`;
  const data = trend.points.map((p) => ({ ...p, label: bucketLabel(p.bucket, trend.granularity) }));
  const hasComparison = prevLabel !== null;
  const common = {
    data, margin: { top: 8, right: 12, left: 0, bottom: 0 },
  };
  const axes = (
    <>
      <CartesianGrid vertical={false} strokeDasharray="0" />
      <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={32} tickMargin={8} />
      <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={axis} />
      <ChartTooltip cursor content={<ChartTooltipContent className="rounded-(--radius-float) p-(--float-pad)" formatter={(v, name) => [full(Number(v)), trendChartConfig[name as keyof typeof trendChartConfig]?.label ?? name]} />} />
    </>
  );
  return (
    <figure aria-label={title} className="flex flex-col gap-3">
      <ChartContainer config={trendChartConfig} className="aspect-auto h-(--plot-height) w-full">
        {style === "bars" ? (
          <BarChart {...common}>
            {axes}
            <Bar dataKey="current" fill="var(--color-current)" radius={[4, 4, 0, 0]} maxBarSize={24} />
            {hasComparison ? <Line type="monotone" dataKey="previous" stroke="var(--color-previous)" strokeWidth={2} dot={false} /> : null}
          </BarChart>
        ) : style === "line" ? (
          <LineChart {...common}>
            {axes}
            {hasComparison ? <Line type="monotone" dataKey="lastYear" stroke="var(--color-lastYear)" strokeWidth={2} strokeDasharray="4 4" dot={false} /> : null}
            {hasComparison ? <Line type="monotone" dataKey="previous" stroke="var(--color-previous)" strokeWidth={2} dot={false} /> : null}
            <Line type="monotone" dataKey="current" stroke="var(--color-current)" strokeWidth={2} dot={false} activeDot={{ r: 5, strokeWidth: 2 }} />
          </LineChart>
        ) : (
          <AreaChart {...common}>
            {axes}
            {hasComparison ? <Line type="monotone" dataKey="lastYear" stroke="var(--color-lastYear)" strokeWidth={2} strokeDasharray="4 4" dot={false} /> : null}
            {hasComparison ? <Line type="monotone" dataKey="previous" stroke="var(--color-previous)" strokeWidth={2} dot={false} /> : null}
            <Area type="monotone" dataKey="current" stroke="var(--color-current)" fill="var(--color-current)" fillOpacity={0.12} strokeWidth={2} dot={false} activeDot={{ r: 5, strokeWidth: 2 }} />
          </AreaChart>
        )}
      </ChartContainer>
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <ChartLegend items={[
          { label: trendChartConfig.current.label, kind: style === "bars" ? "rect" : "line", color: "var(--chart-1)" },
          ...(prevLabel ? [{ label: prevLabel, kind: "line" as const, color: "var(--chart-2)" }] : []),
          ...(lastYearLabel && style !== "bars" ? [{ label: lastYearLabel, kind: "dashed" as const, color: "var(--chart-3)" }] : []),
        ]} />
        <TrendTable trend={trend} prevLabel={prevLabel} lastYearLabel={lastYearLabel} />
      </figcaption>
    </figure>
  );
}
```
Recharts 3 renders a `<Line>` inside `BarChart`/`AreaChart` (composed charts accept mixed series). If the installed version rejects it, switch the three charts to `ComposedChart` with the same children; the props above are unchanged.

```ts
// src/components/charts/index.ts
export { trendChartConfig, METRIC_LABELS, metricKind } from "./chart-config";
export { Meter } from "./meter";
export { Sparkline } from "./sparkline";
export { ChartLegend, type LegendItem } from "./chart-legend";
export { useChartStyle, CHART_STYLES, type ChartStyle } from "./use-chart-style";
export { StyleSegment } from "./style-segment";
export { MetricSelect } from "./metric-select";
export { TrendTable } from "./trend-table";
export { TrendChart } from "./trend-chart";
```

- [ ] **Step 5: Run green; negative control; gates**

Run: `npx vitest run tests/components/charts.test.tsx` — Expected: 6 passed.
Negative control: in `use-chart-style.ts` make `read()` return `"area"` unconditionally; the preference test goes red; restore.
Run: `npm run typecheck && npm run lint && npm test`.

- [ ] **Step 6: Commit**

```bash
git add src/components/charts tests/components/charts.test.tsx tests/setup.ts
git commit -m "Add chart atoms and the trend chart with a viewer-chosen style

One coloured series, comparisons in grey; area, bars or line from the same
DTO inside a fixed-height box; a native <details> table twin. The style is
a localStorage preference read after mount, so server and first paint agree.
Negative control: pinning read() to area reddened the preference test (restored).
Gates: vitest <N> files passed; typecheck 0; lint 0.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Collapsible section and the dashboard organisms

**Files:**
- Create: `src/components/layout/collapsible-section.tsx` (+ export from `layout/index.ts`), `src/components/dashboard/headline.tsx`, `quick-stat.tsx`, `quick-analytics.tsx`, `insight-card.tsx`, `insight-list.tsx`, `glossary-section.tsx`, `overview-skeleton.tsx`, `index.ts`
- Test: `tests/components/dashboard.test.tsx`

**Interfaces:**
- Consumes: Tasks 1, 2, 5, 6, 7; `OverviewDto`, `QuickAnalyticsDto`, `QuickStatDto` (Task 3); `InsightDto` (Task 5); shadcn `Collapsible*`, `Skeleton`; lucide `ChevronDown`.
- Produces:
  - `CollapsibleSection({ id, title, description, openAtWide?: boolean, children })` — client; closed on server and first paint; opens when the URL hash equals `#id`; with `openAtWide` it is open in place from `2xl` by CSS.
  - `Headline({ overview, rangeTitle })`, `QuickStat({ stat })`, `QuickAnalytics({ data })`, `InsightCard({ insight })`, `InsightList({ insights })`, `GlossarySection({ keys })`, `OverviewBodySkeleton()`, `OverviewPageSkeleton()`.

- [ ] **Step 1: Failing tests**

```tsx
// @vitest-environment jsdom
// tests/components/dashboard.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CollapsibleSection } from "@/components/layout";
import { Headline, QuickAnalytics, InsightList, GlossarySection, OverviewBodySkeleton } from "@/components/dashboard";
import type { OverviewDto, QuickAnalyticsDto } from "@/lib/db/queries/overview";

const totals = { bookings: 41, valueCents: 1824000, impressions: 6400, clicks: 1020, websiteVisits: 1080, newVisitors: 5210, pagesPerSession: 3.6 };
const overview: OverviewDto = {
  from: "2026-08-18", to: "2026-09-16", days: 30, prevLabel: "the previous 30 days", lastYearLabel: "this time last year",
  current: totals, previous: { ...totals, bookings: 35, valueCents: 1508000 }, lastYear: { ...totals, bookings: 33, valueCents: 1471000 },
  feeRateBps: 1500, feeCents: 273600, netCents: 1550400,
};
const quick: QuickAnalyticsDto = { stats: [
  { key: "direct_bookings", kind: "count", value: 41, previous: 35, spark: [9, 11, 10, 11] },
  { key: "booking_value", kind: "money", value: 1824000, previous: 1508000, spark: [400000, 500000, 450000, 474000] },
  { key: "website_visits", kind: "count", value: 1080, previous: 990, spark: [260, 280, 270, 270] },
  { key: "impressions", kind: "count", value: 6400, previous: 6600, spark: [1700, 1600, 1500, 1600] },
] };
const wrap = (ui: React.ReactNode) => render(<TooltipProvider>{ui}</TooltipProvider>);

describe("Headline", () => {
  it("is one sentence with bookings, value and what the owner kept, plus deltas in words", () => {
    wrap(<Headline overview={overview} rangeTitle="Last 30 days" />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("Autumn brought you 41 direct bookings worth $18,240. You kept $15,504 after Autumn's 15% fee.");
    expect(screen.getByText("+21% vs the previous 30 days")).toBeInTheDocument();
    expect(screen.getByText("+24% vs this time last year")).toBeInTheDocument();
    expect(screen.getByText(/Autumn's fee this period/).textContent).toContain("$2,736");
    expect(screen.getByText("Last 30 days · Aug 18 – Sep 16, 2026")).toBeInTheDocument();
  });
  it("drops the comparison lines for the all-time range", () => {
    wrap(<Headline overview={{ ...overview, previous: null, lastYear: null, prevLabel: null, lastYearLabel: null }} rangeTitle="Since the beginning" />);
    expect(screen.queryByText(/vs /)).toBeNull();
  });
});

describe("QuickAnalytics", () => {
  it("renders four stats in one panel with labels, values and deltas", () => {
    wrap(<QuickAnalytics data={quick} />);
    expect(screen.getByRole("region", { name: "Quick analytics" })).toBeInTheDocument();
    expect(screen.getByText("Direct bookings")).toBeInTheDocument();
    expect(screen.getByText("$18,240")).toBeInTheDocument();
    expect(screen.getByText("-3% vs previous")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /What does .* mean\?/ })).toHaveLength(4);
  });
});

describe("InsightList", () => {
  it("renders cards with tags and anchor links, and an explicit empty state", () => {
    wrap(<InsightList insights={[{ kind: "watch", title: "Chicago, IL sent fewer visitors", body: "Visits fell 12%.", anchor: "markets" }]} />);
    expect(screen.getByText("Watch")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See where your guests come from" }).getAttribute("href")).toBe("#markets");
    wrap(<InsightList insights={[]} />);
    expect(screen.getByText("Nothing needs your attention this period")).toBeInTheDocument();
  });
});

describe("CollapsibleSection", () => {
  it("starts closed, opens on click, and is a real button with aria-expanded", () => {
    render(<CollapsibleSection id="funnel" title="Funnel and website engagement" description="From being seen to being booked."><p>inside</p></CollapsibleSection>);
    const btn = screen.getByRole("button", { name: /Funnel and website engagement/ });
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByText("inside").closest("[data-state]")?.getAttribute("data-state")).toBe("closed");
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
  });
  it("opens when the URL hash names it", () => {
    window.location.hash = "#campaigns";
    render(<CollapsibleSection id="campaigns" title="Campaigns" description="x"><p>c</p></CollapsibleSection>);
    expect(screen.getByRole("button", { name: /Campaigns/ }).getAttribute("aria-expanded")).toBe("true");
    window.location.hash = "";
  });
  it("carries the wide-screen open-in-place classes only when asked", () => {
    const { container } = render(<CollapsibleSection id="w" title="W" description="x" openAtWide><p>w</p></CollapsibleSection>);
    expect((container.querySelector("[data-slot=collapsible-content]") as HTMLElement).className).toContain("2xl:block");
  });
});

describe("GlossarySection and skeleton", () => {
  it("lists the entries it is given inside a collapsible", () => {
    wrap(<GlossarySection keys={["direct_bookings", "autumn_fee"]} />);
    expect(screen.getByRole("button", { name: /Understand these numbers/ })).toBeInTheDocument();
    expect(screen.getByText("Direct bookings (attributed bookings)")).toBeInTheDocument();
  });
  it("skeleton reserves the plot height so the chart never shifts the page", () => {
    const { container } = render(<OverviewBodySkeleton />);
    expect(container.querySelector(".h-\\(--plot-height\\)")).not.toBeNull();
  });
});
```
Headline delta arithmetic: `1824000 vs 1508000 = +21%`; `1824000 vs 1471000 = +24%`. Quick analytics: impressions `6400 vs 6600 = −3%`.

- [ ] **Step 2: Run red**

Run: `npx vitest run tests/components/dashboard.test.tsx` — Expected: FAIL, modules missing.

- [ ] **Step 3: Implement the collapsible**

```tsx
// src/components/layout/collapsible-section.tsx
"use client";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { Panel } from "./panel";

/**
 * Closed on the server and on first paint, so hydration never moves the page. Opens on click or when the URL
 * hash names it (insight links). With openAtWide the content is shown in place from 2xl by CSS alone.
 */
export function CollapsibleSection({ id, title, description, openAtWide = false, children }: { id: string; title: string; description: string; openAtWide?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const check = () => { if (window.location.hash === `#${id}`) setOpen(true); };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, [id]);
  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <Panel id={id} className="gap-0 scroll-mt-20">
        <CollapsibleTrigger className={cn("flex w-full items-center justify-between gap-3 text-left", openAtWide && "2xl:pointer-events-none")}>
          <span className="flex flex-col gap-0.5">
            <span className="text-base font-semibold leading-snug">{title}</span>
            <span className="text-sm text-muted-foreground">{description}</span>
          </span>
          <span aria-hidden="true" className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-(--r-in) border border-border text-muted-foreground transition-transform", open && "rotate-180", openAtWide && "2xl:hidden")}>
            <ChevronDown className="size-4" />
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent forceMount data-slot="collapsible-content" className={cn("pt-4 data-[state=closed]:hidden", openAtWide && "2xl:block")}>
          {children}
        </CollapsibleContent>
      </Panel>
    </Collapsible>
  );
}
```
Add to `src/components/layout/index.ts`: `export { CollapsibleSection } from "./collapsible-section";`.
Radix sets `hidden` on closed content; the `2xl:block` author rule outranks the user-agent `[hidden]` rule, which is what makes the wide-screen open-in-place work without JavaScript.

- [ ] **Step 4: Implement the dashboard organisms**

```tsx
// src/components/dashboard/headline.tsx
import type { OverviewDto } from "@/lib/db/queries/overview";
import { money, rangeLabel } from "@/lib/format";
import { DeltaText } from "@/components/copy";

/** The answer, in one sentence (D1). The only large type on the page. */
export function Headline({ overview: o, rangeTitle }: { overview: OverviewDto; rangeTitle: string }) {
  return (
    <section aria-label="Headline" className="flex flex-col gap-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{rangeTitle} · {rangeLabel(o.from, o.to)}</p>
      <h1 className="max-w-4xl text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
        Autumn brought you <span className="tabular-nums">{o.current.bookings} direct bookings</span> worth <span className="tabular-nums">{money(o.current.valueCents)}</span>. You kept <span className="tabular-nums">{money(o.netCents)}</span> after Autumn&apos;s {o.feeRateBps / 100}% fee.
      </h1>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {o.previous && o.prevLabel ? <DeltaText current={o.current.valueCents} previous={o.previous.valueCents} vsLabel={o.prevLabel} className="text-sm" /> : null}
        {o.lastYear && o.lastYearLabel ? <DeltaText current={o.current.valueCents} previous={o.lastYear.valueCents} vsLabel={o.lastYearLabel} className="text-sm" /> : null}
        <span>Autumn&apos;s fee this period: <span className="tabular-nums">{money(o.feeCents)}</span></span>
      </p>
    </section>
  );
}
```

```tsx
// src/components/dashboard/quick-stat.tsx
import type { QuickStatDto } from "@/lib/db/queries/overview";
import { MetricLabel, Value, DeltaText } from "@/components/copy";
import { Sparkline } from "@/components/charts";

/** One cell of the quick-analytics strip: label, value, sparkline, delta. Padding is the panel token so cells align with every other panel. */
export function QuickStat({ stat }: { stat: QuickStatDto }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 bg-card p-(--panel-pad)">
      <MetricLabel glossaryKey={stat.key} />
      <div className="flex items-center justify-between gap-2">
        <Value kind={stat.kind} value={stat.value} size="lg" />
        <Sparkline points={stat.spark} tone={stat.key === "impressions" ? "muted" : "primary"} />
      </div>
      <DeltaText current={stat.value} previous={stat.previous} vsLabel="previous" />
    </div>
  );
}
```

```tsx
// src/components/dashboard/quick-analytics.tsx
import type { QuickAnalyticsDto } from "@/lib/db/queries/overview";
import { Panel } from "@/components/layout";
import { QuickStat } from "./quick-stat";

/** Four numbers in one panel. Hairlines come from a 1px gap over the border colour, so any column count divides correctly. */
export function QuickAnalytics({ data }: { data: QuickAnalyticsDto }) {
  return (
    <Panel className="@container overflow-hidden p-0">
      <section aria-label="Quick analytics" className="grid grid-cols-2 gap-px bg-border @3xl:grid-cols-4">
        {data.stats.map((s) => <QuickStat key={s.key} stat={s} />)}
      </section>
    </Panel>
  );
}
```

```tsx
// src/components/dashboard/insight-card.tsx
import type { InsightDto } from "@/lib/insights";
import { InsightTag } from "@/components/copy";

const LINK: Record<NonNullable<InsightDto["anchor"]>, string> = { markets: "See where your guests come from", campaigns: "See your campaigns", funnel: "See the funnel" };

export function InsightCard({ insight }: { insight: InsightDto }) {
  return (
    <article className="flex flex-col gap-1.5 py-4 first:pt-0 last:pb-0">
      <div><InsightTag kind={insight.kind} /></div>
      <h3 className="text-sm font-semibold">{insight.title}</h3>
      <p className="text-sm leading-snug text-muted-foreground">{insight.body}</p>
      {insight.anchor ? <a href={`#${insight.anchor}`} className="text-xs font-medium text-primary underline-offset-4 hover:underline">{LINK[insight.anchor]}</a> : null}
    </article>
  );
}
```

```tsx
// src/components/dashboard/insight-list.tsx
import type { InsightDto } from "@/lib/insights";
import { Panel, PanelHeader, PanelBody, EmptyState } from "@/components/layout";
import { InsightCard } from "./insight-card";

export function InsightList({ insights }: { insights: InsightDto[] }) {
  return (
    <Panel>
      <PanelHeader headingId="insights-h" title="What's happening" description="Computed from the numbers on this page." />
      <PanelBody className="divide-y divide-border">
        {insights.length === 0
          ? <EmptyState title="Nothing needs your attention this period" description="Autumn will flag anything that changes." />
          : insights.map((i) => <InsightCard key={i.title} insight={i} />)}
      </PanelBody>
    </Panel>
  );
}
```

```tsx
// src/components/dashboard/glossary-section.tsx
import type { GlossaryKey } from "@/lib/glossary";
import { CollapsibleSection } from "@/components/layout";
import { GlossaryEntry } from "@/components/copy";

export function GlossarySection({ keys }: { keys: GlossaryKey[] }) {
  return (
    <CollapsibleSection id="glossary" title="Understand these numbers" description="Plain-language meaning of every figure on this page.">
      <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
        {keys.map((k) => <GlossaryEntry key={k} glossaryKey={k} />)}
      </dl>
    </CollapsibleSection>
  );
}
```

```tsx
// src/components/dashboard/overview-skeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";
import { Panel, Grid, Stack } from "@/components/layout";

/** Same boxes as the real organisms, so the page does not move when data arrives. */
function PanelSkeleton({ rows, plot = false }: { rows: number; plot?: boolean }) {
  return (
    <Panel>
      <Skeleton className="h-5 w-48 rounded-(--r-in)" />
      <Skeleton className="h-4 w-72 rounded-(--r-in)" />
      {plot ? <Skeleton className="h-(--plot-height) w-full rounded-(--r-in)" /> : null}
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-10 w-full rounded-(--r-in)" />)}
    </Panel>
  );
}

export function OverviewBodySkeleton() {
  return (
    <Stack>
      <Grid variant="sidebar"><PanelSkeleton rows={1} plot /><PanelSkeleton rows={3} /></Grid>
      <Grid variant="wide-three"><PanelSkeleton rows={6} /><PanelSkeleton rows={3} /><PanelSkeleton rows={1} /></Grid>
      <PanelSkeleton rows={0} />
    </Stack>
  );
}

export function OverviewPageSkeleton() {
  return (
    <Stack>
      <div className="flex flex-col gap-2"><Skeleton className="h-4 w-56 rounded-(--r-in)" /><Skeleton className="h-9 w-full max-w-3xl rounded-(--r-in)" /><Skeleton className="h-4 w-80 rounded-(--r-in)" /></div>
      <Panel className="overflow-hidden p-0"><div className="grid grid-cols-2 gap-px bg-border @3xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="flex h-28 flex-col gap-2 bg-card p-(--panel-pad)"><Skeleton className="h-3 w-24 rounded-(--r-in)" /><Skeleton className="h-8 w-20 rounded-(--r-in)" /></div>)}</div></Panel>
      <OverviewBodySkeleton />
    </Stack>
  );
}
```

```ts
// src/components/dashboard/index.ts
export { Headline } from "./headline";
export { QuickStat } from "./quick-stat";
export { QuickAnalytics } from "./quick-analytics";
export { InsightCard } from "./insight-card";
export { InsightList } from "./insight-list";
export { GlossarySection } from "./glossary-section";
export { OverviewBodySkeleton, OverviewPageSkeleton } from "./overview-skeleton";
```

- [ ] **Step 5: Run green; negative control; gates**

Run: `npx vitest run tests/components/dashboard.test.tsx` — Expected: 10 passed.
Negative control: in `collapsible-section.tsx` change `useState(false)` to `useState(true)`; "starts closed" goes red; restore.
Run: `npm run typecheck && npm run lint && npm test` (the architecture test now has real components to scan; it must stay green).

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/collapsible-section.tsx src/components/layout/index.ts src/components/dashboard tests/components/dashboard.test.tsx
git commit -m "Add the headline sentence, quick-analytics strip, insights and collapsible section

The collapsible renders closed on server and client and opens from a hash
link; at 2xl the funnel shows in place by CSS. Skeletons reserve the same
boxes, including the plot height. Negative control: defaulting the
collapsible open reddened the starts-closed test (restored).
Gates: vitest <N> files passed; typecheck 0; lint 0.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Source organisms on the Overview — markets, campaigns, funnel

**Files:**
- Create: `src/components/dashboard/market-row.tsx`, `feeder-markets.tsx`, `campaign-row.tsx`, `campaign-summary.tsx`, `funnel-step.tsx`, `funnel-section.tsx`; Modify: `src/components/dashboard/index.ts` (append the six exports)
- Test: `tests/components/dashboard-sources.test.tsx`

**Interfaces:**
- Consumes: `MarketDto`, `CampaignDto`, `CampaignSummaryDto`, `FunnelDto`, `FunnelStepDto` (Task 4); `Meter` (Task 7); `MetricLabel`, `Value`, `LiveDot` (Task 6); `Panel*`, `CollapsibleSection` (Tasks 1, 8); `oneIn`, `count`, `money`, `pct` (Task 2); `glossary`.
- Produces: `MarketRow({ market })`, `FeederMarkets({ markets })` (panel `id="markets"`; "All markets" links to `/website-traffic#markets`, the second screen), `CampaignRow({ campaign })`, `CampaignSummary({ summary })` (panel `id="campaigns"`), `FunnelStep({ step })`, `FunnelSection({ funnel })` (collapsible `id="funnel"`, `openAtWide`). All live in `dashboard/` because the Overview is the screen that composes them.

Column rules (container queries on each panel, never a viewport hook): markets show `Market · Bookings · Value` and add `Visits` from `@md`; campaigns show `Campaign · Bookings` and add `Shown · Visits · Clicked` from `@lg`.

- [ ] **Step 1: Failing tests**

```tsx
// @vitest-environment jsdom
// tests/components/dashboard-sources.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FeederMarkets, CampaignSummary, FunnelSection } from "@/components/dashboard";
import type { MarketDto, CampaignSummaryDto, FunnelDto } from "@/lib/db/queries/breakdowns";

const markets: MarketDto[] = [
  { name: "Chicago, IL", hint: "2 h 15 drive", visits: 377, previousVisits: 428, bookings: 14, valueCents: 630000, share: 1 },
  { name: "Everywhere else", hint: null, visits: 202, previousVisits: 190, bookings: 9, valueCents: 398000, share: 9 / 14 },
];
const summary: CampaignSummaryDto = {
  campaigns: [
    { key: "brand_protection", name: "Protecting your name", live: true, shown: 2300, visits: 690, ctr: 0.3, bookings: 27, valueCents: 1201000, share: 27 / 41 },
    { key: "discovery", name: "Finding new guests", live: false, shown: 4100, visits: 330, ctr: 0.08, bookings: 14, valueCents: 623000, share: 14 / 41 },
  ],
  total: { shown: 6400, visits: 1020, ctr: 1020 / 6400, bookings: 41, valueCents: 1824000 },
};
const funnel: FunnelDto = {
  steps: [
    { key: "impressions", people: 6400, onwardRatio: 1020 / 6400, valueCents: null },
    { key: "clicks", people: 1020, onwardRatio: 41 / 1020, valueCents: null },
    { key: "direct_bookings", people: 41, onwardRatio: null, valueCents: 1824000 },
  ],
  newVisitors: 5210, pagesPerSession: 3.6, devices: [{ key: "device_mobile", share: 0.58 }, { key: "device_desktop", share: 0.35 }, { key: "device_tablet", share: 0.07 }],
};
const wrap = (ui: React.ReactNode) => render(<TooltipProvider>{ui}</TooltipProvider>);

describe("FeederMarkets", () => {
  it("ranks markets with hints, bookings, value and a share meter; visits are container-gated", () => {
    wrap(<FeederMarkets markets={markets} />);
    expect(document.getElementById("markets")).not.toBeNull();
    const row = screen.getByRole("row", { name: "Chicago, IL" });
    expect(row).toHaveTextContent("2 h 15 drive");
    expect(within(row).getByRole("meter", { name: "Chicago, IL share of bookings" }).getAttribute("aria-valuenow")).toBe("1");
    expect(within(row).getByText("377").className).toContain("@md:block");
    expect(within(row).getByText("$6,300")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /All markets/ }).getAttribute("href")).toBe("/website-traffic#markets");
  });
});

describe("CampaignSummary", () => {
  it("names campaigns plainly, shows click-through as 1 in N, live dots, and a total from the DTO", () => {
    wrap(<CampaignSummary summary={summary} />);
    expect(document.getElementById("campaigns")).not.toBeNull();
    const brand = screen.getByRole("row", { name: "Protecting your name" });
    expect(within(brand).getByText("Live")).toBeInTheDocument();
    expect(within(brand).getByText("1 in 3")).toBeInTheDocument();
    expect(within(brand).getByText("Keeps online travel agencies from winning guests who were already looking for you.")).toBeInTheDocument();
    expect(within(screen.getByRole("row", { name: "Finding new guests" })).queryByText("Live")).toBeNull();
    expect(screen.getByText("1 live")).toBeInTheDocument();
    const total = screen.getByRole("row", { name: "All campaigns" });
    expect(total).toHaveTextContent("6,400"); expect(total).toHaveTextContent("1 in 6"); expect(total).toHaveTextContent("$18,240");
    expect(screen.queryByText(/\bCTR\b/)).toBeNull();
  });
});

describe("FunnelSection", () => {
  it("is a collapsible that opens in place on wide screens and chains the steps", () => {
    wrap(<FunnelSection funnel={funnel} />);
    const btn = screen.getByRole("button", { name: /Funnel and website engagement/ });
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    expect((document.querySelector("[data-slot=collapsible-content]") as HTMLElement).className).toContain("2xl:block");
    expect(screen.getByRole("row", { name: "People reached" })).toHaveTextContent("6,4001 in 6");
    expect(screen.getByRole("row", { name: "Direct bookings" })).toHaveTextContent("41$18,240");
    expect(screen.getByText("5,210")).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "Phone share of visits" }).getAttribute("aria-valuenow")).toBe("0.58");
  });
});
```

- [ ] **Step 2: Run red**

Run: `npx vitest run tests/components/dashboard-sources.test.tsx` — Expected: FAIL, exports missing.

- [ ] **Step 3: Implement**

```tsx
// src/components/dashboard/market-row.tsx
import type { MarketDto } from "@/lib/db/queries/breakdowns";
import { count, money } from "@/lib/format";
import { Meter } from "@/components/charts";

export const MARKET_COLS = "grid-cols-[minmax(0,1.6fr)_4.5rem_5.25rem] @md:grid-cols-[minmax(0,1.6fr)_4.5rem_4.5rem_5.25rem]";

export function MarketRow({ market: m }: { market: MarketDto }) {
  return (
    <div role="row" aria-label={m.name} className={`grid items-center gap-3 py-2.5 ${MARKET_COLS}`}>
      <div role="cell" className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2"><span className="truncate text-sm font-medium">{m.name}</span>{m.hint ? <span className="shrink-0 text-xs text-muted-foreground">{m.hint}</span> : null}</div>
        <Meter share={m.share} label={`${m.name} share of bookings`} />
      </div>
      <div role="cell" className="hidden text-right text-sm tabular-nums text-muted-foreground @md:block">{count(m.visits)}</div>
      <div role="cell" className="text-right text-sm font-semibold tabular-nums">{count(m.bookings)}</div>
      <div role="cell" className="text-right text-sm tabular-nums">{money(m.valueCents)}</div>
    </div>
  );
}
```

```tsx
// src/components/dashboard/feeder-markets.tsx
import { ArrowRight } from "lucide-react";
import type { MarketDto } from "@/lib/db/queries/breakdowns";
import { Panel, PanelHeader, PanelBody, EmptyState } from "@/components/layout";
import { MarketRow, MARKET_COLS } from "./market-row";

const th = "text-[11px] font-medium uppercase tracking-wide text-muted-foreground";

export function FeederMarkets({ markets }: { markets: MarketDto[] }) {
  return (
    <Panel id="markets" className="@container scroll-mt-20">
      <PanelHeader headingId="markets-h" title="Where your guests come from" description="Cities sending visitors and bookings, ranked by bookings."
        action={<a href="/website-traffic#markets" className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline">All markets <ArrowRight className="size-3" aria-hidden="true" /></a>} />
      <PanelBody>
        {markets.length === 0 ? <EmptyState title="No bookings in this period yet" /> : (
          <div role="table" aria-labelledby="markets-h" className="divide-y divide-border">
            <div role="row" className={`grid gap-3 pb-2 ${MARKET_COLS}`}>
              <span role="columnheader" className={th}>Market</span>
              <span role="columnheader" className={`hidden text-right @md:block ${th}`}>Visits</span>
              <span role="columnheader" className={`text-right ${th}`}>Bookings</span>
              <span role="columnheader" className={`text-right ${th}`}>Value</span>
            </div>
            {markets.map((m) => <MarketRow key={m.name} market={m} />)}
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}
```

```tsx
// src/components/dashboard/campaign-row.tsx
import type { CampaignDto } from "@/lib/db/queries/breakdowns";
import { glossary } from "@/lib/glossary";
import { count, money, oneIn } from "@/lib/format";
import { Meter } from "@/components/charts";
import { LiveDot } from "@/components/copy";

export const CAMPAIGN_COLS = "grid-cols-[minmax(0,1.7fr)_6.5rem] @lg:grid-cols-[minmax(0,1.7fr)_4rem_4rem_4.5rem_6.5rem]";

export function CampaignRow({ campaign: c }: { campaign: CampaignDto }) {
  const purpose = c.key ? glossary[c.key].purpose : undefined;
  return (
    <div role="row" aria-label={c.name} className={`grid items-center gap-3 py-3 ${CAMPAIGN_COLS}`}>
      <div role="cell" className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-center gap-2"><span className="truncate text-sm font-medium">{c.name}</span>{c.live ? <LiveDot /> : null}</div>
        {purpose ? <p className="text-xs text-muted-foreground">{purpose}</p> : null}
        <Meter share={c.share} label={`${c.name} share of bookings`} />
      </div>
      <div role="cell" className="hidden text-right text-sm tabular-nums text-muted-foreground @lg:block">{count(c.shown)}</div>
      <div role="cell" className="hidden text-right text-sm tabular-nums text-muted-foreground @lg:block">{count(c.visits)}</div>
      <div role="cell" className="hidden text-right text-sm tabular-nums text-muted-foreground @lg:block">{oneIn(c.ctr)}</div>
      <div role="cell" className="text-right text-sm tabular-nums"><span className="font-semibold">{count(c.bookings)}</span> <span className="text-muted-foreground">· {money(c.valueCents)}</span></div>
    </div>
  );
}
```

```tsx
// src/components/dashboard/campaign-summary.tsx
import type { CampaignSummaryDto } from "@/lib/db/queries/breakdowns";
import { count, money, oneIn } from "@/lib/format";
import { Panel, PanelHeader, PanelBody, EmptyState } from "@/components/layout";
import { MetricLabel, LiveDot } from "@/components/copy";
import { CampaignRow, CAMPAIGN_COLS } from "./campaign-row";

const th = "text-[11px] font-medium uppercase tracking-wide text-muted-foreground";

export function CampaignSummary({ summary: s }: { summary: CampaignSummaryDto }) {
  const live = s.campaigns.filter((c) => c.live).length;
  return (
    <Panel id="campaigns" className="@container scroll-mt-20">
      <PanelHeader headingId="campaigns-h" title="What each campaign is doing" description="Bars show each campaign's share of your direct bookings."
        action={<span className="inline-flex h-7 items-center rounded-full border border-border px-2.5"><LiveDot label={`${live} live`} /></span>} />
      <PanelBody>
        {s.campaigns.length === 0 ? <EmptyState title="No campaigns ran in this period" /> : (
          <div role="table" aria-labelledby="campaigns-h" className="divide-y divide-border">
            <div role="row" className={`grid gap-3 pb-2 ${CAMPAIGN_COLS}`}>
              <span role="columnheader" className={th}>Campaign</span>
              <span role="columnheader" className={`hidden text-right @lg:block ${th}`}>Shown</span>
              <span role="columnheader" className={`hidden text-right @lg:block ${th}`}>Visits</span>
              <span role="columnheader" className="hidden justify-end @lg:flex"><MetricLabel glossaryKey="ctr" className="text-[11px]" /></span>
              <span role="columnheader" className={`text-right ${th}`}>Bookings</span>
            </div>
            {s.campaigns.map((c) => <CampaignRow key={c.name} campaign={c} />)}
            <div role="row" aria-label="All campaigns" className={`grid items-center gap-3 pt-3 ${CAMPAIGN_COLS}`}>
              <span role="cell" className="text-sm font-semibold">All campaigns</span>
              <span role="cell" className="hidden text-right text-sm tabular-nums @lg:block">{count(s.total.shown)}</span>
              <span role="cell" className="hidden text-right text-sm tabular-nums @lg:block">{count(s.total.visits)}</span>
              <span role="cell" className="hidden text-right text-sm tabular-nums @lg:block">{oneIn(s.total.ctr)}</span>
              <span role="cell" className="text-right text-sm tabular-nums"><span className="font-semibold">{count(s.total.bookings)}</span> <span className="text-muted-foreground">· {money(s.total.valueCents)}</span></span>
            </div>
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}
```

```tsx
// src/components/dashboard/funnel-step.tsx
import type { FunnelStepDto } from "@/lib/db/queries/breakdowns";
import { glossary } from "@/lib/glossary";
import { count, money, oneIn } from "@/lib/format";

export const FUNNEL_COLS = "grid-cols-[minmax(0,1.4fr)_4.5rem_5rem_5.5rem]";

export function FunnelStep({ step: s }: { step: FunnelStepDto }) {
  const label = glossary[s.key].label;
  return (
    <div role="row" aria-label={label} className={`grid items-center gap-3 py-2.5 ${FUNNEL_COLS}`}>
      <span role="cell" className="text-sm">{label}</span>
      <span role="cell" className="text-right text-sm font-semibold tabular-nums">{count(s.people)}</span>
      <span role="cell" className="text-right text-sm tabular-nums text-muted-foreground">{s.onwardRatio === null ? "" : oneIn(s.onwardRatio)}</span>
      <span role="cell" className="text-right text-sm tabular-nums">{s.valueCents === null ? "—" : money(s.valueCents)}</span>
    </div>
  );
}
```

```tsx
// src/components/dashboard/funnel-section.tsx
import type { FunnelDto } from "@/lib/db/queries/breakdowns";
import { glossary } from "@/lib/glossary";
import { count, pct } from "@/lib/format";
import { CollapsibleSection } from "@/components/layout";
import { Meter } from "@/components/charts";
import { FunnelStep, FUNNEL_COLS } from "./funnel-step";

const th = "text-[11px] font-medium uppercase tracking-wide text-muted-foreground";

/** Collapsed by default; opened by insight links (#funnel) and shown in place from 2xl. */
export function FunnelSection({ funnel: f }: { funnel: FunnelDto }) {
  return (
    <CollapsibleSection id="funnel" title="Funnel and website engagement" description="From being seen to being booked." openAtWide>
      <div className="flex flex-col gap-4">
        <div role="table" aria-label="Funnel" className="divide-y divide-border">
          <div role="row" className={`grid gap-3 pb-2 ${FUNNEL_COLS}`}>
            <span role="columnheader" className={th}>Step</span>
            <span role="columnheader" className={`text-right ${th}`}>People</span>
            <span role="columnheader" className={`text-right ${th}`}>Went on</span>
            <span role="columnheader" className={`text-right ${th}`}>Value</span>
          </div>
          {f.steps.map((s) => <FunnelStep key={s.key} step={s} />)}
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <div className="flex gap-1.5"><dt>{glossary.new_visitors.label}</dt><dd className="font-semibold tabular-nums text-foreground">{count(f.newVisitors)}</dd></div>
          <div className="flex gap-1.5"><dt>{glossary.pages_per_session.label}</dt><dd className="font-semibold tabular-nums text-foreground">{f.pagesPerSession.toFixed(1)}</dd></div>
        </dl>
        <div className="flex flex-col gap-2">
          {f.devices.map((d) => (
            <div key={d.key} className="grid grid-cols-[5rem_minmax(0,1fr)_3rem] items-center gap-3 text-sm">
              <span>{glossary[d.key].label}</span>
              <Meter share={d.share} label={`${glossary[d.key].label} share of visits`} />
              <span className="text-right tabular-nums text-muted-foreground">{pct(d.share)}</span>
            </div>
          ))}
        </div>
      </div>
    </CollapsibleSection>
  );
}
```

Append to `src/components/dashboard/index.ts`:
```ts
export { MarketRow } from "./market-row";
export { FeederMarkets } from "./feeder-markets";
export { CampaignRow } from "./campaign-row";
export { CampaignSummary } from "./campaign-summary";
export { FunnelStep } from "./funnel-step";
export { FunnelSection } from "./funnel-section";
```

- [ ] **Step 4: Run green; negative control; gates**

Run: `npx vitest run tests/components/dashboard-sources.test.tsx` — Expected: 3 passed.
Negative control: in `campaign-summary.tsx` compute the total row from `s.campaigns` sums instead of `s.total`; the "All campaigns" assertion shows `6,400` still (the fixture sums match) — so instead change `oneIn(s.total.ctr)` to `pct(s.total.ctr)`; the `1 in 6` assertion goes red; restore. (Name the control honestly in the commit: it guards the "1 in N" copy rule, D4.)
Run: `npm run typecheck && npm run lint && npm test`.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard tests/components/dashboard-sources.test.tsx
git commit -m "Add feeder markets, campaign summary and the collapsible funnel

Columns appear by container width, never by a viewport hook; click-through
reads as 1 in N; totals come from the DTO's daily_metrics figures.
Negative control: rendering click-through as a percentage reddened the
1-in-N test (restored).
Gates: vitest <N> files passed; typecheck 0; lint 0.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---
### Task 10: Ask Autumn — the help-desk popover

**Files:**
- Create: `src/components/assistant/prompt-chip.tsx`, `assistant-popover.tsx`, `index.ts`
- Test: `tests/components/assistant.test.tsx`

**Interfaces:**
- Consumes: shadcn `Popover`, `PopoverTrigger`, `PopoverContent`; lucide `MessageCircle`, `ChevronDown`, `Sparkles`, `Send`, `ArrowRight`.
- Produces: `PromptChip({ text, onPick })` (a real `<button>`), `ComingSoonAction({ text })` (not a control: a dashed row), `AssistantPopover()` (client; fixed launcher bottom-right, popover anchored above it, page never dimmed).

This is a mock by decision (D30): questions fill the input, actions are labelled Coming soon and are not buttons, and sending shows a preview notice instead of pretending to answer.

- [ ] **Step 1: Failing tests**

```tsx
// @vitest-environment jsdom
// tests/components/assistant.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AssistantPopover } from "@/components/assistant";

describe("AssistantPopover", () => {
  it("opens from a launcher into a dialog anchored to it, without a backdrop", () => {
    const { baseElement } = render(<AssistantPopover />);
    fireEvent.click(screen.getByRole("button", { name: "Ask Autumn" }));
    expect(screen.getByRole("dialog", { name: "Ask Autumn" })).toBeInTheDocument();
    expect(baseElement.querySelector("[data-slot=popover-overlay]")).toBeNull();
  });
  it("offers example questions as buttons and unbuilt actions as Coming soon, not buttons", () => {
    render(<AssistantPopover />);
    fireEvent.click(screen.getByRole("button", { name: "Ask Autumn" }));
    fireEvent.click(screen.getByRole("button", { name: "Why did Chicago drop?" }));
    expect((screen.getByLabelText("Your question") as HTMLInputElement).value).toBe("Why did Chicago drop?");
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Pause/ })).toBeNull();
    expect(screen.getByText(/Pause .Finding new guests. for two weeks/)).toBeInTheDocument();
  });
  it("says plainly that replies are not wired up yet", () => {
    render(<AssistantPopover />);
    fireEvent.click(screen.getByRole("button", { name: "Ask Autumn" }));
    fireEvent.change(screen.getByLabelText("Your question"), { target: { value: "hello" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(screen.getByRole("status")).toHaveTextContent("Ask Autumn is a preview. Replies aren't connected yet.");
  });
});
```

- [ ] **Step 2: Run red**

Run: `npx vitest run tests/components/assistant.test.tsx` — Expected: FAIL, module missing.

- [ ] **Step 3: Implement**

```tsx
// src/components/assistant/prompt-chip.tsx
import { ArrowRight } from "lucide-react";

export function PromptChip({ text, onPick }: { text: string; onPick: (text: string) => void }) {
  return (
    <button type="button" onClick={() => onPick(text)} className="inline-flex h-8 items-center rounded-full border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-muted">
      {text}
    </button>
  );
}

/** An action that does not exist yet. Deliberately not a button: nothing should look pressable that does nothing. */
export function ComingSoonAction({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-(--r-in) border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
      <span>{text}</span>
      <ArrowRight className="size-3 shrink-0 text-muted-foreground/60" aria-hidden="true" />
    </div>
  );
}
```

```tsx
// src/components/assistant/assistant-popover.tsx
"use client";
import { useState } from "react";
import { MessageCircle, ChevronDown, Sparkles, Send, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PromptChip, ComingSoonAction } from "./prompt-chip";

const QUESTIONS = ["Why did Chicago drop?", "Compare to last September", "What drove Labor Day?", "Explain the fee"];
const ACTIONS = ["Pause “Finding new guests” for two weeks", "Email me a one-page summary every Monday", "Add Kalamazoo as a market to watch"];
const PREVIEW_NOTICE = "Ask Autumn is a preview. Replies aren't connected yet.";

/** Help-desk style: a launcher in the corner and a card anchored above it. The page behind stays fully visible (owner's call, 2026-09-17). */
export function AssistantPopover() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={open ? "Close Ask Autumn" : "Ask Autumn"} className="fixed right-(--page-gutter) bottom-6 z-40 inline-flex size-12 items-center justify-center rounded-full bg-foreground text-card shadow-lg shadow-foreground/20 hover:bg-foreground/90">
          {open ? <ChevronDown className="size-5" aria-hidden="true" /> : <MessageCircle className="size-5" aria-hidden="true" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" side="top" sideOffset={12} aria-label="Ask Autumn" className="flex w-[min(22.5rem,calc(100vw-2*var(--page-gutter)))] flex-col gap-0 rounded-(--radius-panel) p-0 shadow-xl shadow-foreground/10">
        <div className="flex items-center justify-between gap-3 border-b border-border p-(--panel-pad)">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex size-7 items-center justify-center rounded-(--r-in) bg-primary text-primary-foreground"><Sparkles className="size-4" aria-hidden="true" /></span>
            <div><p className="text-sm font-semibold">Ask Autumn</p><p className="text-xs text-muted-foreground">Usually replies in a minute</p></div>
          </div>
          <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="inline-flex size-7 items-center justify-center rounded-(--r-in) text-muted-foreground hover:bg-muted"><X className="size-4" aria-hidden="true" /></button>
        </div>
        <div className="flex flex-col gap-3 p-(--panel-pad)">
          <p className="max-w-64 rounded-(--r-in) rounded-tl-(--radius-min) bg-background px-3 py-2 text-sm leading-snug">Hi. Ask about any number on this page, or tell me what you&apos;d like changed.</p>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Try asking</p>
          <div className="flex flex-wrap gap-1.5">{QUESTIONS.map((q) => <PromptChip key={q} text={q} onPick={setDraft} />)}</div>
          <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Take action <span className="inline-flex h-5 items-center rounded-(--r-in) bg-muted px-1.5 text-[10px] font-semibold normal-case tracking-normal text-foreground">Coming soon</span></p>
          <div className="flex flex-col gap-1.5">{ACTIONS.map((a) => <ComingSoonAction key={a} text={a} />)}</div>
          {notice ? <p role="status" className="rounded-(--r-in) bg-muted px-3 py-2 text-xs text-muted-foreground">{notice}</p> : null}
        </div>
        <form className="flex items-center gap-1.5 border-t border-border p-3" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) setNotice(PREVIEW_NOTICE); }}>
          <label htmlFor="ask-autumn" className="sr-only">Your question</label>
          <input id="ask-autumn" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask about your numbers…" className="h-10 min-w-0 flex-1 rounded-(--r-in) border border-border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50" />
          <button type="submit" aria-label="Send" disabled={!draft.trim()} className="inline-flex size-10 shrink-0 items-center justify-center rounded-(--r-in) bg-foreground text-card disabled:opacity-40"><Send className="size-4" aria-hidden="true" /></button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
```
Radix `PopoverContent` carries `role="dialog"`; the `aria-label` makes it "Ask Autumn". If the generated `popover.tsx` wraps content with its own padding classes, keep `p-0` last so `cn` wins.

```ts
// src/components/assistant/index.ts
export { PromptChip, ComingSoonAction } from "./prompt-chip";
export { AssistantPopover } from "./assistant-popover";
```

- [ ] **Step 4: Run green; negative control; gates**

Run: `npx vitest run tests/components/assistant.test.tsx` — Expected: 3 passed.
Negative control: render `ComingSoonAction` as a `<button>`; the "not buttons" assertion goes red; restore.
Run: `npm run typecheck && npm run lint && npm test`.

- [ ] **Step 5: Commit**

```bash
git add src/components/assistant tests/components/assistant.test.tsx
git commit -m "Add the Ask Autumn help-desk popover as an honest preview

A corner launcher and a card anchored above it; the page is never dimmed.
Questions are buttons that fill the input; unbuilt actions are dashed rows
marked Coming soon; sending shows a preview notice. Negative control:
making an action a button reddened the not-a-control test (restored).
Gates: vitest <N> files passed; typecheck 0; lint 0.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: Shell, range control and the Overview page

**Files:**
- Modify: `src/lib/date-range.ts:17` (export the preset list)
- Create: `src/components/layout/range-segment.tsx`, `top-bar.tsx`, `app-shell.tsx` (+ exports in `layout/index.ts`)
- Replace: `src/app/page.tsx`; Create: `src/app/loading.tsx`, `src/app/error.tsx`, `src/app/not-found.tsx`
- Test: `tests/components/shell.test.tsx`

**Interfaces:**
- Consumes: everything above; `db` from `@/lib/db/client` (pages only); `parseRange`, `RangePreset`; `PROPERTY`.
- Produces: `RANGE_PRESETS: RangePreset[]` (date-range); `RangeSegment({ current, basePath, metric? })` (server; links with `aria-current`); `TopBar({ active, range, dataThrough, basePath, metric? })` (server; `range`/`dataThrough` null render same-height placeholders for `loading.tsx`); `AppShell({ ...TopBar props, children })`.

- [ ] **Step 1: Export the presets**

In `src/lib/date-range.ts` change line 17 to:
```ts
export const RANGE_PRESETS: RangePreset[] = ["30d", "90d", "ytd", "12m", "all"];
const PRESETS = RANGE_PRESETS;
```

- [ ] **Step 2: Failing shell tests**

```tsx
// @vitest-environment jsdom
// tests/components/shell.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RangeSegment, TopBar } from "@/components/layout";

describe("RangeSegment", () => {
  it("is five links that carry the range in the URL, with the current one marked", () => {
    render(<RangeSegment current="90d" basePath="/" metric="website_visits" />);
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/?range=30d&metric=website_visits", "/?range=90d&metric=website_visits", "/?range=ytd&metric=website_visits", "/?range=12m&metric=website_visits", "/?range=all&metric=website_visits"]);
    expect(screen.getByRole("link", { name: "90d" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "30d" }).getAttribute("aria-current")).toBeNull();
  });
});

describe("TopBar", () => {
  it("names the property, the two screens and the data date", () => {
    render(<TopBar active="overview" range="30d" dataThrough="2026-09-16" basePath="/" />);
    expect(screen.getByText("Harbor House Inn")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Overview" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Website traffic" }).getAttribute("href")).toBe("/website-traffic?range=30d");
    expect(screen.getByText("Data through Sep 16, 2026")).toBeInTheDocument();
  });
  it("renders same-height placeholders while loading so the header never jumps", () => {
    const { container } = render(<TopBar active="overview" range={null} dataThrough={null} basePath="/" />);
    expect(container.querySelector("header")?.className).toContain("min-h-14");
    expect(screen.queryByText(/Data through/)).toBeNull();
    expect(container.querySelectorAll("[data-slot=skeleton]").length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run red**

Run: `npx vitest run tests/components/shell.test.tsx` — Expected: FAIL, exports missing.

- [ ] **Step 4: Implement the shell**

```tsx
// src/components/layout/range-segment.tsx
import Link from "next/link";
import { RANGE_PRESETS, type RangePreset } from "@/lib/date-range";
import { cn } from "@/lib/utils";

const SHORT: Record<RangePreset, string> = { "30d": "30d", "90d": "90d", ytd: "YTD", "12m": "12m", all: "All" };

/** The range lives in the URL (D3), so this is plain links: server-rendered, shareable, no client state. */
export function RangeSegment({ current, basePath, metric }: { current: RangePreset; basePath: string; metric?: string }) {
  return (
    <nav aria-label="Date range" className="inline-flex rounded-full border border-border bg-card p-0.5">
      {RANGE_PRESETS.map((p) => (
        <Link key={p} href={`${basePath}?range=${p}${metric ? `&metric=${metric}` : ""}`} aria-current={p === current ? "page" : undefined}
          className={cn("inline-flex h-7 items-center rounded-full px-3 text-xs font-medium text-muted-foreground hover:text-foreground", p === current && "bg-foreground text-card hover:text-card")}>
          {SHORT[p]}
        </Link>
      ))}
    </nav>
  );
}
```

```tsx
// src/components/layout/top-bar.tsx
import Link from "next/link";
import type { RangePreset } from "@/lib/date-range";
import { longDate } from "@/lib/format";
import { PROPERTY } from "@/lib/property";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { RangeSegment } from "./range-segment";

export type Screen = "overview" | "website-traffic";
const SCREENS: { key: Screen; label: string; path: string }[] = [{ key: "overview", label: "Overview", path: "/" }, { key: "website-traffic", label: "Website traffic", path: "/website-traffic" }];

/** One slim bar: property, the two screens, the range. Fixed min height so loading and loaded states line up. */
export function TopBar({ active, range, dataThrough, basePath, metric }: { active: Screen; range: RangePreset | null; dataThrough: string | null; basePath: string; metric?: string }) {
  return (
    <header className="flex min-h-14 flex-wrap items-center gap-x-6 gap-y-2 border-b border-border bg-card px-(--page-gutter) py-2">
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true" className="size-6 rounded-(--r-in) bg-primary" />
        <span className="text-sm font-semibold">{PROPERTY.name}</span>
      </div>
      <nav aria-label="Screens" className="flex gap-1">
        {SCREENS.map((s) => (
          <Link key={s.key} href={range ? `${s.path}?range=${range}` : s.path} aria-current={s.key === active ? "page" : undefined}
            className={cn("inline-flex h-8 items-center rounded-(--r-in) px-3 text-sm font-medium text-muted-foreground hover:text-foreground", s.key === active && "bg-muted text-foreground")}>
            {s.label}
          </Link>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-4">
        {range ? <RangeSegment current={range} basePath={basePath} metric={metric} /> : <Skeleton className="h-8 w-56 rounded-full" />}
        {dataThrough ? <span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">Data through {longDate(dataThrough)}</span> : <Skeleton className="hidden h-4 w-36 rounded-(--r-in) sm:block" />}
      </div>
    </header>
  );
}
```

```tsx
// src/components/layout/app-shell.tsx
import type { RangePreset } from "@/lib/date-range";
import { PageShell } from "./page-shell";
import { TopBar, type Screen } from "./top-bar";

export function AppShell({ active, range, dataThrough, basePath, metric, children }: { active: Screen; range: RangePreset | null; dataThrough: string | null; basePath: string; metric?: string; children: React.ReactNode }) {
  return (
    <>
      <TopBar active={active} range={range} dataThrough={dataThrough} basePath={basePath} metric={metric} />
      <PageShell>{children}</PageShell>
    </>
  );
}
```
Add to `src/components/layout/index.ts`:
```ts
export { RangeSegment } from "./range-segment";
export { TopBar, type Screen } from "./top-bar";
export { AppShell } from "./app-shell";
```

- [ ] **Step 5: Run the shell tests green**

Run: `npx vitest run tests/components/shell.test.tsx` — Expected: 3 passed.

- [ ] **Step 6: Compose the page and its states**

```tsx
// src/app/page.tsx
import { Suspense } from "react";
import { db } from "@/lib/db/client";
import { parseRange, type DateRange } from "@/lib/date-range";
import { PROPERTY } from "@/lib/property";
import { computeInsights } from "@/lib/insights";
import { getDataBounds } from "@/lib/db/queries/meta";
import { getOverview, getQuickAnalytics, type OverviewDto } from "@/lib/db/queries/overview";
import { getTrend, isTrendMetric, type TrendMetric } from "@/lib/db/queries/trend";
import { getMarkets, getCampaigns, getFunnel } from "@/lib/db/queries/breakdowns";
import { AppShell, Grid, Stack, Panel, PanelHeader } from "@/components/layout";
import { Headline, QuickAnalytics, InsightList, GlossarySection, OverviewBodySkeleton, FeederMarkets, CampaignSummary, FunnelSection } from "@/components/dashboard";
import { TrendChart, StyleSegment, MetricSelect } from "@/components/charts";
import { AssistantPopover } from "@/components/assistant";

export const dynamic = "force-dynamic";

type Search = Promise<{ range?: string; metric?: string }>;

export default async function OverviewPage({ searchParams }: { searchParams: Search }) {
  const { range: rangeParam, metric: metricParam } = await searchParams;
  const bounds = await getDataBounds(db);
  const range = parseRange(rangeParam, bounds.min, bounds.max);
  const metric: TrendMetric = isTrendMetric(metricParam) ? metricParam : "booking_value";
  const [overview, quick] = await Promise.all([getOverview(db, range, PROPERTY.feeRateBps), getQuickAnalytics(db, range)]);
  return (
    <AppShell active="overview" range={range.preset} dataThrough={bounds.max} basePath="/" metric={metric === "booking_value" ? undefined : metric}>
      <Headline overview={overview} rangeTitle={range.label} />
      <QuickAnalytics data={quick} />
      <Suspense fallback={<OverviewBodySkeleton />}>
        <OverviewBody range={range} metric={metric} overview={overview} />
      </Suspense>
      <AssistantPopover />
    </AppShell>
  );
}

/** The slower half of the page, streamed behind one Suspense boundary; four queries in one round trip. */
async function OverviewBody({ range, metric, overview }: { range: DateRange; metric: TrendMetric; overview: OverviewDto }) {
  const [trend, markets, campaigns, funnel] = await Promise.all([getTrend(db, range, metric), getMarkets(db, range), getCampaigns(db, range), getFunnel(db, range)]);
  const insights = computeInsights({ overview, markets, campaigns });
  const prevLabel = range.comparison ? `Previous ${range.days} days` : null;
  const lastYearLabel = range.comparison ? "Same period last year" : null;
  return (
    <Stack>
      <Grid variant="sidebar">
        <Panel>
          <PanelHeader headingId="trend-h" title="Day by day" description="This period in colour, comparisons in grey."
            action={<div className="flex items-center gap-2"><MetricSelect metric={metric} range={range.preset} basePath="/" /><StyleSegment /></div>} />
          <TrendChart trend={trend} prevLabel={prevLabel} lastYearLabel={lastYearLabel} />
        </Panel>
        <InsightList insights={insights} />
      </Grid>
      <Grid variant="wide-three">
        <FeederMarkets markets={markets} />
        <CampaignSummary summary={campaigns} />
        <FunnelSection funnel={funnel} />
      </Grid>
      <GlossarySection keys={["direct_bookings", "booking_value", "autumn_fee", "net_revenue", "impressions", "clicks", "website_visits", "ctr", "conversion", "new_visitors", "pages_per_session"]} />
    </Stack>
  );
}
```
`FunnelSection` is the third column of the wide grid and opens in place at `2xl` (Task 8/9); below that it stacks under the two panels as a closed collapsible.

```tsx
// src/app/loading.tsx
import { AppShell } from "@/components/layout";
import { OverviewPageSkeleton } from "@/components/dashboard";

export default function Loading() {
  return (
    <AppShell active="overview" range={null} dataThrough={null} basePath="/">
      <OverviewPageSkeleton />
    </AppShell>
  );
}
```

```tsx
// src/app/error.tsx
"use client";
import { Panel, PanelHeader, PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PageShell className="items-center justify-center">
      <Panel className="w-full max-w-md items-start">
        <PanelHeader title="We couldn't load your numbers." description="Nothing is wrong with your data. Try again in a moment." />
        <Button variant="outline" onClick={reset}>Try again</Button>
      </Panel>
    </PageShell>
  );
}
```

```tsx
// src/app/not-found.tsx
import Link from "next/link";
import { Panel, PanelHeader, PageShell } from "@/components/layout";

export default function NotFound() {
  return (
    <PageShell className="items-center justify-center">
      <Panel className="w-full max-w-md items-start">
        <PanelHeader title="That page isn't here." description="The dashboard has two screens: the Overview and Website traffic." />
        <Link href="/" className="text-sm font-medium text-primary underline-offset-4 hover:underline">Back to the Overview</Link>
      </Panel>
    </PageShell>
  );
}
```

- [ ] **Step 7: Gates: typecheck, lint, test, build**

Run: `npm run typecheck && npm run lint && npm test` — Expected: all green; `tests/architecture.test.ts` passes on the real page (barrel imports only).
Run: `npm run build` — Expected: exit 0; `/` listed as dynamic (ƒ); no "dynamic usage" warnings beyond the intended `searchParams`. `/website-traffic` is not part of this plan; `not-found` covers it until that screen's plan lands (D31).

- [ ] **Step 8: Live render and the value gate (needs `DATABASE_URL`; stop and say so if absent)**

1. Start the dev server through the preview tool (`start-preview` / `preview_start {name: "dev"}`), open `/`.
2. `read_console_messages` — Expected: no errors, no hydration warnings.
3. Compute the truth for the default window from the database, independently of the page:
```bash
npx tsx -e 'import "dotenv/config"; import { db } from "./src/lib/db/client"; import { getDataBounds } from "./src/lib/db/queries/meta"; import { parseRange } from "./src/lib/date-range"; import { periodTotals } from "./src/lib/db/queries/overview"; const b = await getDataBounds(db); const r = parseRange(undefined, b.min, b.max); const t = await periodTotals(db, r.from, r.to); console.log(r.from, r.to, t.bookings, t.valueCents, Math.round(t.valueCents * 0.15)); process.exit(0)'
```
   `read_page` the headline and check bookings, value and net (`value − fee`) equal the printed numbers.
4. Screenshots at three widths with `resize_window` (`mobile` preset = 390; `width: 1280, height: 900`; `width: 1728, height: 1100`), then reset to `desktop`. At 1728 the funnel must be open in place; at 390 the quick analytics must be 2×2 and the Visits/Shown columns hidden.
5. Send the three screenshots to the owner with `SendUserFile` (never describe them instead), and paste the value-gate line into the commit body.
6. Layout-shift check: in the browser pane run `new PerformanceObserver((l) => console.log(l.getEntries().map((e) => e.value))).observe({ type: "layout-shift", buffered: true })` via `javascript_tool`, reload, read the console; every entry must be `< 0.1` (Lighthouse "good" is a CLS under 0.1). Record the largest value in the commit.

- [ ] **Step 9: Commit**

```bash
git add src/lib/date-range.ts src/components/layout src/app/page.tsx src/app/loading.tsx src/app/error.tsx src/app/not-found.tsx tests/components/shell.test.tsx
git commit -m "Compose the Overview: headline, quick analytics, trend, insights, markets, campaigns, funnel

The page awaits searchParams, anchors the range on MAX(date), fetches the
headline in the first flush and the rest behind one Suspense boundary.
Range and metric live in the URL; the top bar is plain links. loading.tsx
renders the same boxes so nothing moves when data arrives.
Value gate: default window <from>..<to> → <bookings> bookings, $<value>, net $<net>; the page shows the same.
Layout shift on reload: max <x> (< 0.1). Screenshots at 390/1280/1728 sent to the owner.
Gates: vitest <N> files passed; typecheck 0; lint 0; next build exit 0 (/ dynamic).

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12: Decision rows, spec correction, standing rules

**Files:**
- Modify: `docs/decisions.md` (five rows under Product/Engineering; nothing deleted), `docs/superpowers/specs/2026-09-17-autumn-dashboard-design.md` (§3 correction block, dated), `CLAUDE.md` (§5 and §12, dated lines), `docs/superpowers/plans/2026-09-17-autumn-dashboard.md` (one dated note at the top of Tasks 8–10)

- [ ] **Step 1: Decision rows**

Append to the Product table in `docs/decisions.md`:
```
| D29 | Overview composition follows the 2026-09-17 artboard: one headline sentence, one Quick analytics strip (four cells in one panel), Trend + Insights, Feeder markets + Campaigns, a collapsible Funnel (open in place from 2xl), a collapsible glossary. | Spec §3's three supporting tiles and a Sources preview; the reference product's four header cards and six-card bento. | The header spent 200 px on four equal numbers before the answer; the owner's reading order is the six questions, so the page is two rows that follow them. Feeder markets and campaigns earn a full panel on the Overview because they answer "are the right guests finding me" one level deeper than a preview. | `tests/components/dashboard.test.tsx` (one-sentence headline, four-stat strip, explicit insight empty state); `tests/components/dashboard-sources.test.tsx` (markets, campaigns, funnel collapsible with `2xl:block`); screenshots at 390/1280/1728 reviewed by the owner (Task 11). | verified 2026-09-17 |
| D31 | The second screen is `/website-traffic` ("Where your visitors come from"), with its organisms under `src/components/website-traffic/`; the Overview keeps the feeder-market and campaign panels. | `/bookings` (D2). | Owner's ruling, 2026-09-17: the reference product's second tab is Website Traffic and the owner created the `website-traffic` component folder for it; markets and campaigns already answer the bookings question on the Overview, so the second screen explains the funnel. D2 stays in the log as superseded. | `tests/components/shell.test.tsx` (nav link to `/website-traffic`); the screen's own plan, to be written. | proposed |
| D30 | Ask Autumn is a help-desk popover anchored to a corner launcher, page never dimmed; questions fill the input, unbuilt actions are dashed rows marked Coming soon, sending shows a preview notice. | A right-hand sheet with a backdrop; or no assistant. | The owner uses it the way they use a help widget, so a modal treatment is heavier than the job. Showing where the product goes without pretending it is built keeps the trust the brief asks for. | `tests/components/assistant.test.tsx` (dialog anchored, no overlay; actions are not buttons; the preview notice). | verified 2026-09-17 |
```
Append to the Engineering table:
```
| D26 | Chart tokens re-stepped: `--chart-1 #3f6b55` (this period), `--chart-2 #a9a8a2` (previous), `--chart-3 #cfcdc6` (last year), `--chart-4 #a0661e` (second series, campaigns only). Every chart is the emphasis form: one coloured series, comparisons in grey. | The brand's five-step sage/slate/sand categorical set from the site. | The dataviz validator (2026-09-17) fails the brand set on lightness, chroma and normal-vision separation (sage↔slate ΔE 7–11, floor 15); no re-step of sage passes next to slate. Emphasis needs no categorical palette; the one two-series case uses sage and ochre with labels. | `tests/architecture.test.ts` (`--chart-1: #3f6b55` present); `tests/components/charts.test.tsx` (legend names every series). Validator output kept in the Task 1 commit body. | verified 2026-09-17 |
| D27 | Layout rhythm is tokens: `--page-gutter`, `--stack-gap`, `--panel-pad`, `--plot-height` change per breakpoint in `globals.css`; parents set `gap`, children never set outer margins; layout adapts by CSS (Tailwind breakpoints and container queries), never a viewport hook. | Per-component paddings and a `useIsMobile` hook. | A hook renders the wrong layout on the server and flashes on hydration; per-component paddings drift. One token set means one place to tune and no shift. | `tests/architecture.test.ts` (no `useIsMobile`/`matchMedia`/`innerWidth` in `src`; no outer margin in components; tokens present); `tests/components/layout.test.tsx` (atoms reference the tokens); CLS measured < 0.1 in Task 11. | verified 2026-09-17 |
| D28 | Concentric corners: `--radius-panel` for outer cards and popovers, `--r-in = --radius-panel − --panel-pad` for anything inset directly inside one, `--radius-min` clamp, `--radius-float` for tooltips; pills exempt. Components never use `rounded-md|lg|xl` literals. | shadcn's default `rounded-xl` on every card and `rounded-lg` on every inner box. | Apple's ConcentricRectangle practice: an inner radius that ignores its inset reads as a sticker, one that subtracts it reads as carved from the same shape. Owner's rule, 2026-09-17. | `tests/architecture.test.ts` (no radius literals under components; tokens present); `tests/components/layout.test.tsx` (Panel and EmptyState classes). | verified 2026-09-17 |
```

Then edit row D2's Status cell to read: `superseded by D31 (2026-09-17): the second screen is Website traffic; the Overview keeps markets and campaigns`.

- [ ] **Step 2: Spec correction, in place and dated**

Insert at the top of spec §3 (after the heading "## 3. Screen 1 — `/` Overview"):
```
> **Corrected 2026-09-17 (owner's redesign, D26–D30; artboard https://claude.ai/artifact/9GkFW1kMUzeWPS3Njcqg9x).** Items 3 and 6 below are superseded: the three supporting tiles become one Quick analytics strip (direct bookings, booking value, website visits from ads, people reached, each with a sparkline and a delta), and the Sources preview becomes two full panels, Feeder markets and Campaigns, followed by a collapsible Funnel and engagement section that opens in place on wide screens. The trend chart gains a viewer-chosen style (area, bars, line) kept in the browser. A help-desk popover, Ask Autumn, sits in the corner as an honest preview. The plan is `docs/superpowers/plans/2026-09-17-overview-component-library.md`. The original text stays below for the record.
```

- [ ] **Step 3: CLAUDE.md standing rules (append, dated, in the owning section)**

In §5 under "### Delegation", append a paragraph:
```
**2026-09-17 — model routing (owner's ruling).** The coordinator that plans, briefs, reviews and merges is Fable 5.1. Every builder or reviewer subagent is dispatched with `model: "opus"` (Opus 5), stated on the call. This replaces the "reserve the strongest model for…" guidance above for this project.
```
In §12 append:
```
- **2026-09-17 — Second screen (D31, supersedes D2).** `/website-traffic`, organisms under `src/components/website-traffic/`. The Overview keeps feeder markets and campaigns. Owner's ruling.
- **2026-09-17 — Overview composition and layout system (D26–D30).** Chart tokens re-stepped to the emphasis form (`--chart-1 #3f6b55`, greys for comparisons). Layout rhythm is tokens (`--page-gutter`, `--stack-gap`, `--panel-pad`, `--plot-height`); responsive by CSS only, never a viewport hook. Corners are concentric (`--radius-panel`, `--r-in`, `--radius-min`, `--radius-float`); no `rounded-lg` literals under `src/components`. The Overview is: headline sentence → Quick analytics strip → Trend + Insights → Feeder markets + Campaigns (+ Funnel in place from 2xl) → glossary. Ask Autumn is a corner popover preview. All gated by `tests/architecture.test.ts`.
```

- [ ] **Step 4: Point the old plan at this one**

At the top of `### Task 8` in `docs/superpowers/plans/2026-09-17-autumn-dashboard.md` insert:
```
> **2026-09-17:** Tasks 8–10 are superseded by `docs/superpowers/plans/2026-09-17-overview-component-library.md` (owner's redesign, D26–D31). Tasks 11–12 (Bookings) are dropped: the second screen is Website traffic (D31) and gets its own plan against the same component library.
```

- [ ] **Step 5: Gates and commit**

Run: `npm run typecheck && npm run lint && npm test` (docs only, but the run is the proof nothing else moved).
```bash
git add docs/decisions.md docs/superpowers/specs/2026-09-17-autumn-dashboard-design.md CLAUDE.md docs/superpowers/plans/2026-09-17-autumn-dashboard.md
git commit -m "Record the Overview redesign decisions and the layout system rules

D26 chart tokens, D27 layout rhythm and CSS-only responsiveness, D28
concentric corners, D29 Overview composition, D30 Ask Autumn popover, D31
Website traffic as the second screen (D2 superseded), each
with the test that goes red if it is silently reversed. Spec §3 corrected
in place; CLAUDE.md §5 gains the model-routing ruling and §12 the rulings.
Gates: vitest <N> files passed; typecheck 0; lint 0.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Self-review against the spec and the artboard

- **Spec §3 coverage:** header (Task 11 TopBar), headline (Task 8), supporting tiles → Quick analytics (Tasks 3, 8; D29), trend with two comparisons and a metric selector (Tasks 4, 7), insights with Win / Watch / Autumn is on it and anchor links (Tasks 5, 8), sources → Feeder markets + Campaigns (Tasks 4, 9), glossary accordion (Task 8). The "Autumn started" marker is dropped: the whole window is under Autumn (D21).
- **Spec §6 states:** missing `DATABASE_URL` throws in `client.ts` (unchanged) and `error.tsx` renders a calm card (Task 11); empty insights show an explicit sentence (Task 8); empty markets and campaigns show an `EmptyState` (Task 9); an empty database throws a readable error in `getDataBounds` (Task 3).
- **Spec §7 tests:** pure logic (Tasks 2, 5), PGlite queries with hand-computed fixtures (Tasks 3, 4), component render tests (Tasks 1, 6–11), architecture grep gates (Task 1), screenshots and the live value gate (Task 11).
- **Artboard boards → tasks:** Atoms (Tasks 1, 6, 7), Molecules (Tasks 6–9), Organisms (Tasks 8, 9), Overview 1280/390/1728 (Task 11), Ask Autumn popover (Task 10), Architecture (folder tree = File Structure above, with the artboard's `bookings/` folder renamed to the owner's `dashboard/` + `website-traffic/` split; DTO contract = Tasks 3–5 interfaces).
- **Owner's rules of 2026-09-17:** CSS-only responsiveness (Global Constraints, D27, architecture gate), concentric corners (D28, tokens in Task 1, gate), model routing (header, CLAUDE.md §5), no layout shift (skeletons in Task 8, `min-h-14` top bar in Task 11, CLS measured in Task 11).
- **Placeholders:** `<N>` in commit templates stands for the number the run prints (CLAUDE.md §6: counts are re-measured, never copied); everything else is literal.
- **Type consistency checked:** `count` is exported from `format.ts` (Task 2) and used by `Value`, `MarketRow`, `CampaignRow`, `FunnelStep`, `insights.ts`; `MarketDto.previousVisits` (Task 4) is what `topMarketVisitsFell` reads (Task 5); `CollapsibleSection`'s `openAtWide` (Task 8) is what `FunnelSection` passes (Task 9); `RANGE_PRESETS` (Task 11) is the only new export from `date-range.ts`.
