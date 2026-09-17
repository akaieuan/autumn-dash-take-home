# Autumn Marketing Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship two connected, database-backed Next.js screens (Overview at `/`, Bookings detail at `/bookings`) for an independent-hotel owner, with a deterministic 730-day seed in hosted Postgres, deployed to one live URL, inside the 24-hour window ending 2026-09-18 10:16.

**Architecture:** Server Components fetch through a typed query layer (`src/lib/db/queries`) that returns DTOs; a separate component library (`src/components/*`, barrel per folder) renders those DTOs and never fetches; `src/app` only composes. Data lives in Neon Postgres via Drizzle; the seed script is the only writer and is deterministic. Date range lives in the URL and is anchored to the last seeded day.

**Tech Stack:** Next.js 16.3 (App Router, Turbopack), React 19.3, TypeScript, Tailwind 4.3, shadcn CLI 4 (radix, new-york), Recharts 3 via shadcn `chart`, Drizzle ORM 0.45 + drizzle-kit 0.31, `@neondatabase/serverless`, Neon Postgres, Vitest 5 + `@electric-sql/pglite` + Testing Library, `tsx`, Vercel.

**Spec:** `docs/superpowers/specs/2026-09-17-autumn-dashboard-design.md` — the plan argues from it; executors read both.

> **Status 2026-09-17.** Task 1 done (commit 048b787). Tasks 3–5 were executed
> against the owner's two-table schema (decisions D21–D25), not the eight-table
> design written below; see `src/lib/db/schema.ts`, `scripts/seed/*`, and
> `tests/seed-*.test.ts` for what is live. Tasks 6–7 (queries) and 9–12
> (components, pages) must be re-planned from the two-table model before
> execution; their DTO names still hold where the underlying data exists.
> Task 2's `date-range.ts` is done; `format.ts` and `glossary.ts` are not.

## Global Constraints

- Node 24, npm. Pin every dependency to the version `npm install` resolves; no `latest` in `package.json`.
- Pages compose, components render, queries fetch. No `@/lib/db` import outside `src/lib/db` and `src/app`. No SQL outside `src/lib/db/queries`. No `Intl`/formatting outside `src/lib/format.ts` and chart axis formatters.
- Money is integer cents in the database and in every DTO; formatted only at render.
- "Today" = `MAX(date)` from the database; never `new Date()` in a query or a page.
- Copy: every metric shown has a `glossary.ts` entry; industry acronyms (CTR, CVR, OTA, ADR) appear at most once per screen, in parentheses after the plain phrase.
- Theme: light only; tokens from the spec §5 Theme; no hex in components.
- Seed window `2024-09-17..2026-09-16` (730 days), Autumn start `2025-02-03`, fee `1500` bps, PRNG seed `20260917`.
- Every task ends green on `npm run typecheck && npm run lint && npm test`; tasks that touch the database also run `npm run db:seed && npm run db:verify`.
- Commits: title says what was missing; body lists gates run; end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Human gates (CLAUDE.md §4): Neon account and `DATABASE_URL`, Vercel account and production deploy, the email to Autumn. Tasks that hit one stop and report.

## File Structure (locked)

```
CLAUDE.md, README.md, .env.example, .gitignore
package.json, tsconfig.json, next.config.ts, eslint.config.mjs, postcss.config.mjs
components.json, drizzle.config.ts, vitest.config.ts
src/app/{layout,page,loading,error,not-found}.tsx   src/app/globals.css
src/app/bookings/{page,loading}.tsx
src/components/ui/*                      (shadcn CLI-owned)
src/components/layout/{app-shell,top-nav,date-range-control,page-header,section,index}.tsx
src/components/copy/{metric-label,delta-text,index}.tsx
src/components/charts/{config,chart-frame,formatters,index}.ts(x)
src/components/dashboard/{headline-card,stat-tile,trend-chart,insight-list,source-preview,glossary,index}.tsx
src/components/bookings/{context-strip,source-mix-chart,campaign-table,feeder-market-list,guest-behaviour,recent-bookings,index}.tsx
src/lib/{date-range,format,glossary}.ts
src/lib/db/{client,schema}.ts   src/lib/db/queries/{meta,overview,bookings}.ts
scripts/seed/{index,rng,profile,generate-campaigns,generate-traffic,generate-bookings,generate-insights}.ts
scripts/db-verify.ts
drizzle/*.sql (generated)
tests/{date-range,format,glossary,seed-profile,seed-generators}.test.ts
tests/queries/{setup,overview,bookings}.test.ts
tests/components/{headline-card,stat-tile,insight-list,campaign-table}.test.tsx
docs/screenshots/{reference-overview,reference-website-traffic,new-overview,new-bookings}.png
```

---

### Task 1: Scaffold the app, theme tokens, test runner, scripts

**Files:**
- Create: everything `create-next-app` and `shadcn init` emit, then edit `src/app/globals.css`, `src/app/layout.tsx`, `package.json`, `vitest.config.ts`, `tests/smoke.test.ts`, `.env.example`
- Modify: `.gitignore` (already present; keep)

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `db:generate`, `db:migrate`, `db:seed`, `db:verify`; the `cn()` util at `@/lib/utils`; brand CSS variables listed below.

- [ ] **Step 1: Scaffold in the scratchpad and copy in** (the repo root holds files create-next-app refuses)

```bash
S=/private/tmp/claude-501/-Users-ieuanking-Documents-workspaces-autumn-dash-take-home/47e48df2-ed4b-4340-9a38-fbb19d1b35f6/scratchpad
npx --yes create-next-app@latest "$S/scaffold" --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
rsync -a --exclude .git --exclude .gitignore --exclude README.md --exclude node_modules "$S/scaffold/" /Users/ieuanking/Documents/workspaces/autumn-dash-take-home/
cd /Users/ieuanking/Documents/workspaces/autumn-dash-take-home && npm install
```
If a flag is rejected by this create-next-app version, drop it; the interactive defaults are the same choices. Verify: `cat package.json | grep '"next"'` prints `16.x`.

- [ ] **Step 2: shadcn init (non-interactive) and add primitives**

```bash
npx shadcn@latest init -d --base radix
npx shadcn@latest add button card tooltip tabs table badge skeleton separator accordion select sheet chart
```
Expected: `components.json` exists; `src/components/ui/*.tsx` populated; `recharts` in dependencies.

- [ ] **Step 3: Fonts and theme tokens.** Replace the top of `src/app/globals.css` so the `@theme inline` block uses literal font names (shadcn init breaks Geist otherwise — see `vercel:shadcn` gotcha) and the brand variables:

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

:root {
  --background: #f2f2f0;
  --foreground: #1c1b19;
  --card: #fbfbfa;
  --card-foreground: #1c1b19;
  --popover: #ffffff;
  --popover-foreground: #1c1b19;
  --primary: #6f8b7a;              /* sage — Autumn / direct */
  --primary-foreground: #fbfbfa;
  --secondary: #ede8df;            /* warm panel */
  --secondary-foreground: #1c1b19;
  --muted: #ede8df;
  --muted-foreground: #5c5b57;
  --accent: #ede0c8;               /* notecard sand — OTA */
  --accent-foreground: #1c1b19;
  --destructive: #b5563f;
  --border: rgba(28, 27, 25, 0.10);
  --input: rgba(28, 27, 25, 0.14);
  --ring: #6f8b7a;
  --chart-1: #6f8b7a;              /* direct via Autumn */
  --chart-2: #a9bfb2;              /* direct — other */
  --chart-3: #d9c7a3;              /* OTA */
  --chart-4: #6f7e92;              /* slate — comparison line */
  --chart-5: #95938c;              /* stone — last year */
  --positive: #6f8b7a;
  --watch: #c48a3a;
  --negative: #b5563f;
  --radius: 0.75rem;
}

@theme inline {
  --font-sans: "Geist", "Geist Fallback", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "Geist Mono", "Geist Mono Fallback", ui-monospace, monospace;
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-positive: var(--positive);
  --color-watch: var(--watch);
  --color-negative: var(--negative);
  --radius-sm: calc(var(--radius) * 0.75);
  --radius-md: calc(var(--radius) * 0.875);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.5);
}

@layer base {
  * { @apply border-border outline-ring/50; }
  body { @apply bg-background text-foreground antialiased; }
}
```
Delete any `.dark { ... }` block shadcn added (light only, spec D7).

- [ ] **Step 4: Root layout with Geist and TooltipProvider**

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Harbor House Inn · Autumn",
  description: "Is Autumn helping your hotel get more direct bookings and revenue?",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-dvh font-sans">
        <TooltipProvider delayDuration={150}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Test runner and scripts**

```bash
npm install -D vitest@5 @vitejs/plugin-react vite-tsconfig-paths jsdom @testing-library/react @testing-library/jest-dom @testing-library/dom tsx
```

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    environment: "node",
    setupFiles: ["tests/setup.ts"],
  },
});
```

```ts
// tests/setup.ts
import "@testing-library/jest-dom/vitest";
```

```ts
// tests/smoke.test.ts
import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("scaffold", () => {
  it("resolves the @ alias and cn merges classes", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
```

Add to `package.json` `scripts`:

```json
"typecheck": "tsc --noEmit",
"test": "vitest run",
"test:watch": "vitest",
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:seed": "tsx scripts/seed/index.ts",
"db:verify": "tsx scripts/db-verify.ts"
```

```bash
# .env.example
DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require"
```

- [ ] **Step 6: Run the gates**

Run: `npm run typecheck && npm run lint && npm test && npm run build`
Expected: typecheck silent; lint clean; `Test Files  1 passed`; build lists `/`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Scaffold Next.js 16 app with brand theme tokens and Vitest

Gates: typecheck 0, lint 0, vitest 1 file passed, next build ok.
Did not add any domain code; theme tokens copied from spec §5.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Pure logic — `date-range.ts`, `format.ts`, `glossary.ts`

**Files:**
- Create: `src/lib/date-range.ts`, `src/lib/format.ts`, `src/lib/glossary.ts`
- Test: `tests/date-range.test.ts`, `tests/format.test.ts`, `tests/glossary.test.ts`

**Interfaces:**
- Produces:
  - `type RangePreset = "30d" | "90d" | "ytd" | "12m" | "all"`; `type Granularity = "day" | "week" | "month"`
  - `interface DateRange { preset: RangePreset; from: string; to: string; days: number; granularity: Granularity; label: string; comparison: { prevFrom: string; prevTo: string; prevLabel: string; lastYearFrom: string; lastYearTo: string; lastYearLabel: string } | null }`
  - `parseRange(param: string | undefined, dataMin: string, dataMax: string): DateRange`
  - `addDays(iso: string, n: number): string`, `addYears(iso, n)`, `daysBetween(a, b)` (inclusive count)
  - `money(cents: number): string`, `moneyCompact(cents)`, `pct(fraction: number, digits?: number)`, `compact(n: number)`, `delta(current: number, previous: number | null): { pct: number | null; direction: "up" | "down" | "flat" }`, `deltaText(current, previous, vsLabel): string | null`, `oneIn(rate: number): string`, `longDate(iso)`, `shortDate(iso)`, `bucketLabel(iso, g: Granularity)`
  - `glossary: Record<GlossaryKey, GlossaryEntry>`; `type GlossaryKey`; `interface GlossaryEntry { label: string; industryTerm?: string; meaning: string; purpose?: string }`; `campaignLabel(category)`, `sourceLabel(source)`

- [ ] **Step 1: Failing tests for date-range**

```ts
// tests/date-range.test.ts
import { describe, it, expect } from "vitest";
import { parseRange, addDays, daysBetween } from "@/lib/date-range";

const MIN = "2024-09-17";
const MAX = "2026-09-16";

describe("addDays / daysBetween", () => {
  it("crosses month and year boundaries in UTC", () => {
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(daysBetween("2026-08-18", "2026-09-16")).toBe(30);
  });
});

describe("parseRange", () => {
  it("defaults to 30d anchored on dataMax with two comparisons", () => {
    const r = parseRange(undefined, MIN, MAX);
    expect(r.preset).toBe("30d");
    expect(r.to).toBe(MAX);
    expect(r.from).toBe("2026-08-18");
    expect(r.days).toBe(30);
    expect(r.granularity).toBe("day");
    expect(r.comparison?.prevTo).toBe("2026-08-17");
    expect(r.comparison?.prevFrom).toBe("2026-07-19");
    expect(r.comparison?.lastYearFrom).toBe("2025-08-18");
    expect(r.comparison?.lastYearTo).toBe("2025-09-16");
  });
  it("ytd starts on 1 Jan of dataMax year and uses weeks", () => {
    const r = parseRange("ytd", MIN, MAX);
    expect(r.from).toBe("2026-01-01");
    expect(r.days).toBe(259);
    expect(r.granularity).toBe("week");
  });
  it("12m is 365 days of weeks; all is the full window in months with no comparison", () => {
    expect(parseRange("12m", MIN, MAX).granularity).toBe("week");
    const all = parseRange("all", MIN, MAX);
    expect(all.from).toBe(MIN);
    expect(all.granularity).toBe("month");
    expect(all.comparison).toBeNull();
  });
  it("falls back to 30d on garbage", () => {
    expect(parseRange("evil", MIN, MAX).preset).toBe("30d");
  });
  it("clamps from to dataMin when the window is short", () => {
    expect(parseRange("12m", "2026-06-01", MAX).from).toBe("2026-06-01");
  });
});
```

- [ ] **Step 2: Run to confirm red**

Run: `npx vitest run tests/date-range.test.ts`
Expected: FAIL — cannot resolve `@/lib/date-range`.

- [ ] **Step 3: Implement date-range**

```ts
// src/lib/date-range.ts
export type RangePreset = "30d" | "90d" | "ytd" | "12m" | "all";
export type Granularity = "day" | "week" | "month";

export interface DateRange {
  preset: RangePreset;
  from: string;
  to: string;
  days: number;
  granularity: Granularity;
  label: string;
  comparison: {
    prevFrom: string; prevTo: string; prevLabel: string;
    lastYearFrom: string; lastYearTo: string; lastYearLabel: string;
  } | null;
}

const PRESETS: RangePreset[] = ["30d", "90d", "ytd", "12m", "all"];
const LABELS: Record<RangePreset, string> = {
  "30d": "Last 30 days", "90d": "Last 90 days", ytd: "Year to date", "12m": "Last 12 months", all: "Since the beginning",
};

const toUTC = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
const fromUTC = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export const addDays = (iso: string, n: number) => fromUTC(toUTC(iso) + n * 86_400_000);
export const addYears = (iso: string, n: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  return fromUTC(Date.UTC(y + n, m - 1, d));
};
export const daysBetween = (a: string, b: string) => Math.round((toUTC(b) - toUTC(a)) / 86_400_000) + 1;

export function granularityFor(days: number): Granularity {
  if (days <= 92) return "day";
  if (days <= 400) return "week";
  return "month";
}

export function parseRange(param: string | undefined, dataMin: string, dataMax: string): DateRange {
  const preset: RangePreset = PRESETS.includes(param as RangePreset) ? (param as RangePreset) : "30d";
  const to = dataMax;
  let from: string;
  switch (preset) {
    case "30d": from = addDays(to, -29); break;
    case "90d": from = addDays(to, -89); break;
    case "ytd": from = `${to.slice(0, 4)}-01-01`; break;
    case "12m": from = addDays(to, -364); break;
    case "all": from = dataMin; break;
  }
  if (from < dataMin) from = dataMin;
  const days = daysBetween(from, to);
  const comparison = preset === "all" ? null : {
    prevTo: addDays(from, -1),
    prevFrom: addDays(from, -days),
    prevLabel: preset === "ytd" ? "the same period last year" : `the previous ${days} days`,
    lastYearFrom: addYears(from, -1),
    lastYearTo: addYears(to, -1),
    lastYearLabel: "this time last year",
  };
  return { preset, from, to, days, granularity: granularityFor(days), label: LABELS[preset], comparison };
}
```
Note for `ytd`: the "previous period" of a year-to-date is the same span a year earlier, which coincides with last-year; the page shows one comparison in that case (Task 10 handles it by comparing `prevFrom === lastYearFrom`).

- [ ] **Step 4: Run green**

Run: `npx vitest run tests/date-range.test.ts` — Expected: 6 passed.

- [ ] **Step 5: Failing tests for format**

```ts
// tests/format.test.ts
import { describe, it, expect } from "vitest";
import { money, moneyCompact, pct, compact, delta, deltaText, oneIn, bucketLabel } from "@/lib/format";

describe("format", () => {
  it("money renders whole dollars from cents", () => {
    expect(money(1868500)).toBe("$18,685");
    expect(money(0)).toBe("$0");
    expect(money(-125000)).toBe("-$1,250");
  });
  it("moneyCompact and compact abbreviate", () => {
    expect(moneyCompact(1868500)).toBe("$18.7k");
    expect(moneyCompact(125000000)).toBe("$1.25M");
    expect(compact(12400)).toBe("12.4k");
    expect(compact(950)).toBe("950");
  });
  it("pct rounds fractions", () => {
    expect(pct(0.4821)).toBe("48%");
    expect(pct(0.4821, 1)).toBe("48.2%");
  });
  it("delta handles zero and null previous", () => {
    expect(delta(118, 100)).toEqual({ pct: 18, direction: "up" });
    expect(delta(90, 100)).toEqual({ pct: -10, direction: "down" });
    expect(delta(100, 100)).toEqual({ pct: 0, direction: "flat" });
    expect(delta(5, 0)).toEqual({ pct: null, direction: "up" });
    expect(delta(5, null)).toEqual({ pct: null, direction: "flat" });
  });
  it("deltaText is a plain sentence fragment", () => {
    expect(deltaText(118, 100, "the previous 30 days")).toBe("+18% vs the previous 30 days");
    expect(deltaText(100, 100, "last year")).toBe("No change vs last year");
    expect(deltaText(5, 0, "last year")).toBeNull();
  });
  it("oneIn and bucketLabel read naturally", () => {
    expect(oneIn(0.083)).toBe("1 in 12");
    expect(bucketLabel("2026-09-01", "month")).toBe("Sep 2026");
    expect(bucketLabel("2026-09-01", "day")).toBe("1 Sep");
    expect(bucketLabel("2026-08-31", "week")).toBe("w/c 31 Aug");
  });
});
```

- [ ] **Step 6: Run red, then implement format**

```ts
// src/lib/format.ts
import type { Granularity } from "./date-range";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export const money = (cents: number) => usd.format(Math.round(cents / 100));

export function compact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${trim(n / 1_000_000, 2)}M`;
  if (abs >= 1_000) return `${trim(n / 1_000, 1)}k`;
  return String(Math.round(n));
}
const trim = (v: number, d: number) => String(Number(v.toFixed(d)));

export const moneyCompact = (cents: number) => `${cents < 0 ? "-" : ""}$${compact(Math.abs(cents) / 100)}`;

export const pct = (fraction: number, digits = 0) => `${(fraction * 100).toFixed(digits)}%`;

export function delta(current: number, previous: number | null) {
  if (previous === null) return { pct: null, direction: "flat" as const };
  if (previous === 0) return { pct: null, direction: current > 0 ? ("up" as const) : ("flat" as const) };
  const p = Math.round(((current - previous) / previous) * 100);
  return { pct: p, direction: p > 0 ? ("up" as const) : p < 0 ? ("down" as const) : ("flat" as const) };
}

export function deltaText(current: number, previous: number | null, vsLabel: string): string | null {
  const d = delta(current, previous);
  if (d.pct === null) return null;
  if (d.pct === 0) return `No change vs ${vsLabel}`;
  return `${d.pct > 0 ? "+" : ""}${d.pct}% vs ${vsLabel}`;
}

export const oneIn = (rate: number) => (rate <= 0 ? "none" : `1 in ${Math.round(1 / rate)}`);

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const parts = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return { y, m, d }; };
export const shortDate = (iso: string) => { const { m, d } = parts(iso); return `${d} ${MONTHS[m - 1]}`; };
export const longDate = (iso: string) => { const { y, m, d } = parts(iso); return `${d} ${MONTHS[m - 1]} ${y}`; };
export function bucketLabel(iso: string, g: Granularity): string {
  const { y, m } = parts(iso);
  if (g === "month") return `${MONTHS[m - 1]} ${y}`;
  if (g === "week") return `w/c ${shortDate(iso)}`;
  return shortDate(iso);
}
```
Run: `npx vitest run tests/format.test.ts` — Expected: 6 passed. Adjust `compact` rounding only if a test proves it wrong; do not weaken the test.

- [ ] **Step 7: Glossary and its test**

```ts
// src/lib/glossary.ts
export type GlossaryKey =
  | "direct_bookings" | "booking_value" | "autumn_fee" | "net_revenue" | "direct_share"
  | "impressions" | "site_visits" | "cost_per_booking" | "ota_commission" | "ctr" | "lead_time"
  | "brand_protection" | "discovery" | "hotel_ads" | "retargeting"
  | "direct_autumn" | "direct_other" | "ota";

export interface GlossaryEntry { label: string; industryTerm?: string; meaning: string; purpose?: string }

export const glossary: Record<GlossaryKey, GlossaryEntry> = {
  direct_bookings: { label: "Direct bookings from Autumn", industryTerm: "attributed bookings", meaning: "Stays booked on your own website after a guest saw or clicked an ad Autumn ran for you." },
  booking_value: { label: "Booking value", meaning: "The room revenue from those stays, before any fee." },
  autumn_fee: { label: "Autumn's fee", meaning: "Autumn pays for the ads and charges a percentage only on bookings it brought you. This is that amount for the period." },
  net_revenue: { label: "What you kept", meaning: "Booking value minus Autumn's fee. Money that stayed with the hotel." },
  direct_share: { label: "Booked direct", meaning: "The share of all your bookings made on your own site instead of through an online travel agency (OTA) like Booking.com or Expedia. Direct bookings keep the commission in your pocket." },
  impressions: { label: "Saw your hotel", industryTerm: "impressions", meaning: "How many times your hotel appeared in Google search or Google Hotels because of Autumn's ads." },
  site_visits: { label: "Visited your site", industryTerm: "clicks", meaning: "How many of those people clicked through to your website." },
  cost_per_booking: { label: "Cost per booking", meaning: "Autumn's fee divided by the bookings it brought you. Compare it with what an OTA would have charged on the same stays." },
  ota_commission: { label: "OTA commission avoided", meaning: "What an online travel agency would typically have charged (about 18%) on the bookings that came direct instead." },
  ctr: { label: "People who clicked", industryTerm: "click-through rate (CTR)", meaning: "Of everyone who saw the ad, how many clicked. Shown as '1 in N'." },
  lead_time: { label: "Booking lead time", meaning: "How far ahead of the stay guests booked." },
  brand_protection: { label: "Brand protection", meaning: "Ads on searches for your hotel's own name.", purpose: "Keeps you first when guests search your name, so OTAs don't take a booking that was already yours." },
  discovery: { label: "Discovery", industryTerm: "non-brand search", meaning: "Ads on searches like 'South Haven inn' or 'Lake Michigan B&B'.", purpose: "Reaches travellers who don't know you yet." },
  hotel_ads: { label: "Google Hotel Ads", meaning: "Your direct rate shown next to OTA prices on Google Hotels.", purpose: "Wins the comparison so guests book with you, not them." },
  retargeting: { label: "Reminders", industryTerm: "retargeting", meaning: "Ads shown to people who visited your site but didn't book.", purpose: "Brings back guests who were already interested." },
  direct_autumn: { label: "Direct via Autumn", meaning: "Booked on your site after an Autumn ad." },
  direct_other: { label: "Direct, other", meaning: "Booked on your site from search, email, or word of mouth." },
  ota: { label: "Through an OTA", meaning: "Booked through Booking.com, Expedia, or a similar site, which charges commission." },
};

export const campaignLabel = (c: "brand_protection" | "discovery" | "hotel_ads" | "retargeting") => glossary[c].label;
export const sourceLabel = (s: "direct_autumn" | "direct_other" | "ota") => glossary[s].label;
```

```ts
// tests/glossary.test.ts
import { describe, it, expect } from "vitest";
import { glossary } from "@/lib/glossary";

describe("glossary", () => {
  it("every entry has a plain label and a meaning without a bare acronym", () => {
    for (const [key, e] of Object.entries(glossary)) {
      expect(e.label, key).not.toMatch(/\b(CTR|CVR|ROAS|CPC)\b/);
      expect(e.meaning.length, key).toBeGreaterThan(20);
    }
  });
});
```
Run: `npm test` — Expected: `Test Files  4 passed`.

- [ ] **Step 8: Commit**

```bash
git add src/lib tests
git commit -m "Add range parsing, formatting and plain-language glossary

Range anchors on the last seeded day, never the clock; two comparisons
(previous period, same period last year); 'all' has none.
Gates: vitest 4 files passed; typecheck 0; lint 0.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Schema, database client, migration

**Files:**
- Create: `src/lib/db/schema.ts`, `src/lib/db/client.ts`, `drizzle.config.ts`, `drizzle/0000_*.sql` (generated)
- Test: `tests/queries/setup.ts` (PGlite harness used by Tasks 6–7), `tests/queries/schema.test.ts`

**Interfaces:**
- Produces: Drizzle tables `properties`, `campaigns`, `dailyCampaignMetrics`, `dailySiteTraffic`, `hourlySiteTraffic`, `feederMarkets`, `bookings`, `insights`; enums `campaignCategory`, `device`, `trafficChannel`, `bookingSource`, `insightKind`; `db` (neon-http Drizzle instance); `type Db = typeof db`; `makeTestDb(): Promise<{ db: Db; close(): Promise<void> }>` in the test harness.

- [ ] **Step 1: Install**

```bash
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit @electric-sql/pglite dotenv
```

- [ ] **Step 2: Schema**

```ts
// src/lib/db/schema.ts
import { pgTable, pgEnum, integer, text, date, timestamp, smallint, index, bigint } from "drizzle-orm/pg-core";

export const campaignCategory = pgEnum("campaign_category", ["brand_protection", "discovery", "hotel_ads", "retargeting"]);
export const device = pgEnum("device", ["mobile", "desktop", "tablet"]);
export const trafficChannel = pgEnum("traffic_channel", ["paid_search", "organic_search", "direct", "ota_referral", "social", "email", "ai_search", "referral"]);
export const bookingSource = pgEnum("booking_source", ["direct_autumn", "direct_other", "ota"]);
export const insightKind = pgEnum("insight_kind", ["win", "watch", "action"]);

export const properties = pgTable("properties", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  region: text("region").notNull(),
  roomCount: smallint("room_count").notNull(),
  autumnStartDate: date("autumn_start_date").notNull(),
  feeRateBps: smallint("fee_rate_bps").notNull(),
  timezone: text("timezone").notNull(),
});

export const campaigns = pgTable("campaigns", {
  id: integer("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id),
  category: campaignCategory("category").notNull(),
  name: text("name").notNull(),
  startedOn: date("started_on").notNull(),
});

export const dailyCampaignMetrics = pgTable("daily_campaign_metrics", {
  id: integer("id").primaryKey(),
  date: date("date").notNull(),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id),
  device: device("device").notNull(),
  impressions: integer("impressions").notNull(),
  clicks: integer("clicks").notNull(),
  spendCents: integer("spend_cents").notNull(),
  bookings: integer("bookings").notNull(),
  bookingValueCents: integer("booking_value_cents").notNull(),
}, (t) => [index("dcm_date_idx").on(t.date), index("dcm_campaign_idx").on(t.campaignId)]);

export const dailySiteTraffic = pgTable("daily_site_traffic", {
  id: integer("id").primaryKey(),
  date: date("date").notNull(),
  propertyId: integer("property_id").notNull().references(() => properties.id),
  channel: trafficChannel("channel").notNull(),
  device: device("device").notNull(),
  sessions: integer("sessions").notNull(),
  newVisitors: integer("new_visitors").notNull(),
  pageviews: integer("pageviews").notNull(),
  engagedSessions: integer("engaged_sessions").notNull(),
}, (t) => [index("dst_date_idx").on(t.date)]);

export const hourlySiteTraffic = pgTable("hourly_site_traffic", {
  id: integer("id").primaryKey(),
  date: date("date").notNull(),
  propertyId: integer("property_id").notNull().references(() => properties.id),
  hour: smallint("hour").notNull(),
  sessions: integer("sessions").notNull(),
}, (t) => [index("hst_date_idx").on(t.date)]);

export const feederMarkets = pgTable("feeder_markets", {
  id: integer("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id),
  city: text("city").notNull(),
  region: text("region").notNull(),
  country: text("country").notNull(),
  driveMinutes: smallint("drive_minutes"),
  weight: integer("weight").notNull(),
});

export const bookings = pgTable("bookings", {
  id: integer("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id),
  bookedAt: timestamp("booked_at", { withTimezone: true }).notNull(),
  bookedOn: date("booked_on").notNull(),
  checkIn: date("check_in").notNull(),
  checkOut: date("check_out").notNull(),
  nights: smallint("nights").notNull(),
  roomRevenueCents: integer("room_revenue_cents").notNull(),
  source: bookingSource("source").notNull(),
  campaignId: integer("campaign_id").references(() => campaigns.id),
  feederMarketId: integer("feeder_market_id").notNull().references(() => feederMarkets.id),
  device: device("device").notNull(),
  leadTimeDays: smallint("lead_time_days").notNull(),
}, (t) => [index("bk_booked_on_idx").on(t.bookedOn), index("bk_source_idx").on(t.source)]);

export const insights = pgTable("insights", {
  id: integer("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  kind: insightKind("kind").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  linkAnchor: text("link_anchor"),
  sort: smallint("sort").notNull(),
}, (t) => [index("ins_period_idx").on(t.periodEnd)]);

export const schema = { properties, campaigns, dailyCampaignMetrics, dailySiteTraffic, hourlySiteTraffic, feederMarkets, bookings, insights };
export type CampaignCategory = (typeof campaignCategory.enumValues)[number];
export type Device = (typeof device.enumValues)[number];
export type TrafficChannel = (typeof trafficChannel.enumValues)[number];
export type BookingSource = (typeof bookingSource.enumValues)[number];
export type InsightKind = (typeof insightKind.enumValues)[number];
```
`bookedOn` duplicates the date of `bookedAt` so every date filter in the app uses one `date` column type and one index; `bookedAt` keeps the hour for the time-of-day panel.

- [ ] **Step 3: Client and drizzle config**

```ts
// src/lib/db/client.ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { schema } from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env and paste your Neon connection string.");

export const db = drizzle({ client: neon(url), schema });
export type Db = typeof db;
```

```ts
// drizzle.config.ts
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgresql://placeholder" },
});
```

- [ ] **Step 4: Generate the migration (no database needed)**

Run: `npm run db:generate`
Expected: `drizzle/0000_<name>.sql` created; it contains `CREATE TABLE "bookings"` and five `CREATE TYPE`. Commit the SQL; never hand-edit it.

- [ ] **Step 5: PGlite harness and a schema test**

```ts
// tests/queries/setup.ts
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { schema } from "@/lib/db/schema";

export async function makeTestDb() {
  const client = new PGlite();
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  return { db, close: () => client.close() };
}
export type TestDb = Awaited<ReturnType<typeof makeTestDb>>["db"];
```

```ts
// tests/queries/schema.test.ts
import { describe, it, expect } from "vitest";
import { sql } from "drizzle-orm";
import { makeTestDb } from "./setup";

describe("migration", () => {
  it("creates all eight tables", async () => {
    const { db, close } = await makeTestDb();
    const rows = await db.execute(sql`select table_name from information_schema.tables where table_schema = 'public' order by 1`);
    const names = rows.rows.map((r) => r.table_name);
    expect(names).toEqual(expect.arrayContaining(["bookings", "campaigns", "daily_campaign_metrics", "daily_site_traffic", "feeder_markets", "hourly_site_traffic", "insights", "properties"]));
    await close();
  });
});
```
Run: `npx vitest run tests/queries/schema.test.ts` — Expected: 1 passed (first run downloads the PGlite wasm; allow 30 s).

The query modules in Tasks 6–7 must accept a `Db`-shaped argument so PGlite and Neon share code. Type it as `import type { PgDatabase } from "drizzle-orm/pg-core"`-compatible: define in `src/lib/db/queries/types.ts`:

```ts
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import type { schema } from "../schema";
export type AnyDb = NeonHttpDatabase<typeof schema> | PgliteDatabase<typeof schema>;
```
(`drizzle-orm/pglite` types come with `drizzle-orm`; `@electric-sql/pglite` is dev-only, so the production bundle never imports it — the `import type` is erased.)

- [ ] **Step 6: HUMAN GATE — Neon.** Stop and ask the owner to create a free Neon project (or provision Neon through the Vercel Marketplace) and paste the pooled connection string into `.env` as `DATABASE_URL`. Do not create the account. When it exists:

Run: `npm run db:migrate`
Expected: `[✓] migrations applied` (or drizzle-kit's equivalent). Then `npm run typecheck && npm run lint && npm test`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/db drizzle drizzle.config.ts tests/queries package.json package-lock.json
git commit -m "Add Drizzle schema for the hotel marketing data model

Eight tables; money in cents; bookings carry source, campaign, market,
device, lead time so both screens derive from one grain.
Gates: db:generate ok; PGlite migration test 1 passed; typecheck 0.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Seed foundations — deterministic RNG and demand profile

**Files:**
- Create: `scripts/seed/rng.ts`, `scripts/seed/profile.ts`
- Test: `tests/seed-profile.test.ts`

**Interfaces:**
- Produces:
  - `makeRng(seed: number): Rng` where `interface Rng { next(): number; int(min, max): number; pick<T>(arr: T[]): T; weighted<T>(items: { item: T; weight: number }[]): T; normal(mean, sd): number; poisson(lambda): number; lognormal(median, sigma): number }`
  - constants `SEED = 20260917`, `WINDOW = { start: "2024-09-17", end: "2026-09-16" }`, `AUTUMN_START = "2025-02-03"`, `PROPERTY`, `CAMPAIGN_DEFS`, `MARKET_DEFS`
  - `demandMultiplier(iso: string): number`, `adrCents(iso: string): number`, `autumnRamp(iso: string): number`, `eachDay(start, end): string[]`, `dow(iso): number`

- [ ] **Step 1: Failing tests**

```ts
// tests/seed-profile.test.ts
import { describe, it, expect } from "vitest";
import { makeRng } from "../scripts/seed/rng";
import { demandMultiplier, adrCents, autumnRamp, eachDay, WINDOW, AUTUMN_START } from "../scripts/seed/profile";

describe("rng", () => {
  it("is deterministic for a seed", () => {
    const a = makeRng(1), b = makeRng(1);
    expect([a.next(), a.next(), a.int(1, 6)]).toEqual([b.next(), b.next(), b.int(1, 6)]);
  });
  it("poisson mean is near lambda", () => {
    const r = makeRng(7); let s = 0;
    for (let i = 0; i < 5000; i++) s += r.poisson(3.2);
    expect(s / 5000).toBeGreaterThan(3.0); expect(s / 5000).toBeLessThan(3.4);
  });
});

describe("profile", () => {
  it("covers 730 days", () => { expect(eachDay(WINDOW.start, WINDOW.end)).toHaveLength(730); });
  it("summer beats winter, weekends beat weekdays, holidays spike", () => {
    expect(demandMultiplier("2025-07-12")).toBeGreaterThan(demandMultiplier("2025-01-14") * 2);
    expect(demandMultiplier("2025-06-14")).toBeGreaterThan(demandMultiplier("2025-06-10")); // Sat vs Tue
    expect(demandMultiplier("2025-07-04")).toBeGreaterThan(demandMultiplier("2025-07-08"));
  });
  it("ADR follows season", () => {
    expect(adrCents("2025-07-12")).toBeGreaterThan(24000);
    expect(adrCents("2025-01-14")).toBeLessThan(17000);
  });
  it("Autumn ramp is 0 before start and 1 after ten weeks", () => {
    expect(autumnRamp("2025-02-02")).toBe(0);
    expect(autumnRamp(AUTUMN_START)).toBeGreaterThan(0);
    expect(autumnRamp("2025-04-20")).toBe(1);
  });
});
```
Run: `npx vitest run tests/seed-profile.test.ts` — Expected: FAIL, modules missing.

- [ ] **Step 2: Implement rng**

```ts
// scripts/seed/rng.ts
export interface Rng {
  next(): number; int(min: number, max: number): number; pick<T>(arr: T[]): T;
  weighted<T>(items: { item: T; weight: number }[]): T; normal(mean: number, sd: number): number;
  poisson(lambda: number): number; lognormal(median: number, sigma: number): number;
}
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => { a += 0x6d2b79f5; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const normal = (mean: number, sd: number) => { const u = 1 - next(), v = next(); return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    weighted: (items) => { const total = items.reduce((s, i) => s + i.weight, 0); let r = next() * total; for (const i of items) { r -= i.weight; if (r <= 0) return i.item; } return items[items.length - 1].item; },
    normal,
    poisson: (lambda) => { if (lambda > 30) return Math.max(0, Math.round(normal(lambda, Math.sqrt(lambda)))); const L = Math.exp(-lambda); let k = 0, p = 1; do { k++; p *= next(); } while (p > L); return k - 1; },
    lognormal: (median, sigma) => Math.exp(Math.log(median) + sigma * normal(0, 1)),
  };
}
```

- [ ] **Step 3: Implement profile**

```ts
// scripts/seed/profile.ts
import { addDays, daysBetween } from "@/lib/date-range";

export const SEED = 20260917;
export const WINDOW = { start: "2024-09-17", end: "2026-09-16" };
export const AUTUMN_START = "2025-02-03";
export const OTA_COMMISSION_RATE = 0.18;

export const PROPERTY = { id: 1, name: "Harbor House Inn", city: "South Haven", region: "Michigan", roomCount: 22, autumnStartDate: AUTUMN_START, feeRateBps: 1500, timezone: "America/Detroit" };

export const CAMPAIGN_DEFS = [
  { id: 1, category: "brand_protection" as const, name: "Brand protection — Harbor House", startedOn: AUTUMN_START, baseImpressions: 38, ctr: 0.28, conv: 0.075, device: { mobile: 0.62, desktop: 0.31, tablet: 0.07 } },
  { id: 2, category: "discovery" as const, name: "Discovery — South Haven & Lake Michigan stays", startedOn: AUTUMN_START, baseImpressions: 260, ctr: 0.07, conv: 0.022, device: { mobile: 0.66, desktop: 0.27, tablet: 0.07 } },
  { id: 3, category: "hotel_ads" as const, name: "Google Hotel Ads — direct rate", startedOn: "2025-03-03", baseImpressions: 120, ctr: 0.11, conv: 0.045, device: { mobile: 0.55, desktop: 0.38, tablet: 0.07 } },
  { id: 4, category: "retargeting" as const, name: "Reminders — site visitors", startedOn: "2025-03-17", baseImpressions: 90, ctr: 0.05, conv: 0.06, device: { mobile: 0.6, desktop: 0.33, tablet: 0.07 } },
];

export const MARKET_DEFS = [
  { id: 1, city: "Chicago", region: "Illinois", country: "United States", driveMinutes: 135, weight: 34 },
  { id: 2, city: "Grand Rapids", region: "Michigan", country: "United States", driveMinutes: 70, weight: 14 },
  { id: 3, city: "Detroit", region: "Michigan", country: "United States", driveMinutes: 170, weight: 12 },
  { id: 4, city: "Indianapolis", region: "Indiana", country: "United States", driveMinutes: 200, weight: 9 },
  { id: 5, city: "Milwaukee", region: "Wisconsin", country: "United States", driveMinutes: 250, weight: 7 },
  { id: 6, city: "Kalamazoo", region: "Michigan", country: "United States", driveMinutes: 50, weight: 6 },
  { id: 7, city: "Columbus", region: "Ohio", country: "United States", driveMinutes: 300, weight: 4 },
  { id: 8, city: "St. Louis", region: "Missouri", country: "United States", driveMinutes: 330, weight: 3 },
  { id: 9, city: "Toronto", region: "Ontario", country: "Canada", driveMinutes: 420, weight: 3 },
  { id: 10, city: "Other", region: "", country: "United States", driveMinutes: null, weight: 8 },
];

const SEASON = [0.35, 0.38, 0.45, 0.55, 0.72, 0.9, 1.0, 0.95, 0.78, 0.7, 0.42, 0.4]; // Jan..Dec
const HOLIDAYS: Record<string, number> = { "05-24": 1.3, "05-25": 1.4, "05-26": 1.2, "07-03": 1.35, "07-04": 1.5, "07-05": 1.3, "08-30": 1.3, "08-31": 1.35, "09-01": 1.2, "11-27": 1.15, "11-28": 1.25, "12-24": 1.3, "12-25": 1.2, "12-26": 1.4, "12-27": 1.4, "12-28": 1.35, "12-30": 1.4, "12-31": 1.5 };

export const dow = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay();
export function eachDay(start: string, end: string): string[] { const out: string[] = []; for (let d = start; d <= end; d = addDays(d, 1)) out.push(d); return out; }

export function demandMultiplier(iso: string): number {
  const m = Number(iso.slice(5, 7)) - 1;
  const weekday = [0.95, 0.8, 0.8, 0.85, 0.95, 1.35, 1.35][dow(iso)];
  const holiday = HOLIDAYS[iso.slice(5)] ?? 1;
  return SEASON[m] * weekday * holiday;
}

export function adrCents(iso: string): number {
  const m = Number(iso.slice(5, 7)) - 1;
  const base = 15000 + (26500 - 15000) * ((SEASON[m] - 0.35) / 0.65);
  const weekend = dow(iso) === 5 || dow(iso) === 6 ? 1.12 : 1;
  return Math.round(base * weekend);
}

export function autumnRamp(iso: string): number {
  if (iso < AUTUMN_START) return 0;
  const d = daysBetween(AUTUMN_START, iso) - 1;
  return Math.min(1, (d + 1) / 70);
}
```
`tsconfig.json` must include `scripts` and `tests` in `include` so `@/` resolves there; add `"scripts/**/*.ts", "tests/**/*.ts", "tests/**/*.tsx"` to `include`.

- [ ] **Step 4: Run green**

Run: `npx vitest run tests/seed-profile.test.ts` — Expected: 6 passed. If the holiday assertion is red, the fix is in `HOLIDAYS`, not the test.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed tests/seed-profile.test.ts tsconfig.json
git commit -m "Add deterministic RNG and Lake Michigan demand profile for the seed

Seasonality, weekend and holiday multipliers, ADR curve, 10-week Autumn ramp.
Gates: vitest seed-profile 6 passed.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Seed generators, seed entry, verify script

**Files:**
- Create: `scripts/seed/generate-bookings.ts`, `scripts/seed/generate-campaigns.ts`, `scripts/seed/generate-traffic.ts`, `scripts/seed/generate-insights.ts`, `scripts/seed/index.ts`, `scripts/db-verify.ts`, `scripts/seed/acceptance.ts`
- Test: `tests/seed-generators.test.ts`

**Interfaces:**
- Consumes: Task 4 exports; schema types from Task 3.
- Produces:
  - `generateBookings(rng): BookingRow[]` (`typeof bookings.$inferInsert`)
  - `generateCampaignMetrics(rng, bookingsRows): CampaignMetricRow[]`
  - `generateTraffic(rng, campaignRows): { daily: TrafficRow[]; hourly: HourlyRow[] }`
  - `generateInsights(bookingsRows, campaignRows): InsightRow[]`
  - `generateAll(seed?: number): SeedData` = `{ property, campaigns, markets, bookings, campaignMetrics, traffic, hourly, insights }`
  - `acceptanceLine(s: { days: number; from: string; to: string; bookings: number; campaignRows: number; trafficRows: number }): string` → `Seeded 730 days 2024-09-17..2026-09-16, 4812 bookings, 8760 campaign rows, 17520 traffic rows`

- [ ] **Step 1: Failing generator tests**

```ts
// tests/seed-generators.test.ts
import { describe, it, expect } from "vitest";
import { generateAll } from "../scripts/seed/generate-all";
import { AUTUMN_START } from "../scripts/seed/profile";

const data = generateAll();

describe("seed generators", () => {
  it("is deterministic", () => {
    const again = generateAll();
    expect(again.bookings.slice(0, 100)).toEqual(data.bookings.slice(0, 100));
  });
  it("covers at least 720 distinct booking days", () => {
    expect(new Set(data.bookings.map((b) => b.bookedOn)).size).toBeGreaterThanOrEqual(720);
  });
  it("has no Autumn bookings or campaign rows before the start date", () => {
    expect(data.bookings.filter((b) => b.source === "direct_autumn" && b.bookedOn < AUTUMN_START)).toHaveLength(0);
    expect(data.campaignMetrics.filter((m) => m.date < AUTUMN_START)).toHaveLength(0);
  });
  it("direct share rises after Autumn", () => {
    const share = (from: string, to: string) => { const rows = data.bookings.filter((b) => b.bookedOn >= from && b.bookedOn <= to); return rows.filter((b) => b.source !== "ota").length / rows.length; };
    expect(share("2024-10-01", "2025-01-31")).toBeLessThan(0.34);
    expect(share("2026-06-01", "2026-08-31")).toBeGreaterThan(0.46);
  });
  it("campaign metric bookings equal attributed booking rows per day and campaign", () => {
    const fromBookings = new Map<string, number>();
    for (const b of data.bookings) if (b.source === "direct_autumn") { const k = `${b.bookedOn}:${b.campaignId}`; fromBookings.set(k, (fromBookings.get(k) ?? 0) + 1); }
    const fromMetrics = new Map<string, number>();
    for (const m of data.campaignMetrics) { const k = `${m.date}:${m.campaignId}`; fromMetrics.set(k, (fromMetrics.get(k) ?? 0) + m.bookings); }
    for (const [k, n] of fromBookings) expect(fromMetrics.get(k), k).toBe(n);
  });
  it("totals sit in a plausible band for a 22-room inn", () => {
    const july = data.bookings.filter((b) => b.bookedOn.startsWith("2026-07"));
    expect(july.length).toBeGreaterThan(180); expect(july.length).toBeLessThan(420);
    const value = july.reduce((s, b) => s + b.roomRevenueCents, 0);
    expect(value).toBeGreaterThan(100_000_00); expect(value).toBeLessThan(300_000_00);
  });
  it("insights exist for every month after Autumn started and reference real anchors", () => {
    const months = new Set(data.insights.map((i) => i.periodStart.slice(0, 7)));
    expect(months.size).toBeGreaterThanOrEqual(19);
    for (const i of data.insights) if (i.linkAnchor) expect(["mix", "campaigns", "markets", "guests", "recent"]).toContain(i.linkAnchor);
  });
});
```
Run: `npx vitest run tests/seed-generators.test.ts` — Expected: FAIL, module missing.

- [ ] **Step 2: Bookings generator**

```ts
// scripts/seed/generate-bookings.ts
import type { bookings } from "@/lib/db/schema";
import type { Rng } from "./rng";
import { AUTUMN_START, CAMPAIGN_DEFS, MARKET_DEFS, PROPERTY, WINDOW, adrCents, autumnRamp, demandMultiplier, dow, eachDay } from "./profile";
import { addDays } from "@/lib/date-range";

export type BookingRow = typeof bookings.$inferInsert;

const HOUR_WEIGHTS = [1,1,1,1,1,1,2,3,4,5,6,7,8,7,6,6,7,8,10,12,13,12,9,5]; // evening-heavy
const DEVICE_WEIGHTS = { mobile: 58, desktop: 35, tablet: 7 };

export function generateBookings(rng: Rng): BookingRow[] {
  const rows: BookingRow[] = [];
  let id = 1;
  for (const day of eachDay(WINDOW.start, WINDOW.end)) {
    const ramp = autumnRamp(day);
    const baseline = 3.1 * demandMultiplier(day);
    const lift = 1 + 0.42 * ramp;                       // Autumn adds demand, not just re-attribution
    const count = rng.poisson(baseline * lift);
    const autumnShare = 0.31 * ramp;                     // of all bookings
    const directOtherShare = 0.28 - 0.06 * ramp;         // some organic direct becomes Autumn-attributed
    const weekend = dow(day) === 5 || dow(day) === 6;
    for (let i = 0; i < count; i++) {
      const u = rng.next();
      const source = u < autumnShare ? "direct_autumn" : u < autumnShare + directOtherShare ? "direct_other" : "ota";
      const activeCampaigns = CAMPAIGN_DEFS.filter((c) => c.startedOn <= day);
      const campaign = source === "direct_autumn" ? rng.weighted(activeCampaigns.map((c) => ({ item: c, weight: c.baseImpressions * c.ctr * c.conv }))) : null;
      const month = Number(day.slice(5, 7));
      const leadMedian = campaign?.category === "retargeting" ? 6 : month >= 5 && month <= 8 ? 28 : 16;
      const lead = Math.min(240, Math.max(0, Math.round(rng.lognormal(leadMedian, 0.9))));
      const checkIn = addDays(day, lead);
      const nights = rng.weighted([{ item: 1, weight: 22 }, { item: 2, weight: 45 }, { item: 3, weight: 22 }, { item: 4, weight: 8 }, { item: 5, weight: 3 }]);
      const adr = adrCents(checkIn) * (0.9 + rng.next() * 0.25);
      const market = rng.weighted(MARKET_DEFS.map((m) => ({ item: m, weight: m.id === 1 && weekend ? m.weight * 1.25 : m.weight })));
      const hour = rng.weighted(HOUR_WEIGHTS.map((w, h) => ({ item: h, weight: w })));
      const device = campaign ? rng.weighted(Object.entries(campaign.device).map(([k, w]) => ({ item: k as BookingRow["device"], weight: w }))) : rng.weighted(Object.entries(DEVICE_WEIGHTS).map(([k, w]) => ({ item: k as BookingRow["device"], weight: w })));
      rows.push({
        id: id++, propertyId: PROPERTY.id,
        bookedAt: new Date(`${day}T${String(hour).padStart(2, "0")}:${String(rng.int(0, 59)).padStart(2, "0")}:00-04:00`),
        bookedOn: day, checkIn, checkOut: addDays(checkIn, nights), nights,
        roomRevenueCents: Math.round(adr * nights), source, campaignId: campaign?.id ?? null,
        feederMarketId: market.id, device, leadTimeDays: lead,
      });
    }
  }
  void AUTUMN_START;
  return rows;
}
```

- [ ] **Step 3: Campaign metrics generator** (derived so `bookings` column equals attributed rows)

```ts
// scripts/seed/generate-campaigns.ts
import type { dailyCampaignMetrics } from "@/lib/db/schema";
import type { Rng } from "./rng";
import type { BookingRow } from "./generate-bookings";
import { CAMPAIGN_DEFS, WINDOW, autumnRamp, demandMultiplier, eachDay } from "./profile";

export type CampaignMetricRow = typeof dailyCampaignMetrics.$inferInsert;
const DEVICES = ["mobile", "desktop", "tablet"] as const;

export function generateCampaignMetrics(rng: Rng, bookingsRows: BookingRow[]): CampaignMetricRow[] {
  const attributed = new Map<string, BookingRow[]>();
  for (const b of bookingsRows) if (b.source === "direct_autumn" && b.campaignId) { const k = `${b.bookedOn}:${b.campaignId}`; attributed.set(k, [...(attributed.get(k) ?? []), b]); }
  const rows: CampaignMetricRow[] = [];
  let id = 1;
  for (const day of eachDay(WINDOW.start, WINDOW.end)) {
    for (const c of CAMPAIGN_DEFS) {
      if (day < c.startedOn) continue;
      const ramp = autumnRamp(day);
      const demand = 0.5 + demandMultiplier(day);            // ads run even in low season, just less
      const dayBookings = attributed.get(`${day}:${c.id}`) ?? [];
      for (const device of DEVICES) {
        const share = c.device[device];
        const impressions = rng.poisson(c.baseImpressions * demand * ramp * share * (0.85 + rng.next() * 0.3));
        const clicks = Math.min(impressions, rng.poisson(impressions * c.ctr));
        const mine = dayBookings.filter((b) => b.device === device);
        rows.push({ id: id++, date: day, campaignId: c.id, device, impressions, clicks,
          spendCents: Math.round(clicks * (c.category === "brand_protection" ? 95 : c.category === "hotel_ads" ? 210 : 165)),
          bookings: mine.length, bookingValueCents: mine.reduce((s, b) => s + b.roomRevenueCents, 0) });
      }
    }
  }
  return rows;
}
```
The `campaign metric bookings equal attributed rows` test is the negative control for this file: remove the `mine` filter and it goes red.

- [ ] **Step 4: Traffic generator**

```ts
// scripts/seed/generate-traffic.ts
import type { dailySiteTraffic, hourlySiteTraffic } from "@/lib/db/schema";
import type { Rng } from "./rng";
import type { CampaignMetricRow } from "./generate-campaigns";
import { PROPERTY, WINDOW, autumnRamp, demandMultiplier, eachDay } from "./profile";

export type TrafficRow = typeof dailySiteTraffic.$inferInsert;
export type HourlyRow = typeof hourlySiteTraffic.$inferInsert;
const DEVICES = ["mobile", "desktop", "tablet"] as const;
const DEVICE_SHARE = { mobile: 0.6, desktop: 0.33, tablet: 0.07 };
const HOURS = [2,1,1,1,1,2,3,5,7,8,9,9,10,9,8,8,8,9,10,11,11,10,7,4];

export function generateTraffic(rng: Rng, campaignRows: CampaignMetricRow[]) {
  const paidByDay = new Map<string, Record<string, number>>();
  for (const r of campaignRows) { const d = paidByDay.get(r.date) ?? { mobile: 0, desktop: 0, tablet: 0 }; d[r.device] += r.clicks; paidByDay.set(r.date, d); }
  const daily: TrafficRow[] = []; const hourly: HourlyRow[] = [];
  let id = 1, hid = 1;
  for (const day of eachDay(WINDOW.start, WINDOW.end)) {
    const demand = demandMultiplier(day); const ramp = autumnRamp(day);
    const aiStart = day >= "2025-06-01" ? Math.min(1, (Number(day.slice(0, 4)) - 2025) + Number(day.slice(5, 7)) / 12) : 0;
    const base: Record<TrafficRow["channel"], number> = {
      paid_search: 0, organic_search: 48 * demand * (1 + 0.15 * ramp), direct: 26 * demand * (1 + 0.2 * ramp),
      ota_referral: 14 * demand * (1 - 0.35 * ramp), social: 6 * demand, email: 5 * demand * (1 + 0.6 * ramp),
      ai_search: 4 * demand * aiStart, referral: 5 * demand,
    };
    let dayTotal = 0;
    for (const channel of Object.keys(base) as TrafficRow["channel"][]) for (const device of DEVICES) {
      const sessions = channel === "paid_search" ? (paidByDay.get(day)?.[device] ?? 0) : rng.poisson(base[channel] * DEVICE_SHARE[device]);
      const newRate = channel === "direct" ? 0.35 : channel === "email" ? 0.1 : 0.72;
      daily.push({ id: id++, date: day, propertyId: PROPERTY.id, channel, device, sessions,
        newVisitors: Math.round(sessions * newRate), pageviews: Math.round(sessions * (2.6 + rng.next() * 1.4)), engagedSessions: Math.round(sessions * (0.5 + rng.next() * 0.25)) });
      dayTotal += sessions;
    }
    const w = HOURS.reduce((s, h) => s + h, 0);
    for (let h = 0; h < 24; h++) hourly.push({ id: hid++, date: day, propertyId: PROPERTY.id, hour: h, sessions: Math.round((dayTotal * HOURS[h]) / w) });
  }
  return { daily, hourly };
}
```

- [ ] **Step 5: Insights generator (derived from the rows, month by month)**

```ts
// scripts/seed/generate-insights.ts
import type { insights } from "@/lib/db/schema";
import type { BookingRow } from "./generate-bookings";
import type { CampaignMetricRow } from "./generate-campaigns";
import { AUTUMN_START, PROPERTY, WINDOW } from "./profile";
import { money, pct } from "@/lib/format";
import { addDays } from "@/lib/date-range";
import { glossary } from "@/lib/glossary";

export type InsightRow = typeof insights.$inferInsert;

const monthKey = (iso: string) => iso.slice(0, 7);
const monthEnd = (ym: string) => { const [y, m] = ym.split("-").map(Number); return addDays(`${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`, -1); };
const prevMonth = (ym: string) => { const [y, m] = ym.split("-").map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`; };
const lastYear = (ym: string) => `${Number(ym.slice(0, 4)) - 1}${ym.slice(4)}`;

export function generateInsights(b: BookingRow[], c: CampaignMetricRow[]): InsightRow[] {
  const byMonth = new Map<string, BookingRow[]>();
  for (const r of b) byMonth.set(monthKey(r.bookedOn), [...(byMonth.get(monthKey(r.bookedOn)) ?? []), r]);
  const camByMonth = new Map<string, CampaignMetricRow[]>();
  for (const r of c) camByMonth.set(monthKey(r.date), [...(camByMonth.get(monthKey(r.date)) ?? []), r]);
  const stats = (rows: BookingRow[] = []) => ({
    autumn: rows.filter((r) => r.source === "direct_autumn"),
    value: rows.filter((r) => r.source === "direct_autumn").reduce((s, r) => s + r.roomRevenueCents, 0),
    directShare: rows.length ? rows.filter((r) => r.source !== "ota").length / rows.length : 0,
  });
  const out: InsightRow[] = []; let id = 1;
  for (const ym of [...byMonth.keys()].sort()) {
    if (ym < monthKey(AUTUMN_START) || ym > monthKey(WINDOW.end)) continue;
    const start = `${ym}-01`, end = ym === monthKey(WINDOW.end) ? WINDOW.end : monthEnd(ym);
    const cur = stats(byMonth.get(ym)), prev = stats(byMonth.get(prevMonth(ym))), ly = stats(byMonth.get(lastYear(ym)));
    let sort = 1;
    const push = (kind: InsightRow["kind"], title: string, body: string, linkAnchor: string | null) => out.push({ id: id++, propertyId: PROPERTY.id, periodStart: start, periodEnd: end, kind, title, body, linkAnchor, sort: sort++ });
    // Win or watch: booking value vs last month, with seasonality context from last year
    if (prev.value > 0) {
      const d = Math.round(((cur.value - prev.value) / prev.value) * 100);
      const ctx = ly.value > 0 ? ` Compared with the same month last year, you are ${cur.value >= ly.value ? "up" : "down"} ${pct(Math.abs(cur.value - ly.value) / ly.value)}.` : "";
      if (d >= 0) push("win", `${money(cur.value)} in direct bookings from Autumn`, `That is ${d}% more than last month across ${cur.autumn.length} stays.${ctx}`, "mix");
      else push("watch", `Direct booking value dipped ${Math.abs(d)}% from last month`, `${cur.autumn.length} stays worth ${money(cur.value)}. This is normal for the season.${ctx}`, "mix");
    } else if (cur.autumn.length > 0) {
      push("win", `First ${cur.autumn.length} direct bookings from Autumn`, `Autumn's ads started on ${AUTUMN_START} and have already brought ${money(cur.value)} in stays booked on your own site.`, "campaigns");
    }
    // Direct share
    if (prev.directShare > 0 && cur.directShare - prev.directShare >= 0.03) push("win", `${pct(cur.directShare)} of bookings came direct`, `Up from ${pct(prev.directShare)} last month. Every direct booking avoids OTA commission (${glossary.ota.meaning})`, "mix");
    // Top market
    const markets = new Map<number, number>(); for (const r of cur.autumn) markets.set(r.feederMarketId, (markets.get(r.feederMarketId) ?? 0) + 1);
    const top = [...markets.entries()].sort((a, z) => z[1] - a[1])[0];
    if (top && top[0] !== 1 && top[1] >= 4) push("win", `A new top market this month`, `Most of Autumn's bookings came from outside Chicago this month. See where guests are coming from.`, "markets");
    // Campaign watch + action: CTR drop for discovery
    const cm = camByMonth.get(ym) ?? [], pm = camByMonth.get(prevMonth(ym)) ?? [];
    const ctr = (rows: CampaignMetricRow[]) => { const d = rows.filter((r) => r.campaignId === 2); const i = d.reduce((s, r) => s + r.impressions, 0); return i ? d.reduce((s, r) => s + r.clicks, 0) / i : 0; };
    if (ctr(pm) > 0 && ctr(cm) < ctr(pm) * 0.9) {
      push("watch", "Fewer people clicked the discovery ads", `About ${pct(ctr(cm), 1)} of people who saw them clicked, down from ${pct(ctr(pm), 1)}. Competitors often bid harder going into the season.`, "campaigns");
      push("action", "Autumn refreshed the discovery ad copy and bids", "New headlines lead with lakefront rooms and the direct-booking rate; bids were raised on weekend searches from Chicago.", "campaigns");
    }
    if (sort <= 2) push("action", "Autumn is keeping your name protected", "Brand-protection ads ran every day this month so guests searching for Harbor House found your site first.", "campaigns");
  }
  return out;
}
```

- [ ] **Step 6: `generate-all.ts`, acceptance line, seed entry, verify**

```ts
// scripts/seed/acceptance.ts
export const acceptanceLine = (s: { days: number; from: string; to: string; bookings: number; campaignRows: number; trafficRows: number }) =>
  `Seeded ${s.days} days ${s.from}..${s.to}, ${s.bookings} bookings, ${s.campaignRows} campaign rows, ${s.trafficRows} traffic rows`;
```

```ts
// scripts/seed/generate-all.ts
import { makeRng } from "./rng";
import { CAMPAIGN_DEFS, MARKET_DEFS, PROPERTY, SEED } from "./profile";
import { generateBookings } from "./generate-bookings";
import { generateCampaignMetrics } from "./generate-campaigns";
import { generateTraffic } from "./generate-traffic";
import { generateInsights } from "./generate-insights";

export function generateAll(seed = SEED) {
  const rng = makeRng(seed);
  const bookings = generateBookings(rng);
  const campaignMetrics = generateCampaignMetrics(rng, bookings);
  const { daily: traffic, hourly } = generateTraffic(rng, campaignMetrics);
  const insights = generateInsights(bookings, campaignMetrics);
  return {
    property: PROPERTY,
    campaigns: CAMPAIGN_DEFS.map(({ id, category, name, startedOn }) => ({ id, propertyId: PROPERTY.id, category, name, startedOn })),
    markets: MARKET_DEFS.map((m) => ({ ...m, propertyId: PROPERTY.id })),
    bookings, campaignMetrics, traffic, hourly, insights,
  };
}
export type SeedData = ReturnType<typeof generateAll>;
```

```ts
// scripts/seed/index.ts
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { bookings, campaigns, dailyCampaignMetrics, dailySiteTraffic, feederMarkets, hourlySiteTraffic, insights, properties } from "@/lib/db/schema";
import { generateAll } from "./generate-all";
import { acceptanceLine } from "./acceptance";
import { WINDOW } from "./profile";
import { daysBetween } from "@/lib/date-range";

async function insertChunks<T>(table: Parameters<typeof db.insert>[0], rows: T[], size = 1000) {
  for (let i = 0; i < rows.length; i += size) await db.insert(table).values(rows.slice(i, i + size) as never);
}

async function main() {
  const t0 = Date.now();
  const data = generateAll();
  await db.execute(sql`truncate table insights, bookings, hourly_site_traffic, daily_site_traffic, daily_campaign_metrics, feeder_markets, campaigns, properties restart identity cascade`);
  await db.insert(properties).values(data.property);
  await db.insert(campaigns).values(data.campaigns);
  await db.insert(feederMarkets).values(data.markets);
  await insertChunks(bookings, data.bookings);
  await insertChunks(dailyCampaignMetrics, data.campaignMetrics);
  await insertChunks(dailySiteTraffic, data.traffic);
  await insertChunks(hourlySiteTraffic, data.hourly);
  await insertChunks(insights, data.insights);
  console.log(acceptanceLine({ days: daysBetween(WINDOW.start, WINDOW.end), from: WINDOW.start, to: WINDOW.end, bookings: data.bookings.length, campaignRows: data.campaignMetrics.length, trafficRows: data.traffic.length }));
  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
main().catch((e) => { console.error(e); process.exit(1); });
```

```ts
// scripts/db-verify.ts
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { acceptanceLine } from "./seed/acceptance";

async function main() {
  const [b] = (await db.execute(sql`select count(*)::int as n, min(booked_on)::text as lo, max(booked_on)::text as hi from bookings`)).rows as { n: number; lo: string; hi: string }[];
  const [t] = (await db.execute(sql`select count(*)::int as n, min(date)::text as lo, max(date)::text as hi, count(distinct date)::int as days from daily_site_traffic`)).rows as { n: number; lo: string; hi: string; days: number }[];
  const [c] = (await db.execute(sql`select count(*)::int as n from daily_campaign_metrics`)).rows as { n: number }[];
  console.log(acceptanceLine({ days: t.days, from: t.lo, to: t.hi, bookings: b.n, campaignRows: c.n, trafficRows: t.n }));
  if (t.days < 720) { console.error("FAIL: fewer than 720 days"); process.exit(1); }
}
main().catch((e) => { console.error(e); process.exit(1); });
```
`tsx` needs the `@/` alias: add `"tsconfig-paths"` is unnecessary — `tsx` reads `tsconfig.json` `paths` natively. Confirm with `npx tsx -e "import('@/lib/format').then(m=>console.log(m.money(100)))"` printing `$1`.

- [ ] **Step 7: Run generator tests green, then seed and verify against Neon**

Run: `npx vitest run tests/seed-generators.test.ts` — Expected: 7 passed. Tune only the generator constants if a band fails; record the final July count in the commit body.

Run: `npm run db:seed` — Expected: `Seeded 730 days 2024-09-17..2026-09-16, <N> bookings, <M> campaign rows, 17520 traffic rows` then `Done in <s>s`.
Run: `npm run db:verify` — Expected: the identical line. Paste both into the commit body.

- [ ] **Step 8: Commit**

```bash
git add scripts tests/seed-generators.test.ts
git commit -m "Add deterministic 730-day seed and a verify script that re-measures it

db:seed printed:   <paste>
db:verify printed: <paste>
Campaign metrics derive their bookings from the bookings rows, so the two
screens can never disagree. Insights are generated from the same rows.
Gates: vitest 7 passed (generators), typecheck 0, lint 0.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Query layer — meta and overview

**Files:**
- Create: `src/lib/db/queries/types.ts`, `src/lib/db/queries/meta.ts`, `src/lib/db/queries/overview.ts`
- Test: `tests/queries/fixture.ts`, `tests/queries/overview.test.ts`

**Interfaces:**
- Produces:
  - `getDataBounds(db): Promise<{ min: string; max: string; property: { name: string; city: string; region: string; feeRateBps: number; autumnStartDate: string } }>`
  - `interface PeriodTotals { autumnBookings: number; autumnValueCents: number; feeCents: number; netCents: number; directBookings: number; otaBookings: number; totalBookings: number; directShare: number; impressions: number; clicks: number; siteVisits: number }`
  - `interface OverviewDto { current: PeriodTotals; previous: PeriodTotals | null; lastYear: PeriodTotals | null; feeRateBps: number; costPerBookingCents: number | null; otaCommissionPerBookingCents: number | null; commissionAvoidedCents: number }`
  - `getOverview(db, range: DateRange, feeRateBps: number): Promise<OverviewDto>`
  - `type TrendMetric = "booking_value" | "direct_bookings" | "site_visits"`; `interface TrendPoint { bucket: string; current: number; previous: number | null; lastYear: number | null }`; `getTrend(db, range, metric): Promise<TrendPoint[]>`
  - `interface InsightDto { id: number; kind: InsightKind; title: string; body: string; linkAnchor: string | null; periodEnd: string }`; `getInsights(db, range, limit = 5): Promise<InsightDto[]>`
  - `interface SourcePreviewDto { markets: { city: string; region: string; bookings: number; share: number }[]; campaigns: { category: CampaignCategory; bookings: number; share: number }[] }`; `getSourcePreview(db, range): Promise<SourcePreviewDto>`

- [ ] **Step 1: Fixture with hand-computed expectations**

```ts
// tests/queries/fixture.ts
import type { TestDb } from "./setup";
import { bookings, campaigns, dailyCampaignMetrics, dailySiteTraffic, feederMarkets, insights, properties } from "@/lib/db/schema";

// Current period: 2026-09-01..2026-09-10. Previous: 2026-08-22..2026-08-31. Last year: 2025-09-01..2025-09-10.
export async function loadFixture(db: TestDb) {
  await db.insert(properties).values({ id: 1, name: "Test Inn", city: "South Haven", region: "MI", roomCount: 10, autumnStartDate: "2025-02-03", feeRateBps: 1500, timezone: "America/Detroit" });
  await db.insert(campaigns).values([{ id: 1, propertyId: 1, category: "brand_protection", name: "BP", startedOn: "2025-02-03" }, { id: 2, propertyId: 1, category: "discovery", name: "D", startedOn: "2025-02-03" }]);
  await db.insert(feederMarkets).values([{ id: 1, propertyId: 1, city: "Chicago", region: "Illinois", country: "US", driveMinutes: 135, weight: 1 }, { id: 2, propertyId: 1, city: "Detroit", region: "Michigan", country: "US", driveMinutes: 170, weight: 1 }]);
  const b = (id: number, on: string, source: "direct_autumn" | "direct_other" | "ota", cents: number, campaignId: number | null, market: number, hour = 20, lead = 10, device: "mobile" | "desktop" | "tablet" = "mobile") => ({
    id, propertyId: 1, bookedAt: new Date(`${on}T${String(hour).padStart(2, "0")}:00:00Z`), bookedOn: on, checkIn: on, checkOut: on, nights: 2, roomRevenueCents: cents, source, campaignId, feederMarketId: market, device, leadTimeDays: lead,
  });
  await db.insert(bookings).values([
    // current: autumn 3 bookings = 100000 + 50000 + 30000 = 180000; direct_other 1; ota 2 → total 6, direct share 4/6
    b(1, "2026-09-02", "direct_autumn", 100000, 1, 1), b(2, "2026-09-05", "direct_autumn", 50000, 2, 1, 12, 40, "desktop"), b(3, "2026-09-09", "direct_autumn", 30000, 2, 2, 9, 3),
    b(4, "2026-09-03", "direct_other", 40000, null, 2), b(5, "2026-09-04", "ota", 60000, null, 1), b(6, "2026-09-10", "ota", 70000, null, 2),
    // previous: autumn 1 = 90000; ota 1
    b(7, "2026-08-25", "direct_autumn", 90000, 1, 1), b(8, "2026-08-28", "ota", 50000, null, 1),
    // last year: autumn 2 = 20000 + 20000
    b(9, "2025-09-03", "direct_autumn", 20000, 1, 1), b(10, "2025-09-08", "direct_autumn", 20000, 2, 1),
    // outside every window
    b(11, "2026-08-21", "direct_autumn", 999999, 1, 1), b(12, "2026-09-11", "direct_autumn", 999999, 1, 1),
  ]);
  await db.insert(dailyCampaignMetrics).values([
    { id: 1, date: "2026-09-02", campaignId: 1, device: "mobile", impressions: 1000, clicks: 100, spendCents: 0, bookings: 1, bookingValueCents: 100000 },
    { id: 2, date: "2026-09-05", campaignId: 2, device: "desktop", impressions: 4000, clicks: 200, spendCents: 0, bookings: 1, bookingValueCents: 50000 },
    { id: 3, date: "2026-08-25", campaignId: 1, device: "mobile", impressions: 500, clicks: 50, spendCents: 0, bookings: 1, bookingValueCents: 90000 },
    { id: 4, date: "2026-09-11", campaignId: 1, device: "mobile", impressions: 99999, clicks: 9999, spendCents: 0, bookings: 0, bookingValueCents: 0 },
  ]);
  await db.insert(dailySiteTraffic).values([
    { id: 1, date: "2026-09-02", propertyId: 1, channel: "organic_search", device: "mobile", sessions: 120, newVisitors: 80, pageviews: 300, engagedSessions: 70 },
    { id: 2, date: "2026-09-06", propertyId: 1, channel: "paid_search", device: "desktop", sessions: 30, newVisitors: 20, pageviews: 60, engagedSessions: 15 },
    { id: 3, date: "2026-08-30", propertyId: 1, channel: "direct", device: "mobile", sessions: 40, newVisitors: 10, pageviews: 90, engagedSessions: 20 },
  ]);
  await db.insert(insights).values([
    { id: 1, propertyId: 1, periodStart: "2026-09-01", periodEnd: "2026-09-30", kind: "win", title: "Sep win", body: "b", linkAnchor: "mix", sort: 1 },
    { id: 2, propertyId: 1, periodStart: "2026-08-01", periodEnd: "2026-08-31", kind: "watch", title: "Aug watch", body: "b", linkAnchor: null, sort: 1 },
    { id: 3, propertyId: 1, periodStart: "2026-06-01", periodEnd: "2026-06-30", kind: "win", title: "Jun old", body: "b", linkAnchor: null, sort: 1 },
  ]);
}

export const FIXTURE_RANGE = {
  preset: "30d" as const, from: "2026-09-01", to: "2026-09-10", days: 10, granularity: "day" as const, label: "Test",
  comparison: { prevFrom: "2026-08-22", prevTo: "2026-08-31", prevLabel: "prev", lastYearFrom: "2025-09-01", lastYearTo: "2025-09-10", lastYearLabel: "ly" },
};
```

- [ ] **Step 2: Failing overview tests**

```ts
// tests/queries/overview.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { makeTestDb, type TestDb } from "./setup";
import { loadFixture, FIXTURE_RANGE } from "./fixture";
import { getDataBounds } from "@/lib/db/queries/meta";
import { getOverview, getTrend, getInsights, getSourcePreview } from "@/lib/db/queries/overview";

let db: TestDb; let close: () => Promise<void>;
beforeAll(async () => { ({ db, close } = await makeTestDb()); await loadFixture(db); });
afterAll(() => close());

describe("meta", () => {
  it("returns data bounds from bookings and the property", async () => {
    const m = await getDataBounds(db);
    expect(m).toMatchObject({ min: "2025-09-03", max: "2026-09-11", property: { name: "Test Inn", feeRateBps: 1500 } });
  });
});

describe("getOverview", () => {
  it("computes totals, fee, net and share by hand-checked values", async () => {
    const o = await getOverview(db, FIXTURE_RANGE, 1500);
    expect(o.current).toMatchObject({ autumnBookings: 3, autumnValueCents: 180000, feeCents: 27000, netCents: 153000, directBookings: 4, otaBookings: 2, totalBookings: 6, impressions: 5000, clicks: 300, siteVisits: 150 });
    expect(o.current.directShare).toBeCloseTo(4 / 6, 5);
    expect(o.previous).toMatchObject({ autumnBookings: 1, autumnValueCents: 90000, totalBookings: 2 });
    expect(o.lastYear).toMatchObject({ autumnBookings: 2, autumnValueCents: 40000 });
    expect(o.costPerBookingCents).toBe(9000);                 // 27000 / 3
    expect(o.otaCommissionPerBookingCents).toBe(10800);       // 18% of 180000 / 3
    expect(o.commissionAvoidedCents).toBe(Math.round(0.18 * 220000)); // direct value 180000 + 40000
  });
});

describe("getTrend", () => {
  it("returns one point per day with aligned comparisons", async () => {
    const t = await getTrend(db, FIXTURE_RANGE, "booking_value");
    expect(t).toHaveLength(10);
    expect(t[1]).toEqual({ bucket: "2026-09-02", current: 100000, previous: 0, lastYear: 0 });
    expect(t[2]).toMatchObject({ bucket: "2026-09-03", lastYear: 20000 });      // 2025-09-03 aligns to index 2
    expect(t[3]).toMatchObject({ bucket: "2026-09-04", previous: 90000 });      // 2026-08-25 is index 3 of prev window
    const v = await getTrend(db, FIXTURE_RANGE, "site_visits");
    expect(v[1].current).toBe(120); expect(v[5].current).toBe(30);
  });
});

describe("getInsights", () => {
  it("returns insights whose period overlaps the range, newest first, limited", async () => {
    const i = await getInsights(db, FIXTURE_RANGE, 5);
    expect(i.map((x) => x.title)).toEqual(["Sep win"]);
    const wide = await getInsights(db, { ...FIXTURE_RANGE, from: "2026-08-01" }, 1);
    expect(wide.map((x) => x.title)).toEqual(["Sep win"]);
  });
});

describe("getSourcePreview", () => {
  it("ranks markets and campaigns by Autumn bookings with shares", async () => {
    const p = await getSourcePreview(db, FIXTURE_RANGE);
    expect(p.markets[0]).toMatchObject({ city: "Chicago", bookings: 2 }); expect(p.markets[0].share).toBeCloseTo(2 / 3, 5);
    expect(p.campaigns[0]).toMatchObject({ category: "discovery", bookings: 2 });
  });
});
```
Run: `npx vitest run tests/queries/overview.test.ts` — Expected: FAIL, modules missing.

- [ ] **Step 3: Implement meta and overview**

```ts
// src/lib/db/queries/types.ts
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import type { schema } from "../schema";
export type AnyDb = NeonHttpDatabase<typeof schema> | PgliteDatabase<typeof schema>;
export const OTA_COMMISSION_RATE = 0.18;
```

```ts
// src/lib/db/queries/meta.ts
import { sql } from "drizzle-orm";
import type { AnyDb } from "./types";

export async function getDataBounds(db: AnyDb) {
  const r = await db.execute(sql`
    select (select min(booked_on)::text from bookings) as min, (select max(booked_on)::text from bookings) as max,
           p.name, p.city, p.region, p.fee_rate_bps as "feeRateBps", p.autumn_start_date::text as "autumnStartDate"
    from properties p limit 1`);
  const row = r.rows[0] as { min: string; max: string; name: string; city: string; region: string; feeRateBps: number; autumnStartDate: string };
  return { min: row.min, max: row.max, property: { name: row.name, city: row.city, region: row.region, feeRateBps: Number(row.feeRateBps), autumnStartDate: row.autumnStartDate } };
}
```

```ts
// src/lib/db/queries/overview.ts
import { sql } from "drizzle-orm";
import type { AnyDb } from "./types";
import { OTA_COMMISSION_RATE } from "./types";
import type { DateRange, Granularity } from "@/lib/date-range";
import { addDays } from "@/lib/date-range";
import type { CampaignCategory, InsightKind } from "../schema";

export interface PeriodTotals { autumnBookings: number; autumnValueCents: number; feeCents: number; netCents: number; directBookings: number; otaBookings: number; totalBookings: number; directShare: number; impressions: number; clicks: number; siteVisits: number }
export interface OverviewDto { current: PeriodTotals; previous: PeriodTotals | null; lastYear: PeriodTotals | null; feeRateBps: number; costPerBookingCents: number | null; otaCommissionPerBookingCents: number | null; commissionAvoidedCents: number }

const n = (v: unknown) => Number(v ?? 0);

async function periodTotals(db: AnyDb, from: string, to: string, feeRateBps: number): Promise<PeriodTotals> {
  const [bk, cm, tr] = await Promise.all([
    db.execute(sql`select
        count(*) filter (where source = 'direct_autumn') as autumn_bookings,
        coalesce(sum(room_revenue_cents) filter (where source = 'direct_autumn'), 0) as autumn_value,
        count(*) filter (where source <> 'ota') as direct_bookings,
        count(*) filter (where source = 'ota') as ota_bookings,
        count(*) as total
      from bookings where booked_on between ${from} and ${to}`),
    db.execute(sql`select coalesce(sum(impressions),0) as impressions, coalesce(sum(clicks),0) as clicks from daily_campaign_metrics where date between ${from} and ${to}`),
    db.execute(sql`select coalesce(sum(sessions),0) as sessions from daily_site_traffic where date between ${from} and ${to}`),
  ]);
  const b = bk.rows[0] as Record<string, unknown>, c = cm.rows[0] as Record<string, unknown>, t = tr.rows[0] as Record<string, unknown>;
  const autumnValueCents = n(b.autumn_value); const feeCents = Math.round((autumnValueCents * feeRateBps) / 10000); const total = n(b.total);
  return { autumnBookings: n(b.autumn_bookings), autumnValueCents, feeCents, netCents: autumnValueCents - feeCents, directBookings: n(b.direct_bookings), otaBookings: n(b.ota_bookings), totalBookings: total, directShare: total ? n(b.direct_bookings) / total : 0, impressions: n(c.impressions), clicks: n(c.clicks), siteVisits: n(t.sessions) };
}

export async function getOverview(db: AnyDb, range: DateRange, feeRateBps: number): Promise<OverviewDto> {
  const c = range.comparison;
  const [current, previous, lastYear, directValue] = await Promise.all([
    periodTotals(db, range.from, range.to, feeRateBps),
    c ? periodTotals(db, c.prevFrom, c.prevTo, feeRateBps) : null,
    c ? periodTotals(db, c.lastYearFrom, c.lastYearTo, feeRateBps) : null,
    db.execute(sql`select coalesce(sum(room_revenue_cents),0) as v from bookings where source <> 'ota' and booked_on between ${range.from} and ${range.to}`),
  ]);
  const ab = current.autumnBookings;
  return {
    current, previous, lastYear, feeRateBps,
    costPerBookingCents: ab ? Math.round(current.feeCents / ab) : null,
    otaCommissionPerBookingCents: ab ? Math.round((current.autumnValueCents * OTA_COMMISSION_RATE) / ab) : null,
    commissionAvoidedCents: Math.round(n((directValue.rows[0] as Record<string, unknown>).v) * OTA_COMMISSION_RATE),
  };
}

export type TrendMetric = "booking_value" | "direct_bookings" | "site_visits";
export interface TrendPoint { bucket: string; current: number; previous: number | null; lastYear: number | null }

function bucketStarts(from: string, to: string, g: Granularity): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; ) { out.push(d); d = g === "day" ? addDays(d, 1) : g === "week" ? addDays(d, 7) : addDays(`${d.slice(0, 7)}-01`, 32).slice(0, 7) + "-01"; }
  return out;
}

async function series(db: AnyDb, from: string, to: string, g: Granularity, metric: TrendMetric): Promise<number[]> {
  const starts = bucketStarts(from, to, g);
  const src = metric === "site_visits"
    ? sql`select date as d, sessions as v from daily_site_traffic where date between ${from} and ${to}`
    : metric === "booking_value"
      ? sql`select booked_on as d, room_revenue_cents as v from bookings where source = 'direct_autumn' and booked_on between ${from} and ${to}`
      : sql`select booked_on as d, 1 as v from bookings where source <> 'ota' and booked_on between ${from} and ${to}`;
  const r = await db.execute(sql`select d::text as d, sum(v) as v from (${src}) x group by d`);
  const byDay = new Map((r.rows as { d: string; v: unknown }[]).map((row) => [row.d, n(row.v)]));
  return starts.map((s, i) => { const end = i + 1 < starts.length ? addDays(starts[i + 1], -1) : to; let sum = 0; for (let d = s; d <= end; d = addDays(d, 1)) sum += byDay.get(d) ?? 0; return sum; });
}

export async function getTrend(db: AnyDb, range: DateRange, metric: TrendMetric): Promise<TrendPoint[]> {
  const g = range.granularity; const c = range.comparison;
  const [cur, prev, ly] = await Promise.all([
    series(db, range.from, range.to, g, metric),
    c ? series(db, c.prevFrom, c.prevTo, g, metric) : null,
    c ? series(db, c.lastYearFrom, c.lastYearTo, g, metric) : null,
  ]);
  return bucketStarts(range.from, range.to, g).map((bucket, i) => ({ bucket, current: cur[i], previous: prev ? prev[i] ?? 0 : null, lastYear: ly ? ly[i] ?? 0 : null }));
}

export interface InsightDto { id: number; kind: InsightKind; title: string; body: string; linkAnchor: string | null; periodEnd: string }
export async function getInsights(db: AnyDb, range: DateRange, limit = 5): Promise<InsightDto[]> {
  const r = await db.execute(sql`select id, kind, title, body, link_anchor as "linkAnchor", period_end::text as "periodEnd" from insights
    where period_start <= ${range.to} and period_end >= ${range.from} order by period_end desc, sort asc limit ${limit}`);
  return r.rows as unknown as InsightDto[];
}

export interface SourcePreviewDto { markets: { city: string; region: string; bookings: number; share: number }[]; campaigns: { category: CampaignCategory; bookings: number; share: number }[] }
export async function getSourcePreview(db: AnyDb, range: DateRange): Promise<SourcePreviewDto> {
  const [m, c] = await Promise.all([
    db.execute(sql`select f.city, f.region, count(*) as bookings from bookings b join feeder_markets f on f.id = b.feeder_market_id
      where b.source = 'direct_autumn' and b.booked_on between ${range.from} and ${range.to} group by f.id, f.city, f.region order by bookings desc, f.city limit 3`),
    db.execute(sql`select c.category, count(*) as bookings from bookings b join campaigns c on c.id = b.campaign_id
      where b.source = 'direct_autumn' and b.booked_on between ${range.from} and ${range.to} group by c.category order by bookings desc`),
  ]);
  const total = (await db.execute(sql`select count(*) as t from bookings where source = 'direct_autumn' and booked_on between ${range.from} and ${range.to}`)).rows[0] as { t: unknown };
  const t = n(total.t) || 1;
  return {
    markets: (m.rows as { city: string; region: string; bookings: unknown }[]).map((r) => ({ city: r.city, region: r.region, bookings: n(r.bookings), share: n(r.bookings) / t })),
    campaigns: (c.rows as { category: CampaignCategory; bookings: unknown }[]).map((r) => ({ category: r.category, bookings: n(r.bookings), share: n(r.bookings) / t })),
  };
}
```
Note on `series`: aggregation to buckets happens in TypeScript over a per-day map rather than `date_trunc`, so week buckets start on the range's first day (the owner's "last 90 days" should not begin mid-week on a Monday boundary). Row counts per query stay ≤ 730, so this is cheap.

- [ ] **Step 4: Run green; negative control**

Run: `npx vitest run tests/queries/overview.test.ts` — Expected: 6 passed.
Negative control: temporarily change `source <> 'ota'` to `true` in `periodTotals`, run, see `directShare` fail, restore. Name it in the commit.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/queries tests/queries
git commit -m "Add overview queries returning typed DTOs with hand-checked tests

Fee and net computed once, in the query; comparisons aligned by bucket index.
Negative control: dropping the source filter reddens directShare (restored).
Gates: PGlite tests 6 passed; typecheck 0; lint 0.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Query layer — bookings detail

**Files:**
- Create: `src/lib/db/queries/bookings.ts`
- Test: `tests/queries/bookings.test.ts`

**Interfaces:**
- Consumes: `AnyDb`, `DateRange`, fixture from Task 6.
- Produces:
  - `interface SourceMixPoint { bucket: string; directAutumn: number; directOther: number; ota: number }`; `interface SourceMixDto { points: SourceMixPoint[]; commissionAvoidedCents: number; directShare: number }`; `getSourceMix(db, range): Promise<SourceMixDto>`
  - `interface CampaignRow { category: CampaignCategory; impressions: number; clicks: number; bookings: number; valueCents: number; feeCents: number; ctr: number }`; `getCampaignBreakdown(db, range, feeRateBps): Promise<CampaignRow[]>`
  - `interface FeederMarketRow { city: string; region: string; driveMinutes: number | null; bookings: number; valueCents: number; share: number }`; `getFeederMarkets(db, range): Promise<FeederMarketRow[]>`
  - `interface GuestBehaviourDto { device: { key: Device; label: string; count: number }[]; leadTime: { label: string; count: number }[]; hour: { label: string; count: number }[] }`; `getGuestBehaviour(db, range): Promise<GuestBehaviourDto>`
  - `interface RecentBookingRow { id: number; bookedOn: string; checkIn: string; nights: number; market: string; source: BookingSource; category: CampaignCategory | null; valueCents: number }`; `getRecentBookings(db, range, limit = 10): Promise<RecentBookingRow[]>`

- [ ] **Step 1: Failing tests**

```ts
// tests/queries/bookings.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { makeTestDb, type TestDb } from "./setup";
import { loadFixture, FIXTURE_RANGE } from "./fixture";
import { getSourceMix, getCampaignBreakdown, getFeederMarkets, getGuestBehaviour, getRecentBookings } from "@/lib/db/queries/bookings";

let db: TestDb; let close: () => Promise<void>;
beforeAll(async () => { ({ db, close } = await makeTestDb()); await loadFixture(db); });
afterAll(() => close());

describe("bookings queries", () => {
  it("source mix per bucket and commission avoided", async () => {
    const m = await getSourceMix(db, FIXTURE_RANGE);
    expect(m.points).toHaveLength(10);
    expect(m.points[1]).toEqual({ bucket: "2026-09-02", directAutumn: 1, directOther: 0, ota: 0 });
    expect(m.points[3]).toEqual({ bucket: "2026-09-04", directAutumn: 0, directOther: 0, ota: 1 });
    expect(m.directShare).toBeCloseTo(4 / 6, 5);
    expect(m.commissionAvoidedCents).toBe(Math.round(0.18 * 220000));
  });
  it("campaign breakdown with fee and ctr", async () => {
    const rows = await getCampaignBreakdown(db, FIXTURE_RANGE, 1500);
    const d = rows.find((r) => r.category === "discovery")!;
    expect(d).toMatchObject({ impressions: 4000, clicks: 200, bookings: 2, valueCents: 80000, feeCents: 12000 });
    expect(d.ctr).toBeCloseTo(0.05, 5);
    expect(rows.find((r) => r.category === "brand_protection")).toMatchObject({ bookings: 1, valueCents: 100000, impressions: 1000 });
  });
  it("feeder markets ranked with share of Autumn bookings", async () => {
    const m = await getFeederMarkets(db, FIXTURE_RANGE);
    expect(m[0]).toMatchObject({ city: "Chicago", bookings: 2, valueCents: 150000, driveMinutes: 135 });
    expect(m[0].share).toBeCloseTo(2 / 3, 5);
    expect(m[1]).toMatchObject({ city: "Detroit", bookings: 1 });
  });
  it("guest behaviour buckets", async () => {
    const g = await getGuestBehaviour(db, FIXTURE_RANGE);
    expect(g.device.find((d) => d.key === "mobile")?.count).toBe(2);
    expect(g.leadTime.map((l) => l.count)).toEqual([1, 1, 1, 0]);   // 3 days, 10 days, 40 days
    expect(g.hour.map((h) => h.count)).toEqual([0, 1, 1, 1]);        // 09, 12, 20 → morning, afternoon, evening
  });
  it("recent bookings newest first, direct only", async () => {
    const r = await getRecentBookings(db, FIXTURE_RANGE, 3);
    expect(r.map((x) => x.id)).toEqual([3, 2, 4]);
    expect(r[0]).toMatchObject({ market: "Detroit", category: "discovery", valueCents: 30000 });
  });
});
```
Run: `npx vitest run tests/queries/bookings.test.ts` — Expected: FAIL.

- [ ] **Step 2: Implement**

```ts
// src/lib/db/queries/bookings.ts
import { sql } from "drizzle-orm";
import type { AnyDb } from "./types";
import { OTA_COMMISSION_RATE } from "./types";
import type { DateRange, Granularity } from "@/lib/date-range";
import { addDays } from "@/lib/date-range";
import type { BookingSource, CampaignCategory, Device } from "../schema";

const n = (v: unknown) => Number(v ?? 0);
function bucketStarts(from: string, to: string, g: Granularity): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; ) { out.push(d); d = g === "day" ? addDays(d, 1) : g === "week" ? addDays(d, 7) : addDays(`${d.slice(0, 7)}-01`, 32).slice(0, 7) + "-01"; }
  return out;
}

export interface SourceMixPoint { bucket: string; directAutumn: number; directOther: number; ota: number }
export interface SourceMixDto { points: SourceMixPoint[]; commissionAvoidedCents: number; directShare: number }
export async function getSourceMix(db: AnyDb, range: DateRange): Promise<SourceMixDto> {
  const r = await db.execute(sql`select booked_on::text as d, source, count(*) as c, sum(room_revenue_cents) as v from bookings where booked_on between ${range.from} and ${range.to} group by booked_on, source`);
  const rows = r.rows as { d: string; source: BookingSource; c: unknown; v: unknown }[];
  const starts = bucketStarts(range.from, range.to, range.granularity);
  const points = starts.map((s, i) => { const end = i + 1 < starts.length ? addDays(starts[i + 1], -1) : range.to; const p = { bucket: s, directAutumn: 0, directOther: 0, ota: 0 }; for (const row of rows) if (row.d >= s && row.d <= end) { if (row.source === "direct_autumn") p.directAutumn += n(row.c); else if (row.source === "direct_other") p.directOther += n(row.c); else p.ota += n(row.c); } return p; });
  const total = rows.reduce((s, r) => s + n(r.c), 0); const direct = rows.filter((r) => r.source !== "ota");
  return { points, directShare: total ? direct.reduce((s, r) => s + n(r.c), 0) / total : 0, commissionAvoidedCents: Math.round(direct.reduce((s, r) => s + n(r.v), 0) * OTA_COMMISSION_RATE) };
}

export interface CampaignRow { category: CampaignCategory; impressions: number; clicks: number; bookings: number; valueCents: number; feeCents: number; ctr: number }
export async function getCampaignBreakdown(db: AnyDb, range: DateRange, feeRateBps: number): Promise<CampaignRow[]> {
  const r = await db.execute(sql`
    select c.category,
      coalesce((select sum(m.impressions) from daily_campaign_metrics m where m.campaign_id = c.id and m.date between ${range.from} and ${range.to}), 0) as impressions,
      coalesce((select sum(m.clicks) from daily_campaign_metrics m where m.campaign_id = c.id and m.date between ${range.from} and ${range.to}), 0) as clicks,
      (select count(*) from bookings b where b.campaign_id = c.id and b.source = 'direct_autumn' and b.booked_on between ${range.from} and ${range.to}) as bookings,
      coalesce((select sum(b.room_revenue_cents) from bookings b where b.campaign_id = c.id and b.source = 'direct_autumn' and b.booked_on between ${range.from} and ${range.to}), 0) as value
    from campaigns c order by bookings desc, value desc`);
  return (r.rows as { category: CampaignCategory; impressions: unknown; clicks: unknown; bookings: unknown; value: unknown }[]).map((row) => {
    const valueCents = n(row.value); const impressions = n(row.impressions); const clicks = n(row.clicks);
    return { category: row.category, impressions, clicks, bookings: n(row.bookings), valueCents, feeCents: Math.round((valueCents * feeRateBps) / 10000), ctr: impressions ? clicks / impressions : 0 };
  });
}

export interface FeederMarketRow { city: string; region: string; driveMinutes: number | null; bookings: number; valueCents: number; share: number }
export async function getFeederMarkets(db: AnyDb, range: DateRange): Promise<FeederMarketRow[]> {
  const r = await db.execute(sql`select f.city, f.region, f.drive_minutes as dm, count(*) as bookings, sum(b.room_revenue_cents) as value
    from bookings b join feeder_markets f on f.id = b.feeder_market_id where b.source = 'direct_autumn' and b.booked_on between ${range.from} and ${range.to}
    group by f.id, f.city, f.region, f.drive_minutes order by bookings desc, value desc`);
  const rows = r.rows as { city: string; region: string; dm: number | null; bookings: unknown; value: unknown }[];
  const total = rows.reduce((s, x) => s + n(x.bookings), 0) || 1;
  return rows.map((x) => ({ city: x.city, region: x.region, driveMinutes: x.dm === null ? null : Number(x.dm), bookings: n(x.bookings), valueCents: n(x.value), share: n(x.bookings) / total }));
}

export interface GuestBehaviourDto { device: { key: Device; label: string; count: number }[]; leadTime: { label: string; count: number }[]; hour: { label: string; count: number }[] }
const DEVICE_LABELS: Record<Device, string> = { mobile: "Phone", desktop: "Computer", tablet: "Tablet" };
export async function getGuestBehaviour(db: AnyDb, range: DateRange): Promise<GuestBehaviourDto> {
  const r = await db.execute(sql`select device, lead_time_days as lead, extract(hour from booked_at at time zone 'UTC')::int as h from bookings where source = 'direct_autumn' and booked_on between ${range.from} and ${range.to}`);
  const rows = r.rows as { device: Device; lead: number; h: number }[];
  const device = (["mobile", "desktop", "tablet"] as Device[]).map((key) => ({ key, label: DEVICE_LABELS[key], count: rows.filter((x) => x.device === key).length }));
  const leadBuckets = [["Within a week", 0, 7], ["1–4 weeks", 8, 30], ["1–3 months", 31, 90], ["3+ months", 91, 9999]] as const;
  const leadTime = leadBuckets.map(([label, lo, hi]) => ({ label, count: rows.filter((x) => Number(x.lead) >= lo && Number(x.lead) <= hi).length }));
  const hourBands = [["Overnight (12–6am)", 0, 5], ["Morning (6am–12pm)", 6, 11], ["Afternoon (12–6pm)", 12, 17], ["Evening (6pm–12am)", 18, 23]] as const;
  const hour = hourBands.map(([label, lo, hi]) => ({ label, count: rows.filter((x) => Number(x.h) >= lo && Number(x.h) <= hi).length }));
  return { device, leadTime, hour };
}

export interface RecentBookingRow { id: number; bookedOn: string; checkIn: string; nights: number; market: string; source: BookingSource; category: CampaignCategory | null; valueCents: number }
export async function getRecentBookings(db: AnyDb, range: DateRange, limit = 10): Promise<RecentBookingRow[]> {
  const r = await db.execute(sql`select b.id, b.booked_on::text as "bookedOn", b.check_in::text as "checkIn", b.nights, f.city as market, b.source, c.category, b.room_revenue_cents as "valueCents"
    from bookings b join feeder_markets f on f.id = b.feeder_market_id left join campaigns c on c.id = b.campaign_id
    where b.source <> 'ota' and b.booked_on between ${range.from} and ${range.to} order by b.booked_at desc limit ${limit}`);
  return (r.rows as RecentBookingRow[]).map((x) => ({ ...x, nights: Number(x.nights), valueCents: Number(x.valueCents) }));
}
```
Seeded `booked_at` values carry `-04:00`; the hour band query uses `at time zone 'UTC'` in the test fixture (which inserts `Z` times) — for production, change to `at time zone 'America/Detroit'` and add a fixture row proving it. Do that now: in the fixture use `T13:00:00-04:00` for booking 3's 9 am local, and in the query use the property's timezone literal `'America/Detroit'`. The expectation `[0,1,1,1]` still holds.

- [ ] **Step 3: Run green, commit**

Run: `npx vitest run tests/queries` — Expected: all bookings + overview + schema tests pass (13).

```bash
git add src/lib/db/queries/bookings.ts tests/queries
git commit -m "Add bookings-detail queries: mix, campaigns, markets, guests, recent

Hour bands resolve in the property's timezone; proven by a fixture row.
Gates: PGlite tests 13 passed; typecheck 0; lint 0.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Component library foundation — layout, copy, charts

**Files:**
- Create: `src/components/layout/{app-shell,top-nav,date-range-control,page-header,section,index}.tsx`, `src/components/copy/{metric-label,delta-text,index}.tsx`, `src/components/charts/{config,chart-frame,formatters,index}.ts(x)`
- Test: `tests/components/delta-text.test.tsx`

**Interfaces:**
- Consumes: `glossary`, `DateRange`, `RangePreset`, `delta`, `deltaText`, `moneyCompact`, `compact`, `bucketLabel`.
- Produces:
  - `<AppShell property={{ name; city; region }} dataThrough={iso} range={DateRange}>{children}</AppShell>` — header + nav + range control + main container.
  - `<TopNav active="overview" | "bookings" range={preset} />` — links preserve `?range=`.
  - `<DateRangeControl value={RangePreset} />` (client) — `Select` on mobile, segmented buttons ≥ md; pushes `?range=`.
  - `<PageHeader title subtitle? aside? />`, `<Section id? title? description? action?>{children}</Section>`.
  - `<MetricLabel k={GlossaryKey} as?="span" | "h3" />` — label text with a tooltip carrying `meaning` (and `industryTerm` in muted parentheses).
  - `<DeltaText current previous vsLabel />` — coloured sentence fragment: positive sage, negative terracotta, flat muted; renders nothing when `previous` is null or 0.
  - `chartConfig: ChartConfig` keys `current`, `previous`, `lastYear`, `directAutumn`, `directOther`, `ota` mapped to `var(--chart-n)`; `<ChartFrame title summary height?>{children}</ChartFrame>` wraps `ChartContainer` and renders a visually-hidden text `summary`; `axisMoney`, `axisCompact`, `axisBucket(g)` formatters.

- [ ] **Step 1: Failing test for DeltaText**

```tsx
// tests/components/delta-text.test.tsx
// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DeltaText } from "@/components/copy";

describe("DeltaText", () => {
  it("renders a signed sentence and a direction class", () => {
    render(<DeltaText current={118} previous={100} vsLabel="the previous 30 days" />);
    const el = screen.getByText("+18% vs the previous 30 days");
    expect(el.className).toContain("text-positive");
  });
  it("renders nothing when there is no baseline", () => {
    const { container } = render(<DeltaText current={5} previous={0} vsLabel="last year" />);
    expect(container).toBeEmptyDOMElement();
  });
});
```
Run: `npx vitest run tests/components/delta-text.test.tsx` — Expected: FAIL.

- [ ] **Step 2: Copy components**

```tsx
// src/components/copy/delta-text.tsx
import { delta, deltaText } from "@/lib/format";
import { cn } from "@/lib/utils";

export function DeltaText({ current, previous, vsLabel, className }: { current: number; previous: number | null; vsLabel: string; className?: string }) {
  const text = deltaText(current, previous, vsLabel);
  if (!text) return null;
  const d = delta(current, previous).direction;
  return <span className={cn("text-sm", d === "up" ? "text-positive" : d === "down" ? "text-negative" : "text-muted-foreground", className)}>{text}</span>;
}
```

```tsx
// src/components/copy/metric-label.tsx
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { glossary, type GlossaryKey } from "@/lib/glossary";
import { cn } from "@/lib/utils";

export function MetricLabel({ k, as: Tag = "span", className }: { k: GlossaryKey; as?: "span" | "h3" | "th"; className?: string }) {
  const e = glossary[k];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Tag className={cn("cursor-help underline decoration-dotted decoration-muted-foreground/60 underline-offset-4", className)}>{e.label}</Tag>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-left leading-snug">
        <p>{e.meaning}</p>
        {e.industryTerm ? <p className="mt-1 text-muted-foreground">Also called: {e.industryTerm}</p> : null}
      </TooltipContent>
    </Tooltip>
  );
}
```

```ts
// src/components/copy/index.ts
export { DeltaText } from "./delta-text";
export { MetricLabel } from "./metric-label";
```

- [ ] **Step 3: Layout components**

```tsx
// src/components/layout/date-range-control.tsx
"use client";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { RangePreset } from "@/lib/date-range";

const OPTIONS: { value: RangePreset; label: string }[] = [
  { value: "30d", label: "30 days" }, { value: "90d", label: "90 days" }, { value: "ytd", label: "This year" }, { value: "12m", label: "12 months" }, { value: "all", label: "All time" },
];

export function DateRangeControl({ value }: { value: RangePreset }) {
  const router = useRouter(); const pathname = usePathname(); const [pending, start] = useTransition();
  const go = (v: string) => start(() => router.push(`${pathname}?range=${v}`));
  return (
    <div aria-busy={pending} className={cn(pending && "opacity-70")}>
      <div className="md:hidden">
        <Select value={value} onValueChange={go}><SelectTrigger aria-label="Date range" className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>{OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
      </div>
      <div role="radiogroup" aria-label="Date range" className="hidden md:inline-flex rounded-full border bg-card p-1">
        {OPTIONS.map((o) => (
          <button key={o.value} role="radio" aria-checked={o.value === value} onClick={() => go(o.value)}
            className={cn("rounded-full px-3 py-1 text-sm transition-colors", o.value === value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}
```

```tsx
// src/components/layout/top-nav.tsx
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { RangePreset } from "@/lib/date-range";

export function TopNav({ active, range }: { active: "overview" | "bookings"; range: RangePreset }) {
  const items = [{ key: "overview", href: `/?range=${range}`, label: "Overview" }, { key: "bookings", href: `/bookings?range=${range}`, label: "Bookings" }] as const;
  return (
    <nav aria-label="Primary" className="flex gap-1">
      {items.map((i) => (
        <Link key={i.key} href={i.href} aria-current={i.key === active ? "page" : undefined}
          className={cn("rounded-full px-3 py-1.5 text-sm", i.key === active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground")}>{i.label}</Link>
      ))}
    </nav>
  );
}
```

```tsx
// src/components/layout/app-shell.tsx
import { TopNav } from "./top-nav";
import { DateRangeControl } from "./date-range-control";
import type { DateRange } from "@/lib/date-range";
import { longDate } from "@/lib/format";

export function AppShell({ property, dataThrough, range, active, children }: { property: { name: string; city: string; region: string }; dataThrough: string; range: DateRange; active: "overview" | "bookings"; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
      <header className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold tracking-tight">autumn</span>
          <div className="text-sm text-muted-foreground">{property.name} · {property.city}, {property.region}</div>
        </div>
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <TopNav active={active} range={range.preset} />
          <DateRangeControl value={range.preset} />
        </div>
      </header>
      <p className="mb-6 text-xs text-muted-foreground">{range.label} · data through {longDate(dataThrough)}</p>
      <main className="flex flex-col gap-8">{children}</main>
    </div>
  );
}
```

```tsx
// src/components/layout/page-header.tsx
export function PageHeader({ title, subtitle, aside }: { title: string; subtitle?: string; aside?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>{subtitle ? <p className="mt-1 max-w-prose text-muted-foreground">{subtitle}</p> : null}</div>
      {aside}
    </div>
  );
}
```

```tsx
// src/components/layout/section.tsx
export function Section({ id, title, description, action, children }: { id?: string; title?: string; description?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className="scroll-mt-24">
      {title ? (
        <div className="mb-3 flex items-end justify-between gap-4">
          <div><h2 id={id ? `${id}-title` : undefined} className="text-lg font-semibold tracking-tight">{title}</h2>{description ? <p className="text-sm text-muted-foreground">{description}</p> : null}</div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}
```

```ts
// src/components/layout/index.ts
export { AppShell } from "./app-shell";
export { TopNav } from "./top-nav";
export { DateRangeControl } from "./date-range-control";
export { PageHeader } from "./page-header";
export { Section } from "./section";
```

- [ ] **Step 4: Chart foundation**

```ts
// src/components/charts/config.ts
import type { ChartConfig } from "@/components/ui/chart";
export const chartConfig = {
  current: { label: "This period", color: "var(--chart-1)" },
  previous: { label: "Previous period", color: "var(--chart-4)" },
  lastYear: { label: "Last year", color: "var(--chart-5)" },
  directAutumn: { label: "Direct via Autumn", color: "var(--chart-1)" },
  directOther: { label: "Direct, other", color: "var(--chart-2)" },
  ota: { label: "Through an OTA", color: "var(--chart-3)" },
} satisfies ChartConfig;
```

```ts
// src/components/charts/formatters.ts
import { bucketLabel, compact, moneyCompact } from "@/lib/format";
import type { Granularity } from "@/lib/date-range";
export const axisMoney = (v: number) => moneyCompact(v);
export const axisCompact = (v: number) => compact(v);
export const axisBucket = (g: Granularity) => (v: string) => bucketLabel(v, g);
```

```tsx
// src/components/charts/chart-frame.tsx
import { ChartContainer } from "@/components/ui/chart";
import { chartConfig } from "./config";
import { cn } from "@/lib/utils";

export function ChartFrame({ title, summary, className, children }: { title: string; summary: string; className?: string; children: React.ComponentProps<typeof ChartContainer>["children"] }) {
  return (
    <figure>
      <figcaption className="sr-only">{title}. {summary}</figcaption>
      <ChartContainer config={chartConfig} className={cn("h-64 w-full", className)}>{children}</ChartContainer>
    </figure>
  );
}
```

```ts
// src/components/charts/index.ts
export { chartConfig } from "./config";
export { ChartFrame } from "./chart-frame";
export { axisMoney, axisCompact, axisBucket } from "./formatters";
```

- [ ] **Step 5: Green, then commit**

Run: `npm run typecheck && npm run lint && npm test` — Expected: delta-text 2 passed; totals re-measured.

```bash
git add src/components tests/components
git commit -m "Add layout, copy and chart foundations for the component library

Range control writes ?range= so both screens share it; MetricLabel is the
only place a metric definition is rendered. Gates: vitest passed; typecheck 0; lint 0.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Dashboard components

**Files:**
- Create: `src/components/dashboard/{headline-card,stat-tile,trend-chart,insight-list,source-preview,glossary,index}.tsx`
- Test: `tests/components/headline-card.test.tsx`, `tests/components/stat-tile.test.tsx`, `tests/components/insight-list.test.tsx`

**Interfaces:**
- Consumes: `OverviewDto`, `PeriodTotals`, `TrendPoint`, `TrendMetric`, `InsightDto`, `SourcePreviewDto`, `DateRange`, copy + chart components.
- Produces:
  - `<HeadlineCard overview={OverviewDto} range={DateRange} />`
  - `<StatTile k={GlossaryKey} value={string} meaning?: string sub?: React.ReactNode />`
  - `<StatTiles overview={OverviewDto} range={DateRange} />` — composes the three tiles from spec §3.3
  - `<TrendChart points={TrendPoint[]} metric={TrendMetric} range={DateRange} autumnStart={iso} />` (client) + `<TrendMetricTabs metric range />` (client, writes `?metric=`)
  - `<InsightList items={InsightDto[]} />`
  - `<SourcePreview data={SourcePreviewDto} range={DateRange} />`
  - `<Glossary keys={GlossaryKey[]} />`

- [ ] **Step 1: Failing tests**

```tsx
// tests/components/headline-card.test.tsx
// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HeadlineCard } from "@/components/dashboard";
import type { OverviewDto } from "@/lib/db/queries/overview";
import { parseRange } from "@/lib/date-range";

const totals = (over: Partial<OverviewDto["current"]> = {}) => ({ autumnBookings: 39, autumnValueCents: 1868500, feeCents: 280275, netCents: 1588225, directBookings: 60, otaBookings: 40, totalBookings: 100, directShare: 0.6, impressions: 6001, clicks: 1006, siteVisits: 5210, ...over });
const overview: OverviewDto = { current: totals(), previous: totals({ autumnValueCents: 1583475 }), lastYear: totals({ autumnValueCents: 1315845 }), feeRateBps: 1500, costPerBookingCents: 7186, otaCommissionPerBookingCents: 8624, commissionAvoidedCents: 500000 };

describe("HeadlineCard", () => {
  it("states bookings, value, net and both comparisons in words", () => {
    render(<TooltipProvider><HeadlineCard overview={overview} range={parseRange("30d", "2024-09-17", "2026-09-16")} /></TooltipProvider>);
    expect(screen.getByText(/39 direct bookings/)).toBeInTheDocument();
    expect(screen.getByText(/\$18,685/)).toBeInTheDocument();
    expect(screen.getByText(/\$15,882/)).toBeInTheDocument();
    expect(screen.getByText("+18% vs the previous 30 days")).toBeInTheDocument();
    expect(screen.getByText("+42% vs this time last year")).toBeInTheDocument();
  });
  it("handles zero bookings calmly", () => {
    render(<TooltipProvider><HeadlineCard overview={{ ...overview, current: totals({ autumnBookings: 0, autumnValueCents: 0, feeCents: 0, netCents: 0 }) }} range={parseRange("30d", "2024-09-17", "2026-09-16")} /></TooltipProvider>);
    expect(screen.getByText(/No direct bookings from Autumn yet/)).toBeInTheDocument();
  });
});
```

```tsx
// tests/components/stat-tile.test.tsx
// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StatTile } from "@/components/dashboard";

describe("StatTile", () => {
  it("shows the plain label, the value and the meaning", () => {
    render(<TooltipProvider><StatTile k="direct_share" value="48%" meaning="Nearly half of your bookings came direct." /></TooltipProvider>);
    expect(screen.getByText("Booked direct")).toBeInTheDocument();
    expect(screen.getByText("48%")).toBeInTheDocument();
    expect(screen.getByText("Nearly half of your bookings came direct.")).toBeInTheDocument();
  });
});
```

```tsx
// tests/components/insight-list.test.tsx
// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InsightList } from "@/components/dashboard";

describe("InsightList", () => {
  it("tags kinds in plain words and links anchors into /bookings", () => {
    render(<InsightList items={[
      { id: 1, kind: "win", title: "A win", body: "b", linkAnchor: "mix", periodEnd: "2026-09-16" },
      { id: 2, kind: "watch", title: "A watch", body: "b", linkAnchor: null, periodEnd: "2026-09-16" },
      { id: 3, kind: "action", title: "An action", body: "b", linkAnchor: "campaigns", periodEnd: "2026-09-16" },
    ]} range="30d" />);
    expect(screen.getByText("Win")).toBeInTheDocument();
    expect(screen.getByText("Worth watching")).toBeInTheDocument();
    expect(screen.getByText("Autumn is on it")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /A win/ })).toHaveAttribute("href", "/bookings?range=30d#mix");
  });
  it("answers explicitly when there is nothing", () => {
    render(<InsightList items={[]} range="30d" />);
    expect(screen.getByText(/Nothing needs your attention/)).toBeInTheDocument();
  });
});
```
Run: `npx vitest run tests/components` — Expected: new files FAIL.

- [ ] **Step 2: Implement**

```tsx
// src/components/dashboard/headline-card.tsx
import { Card, CardContent } from "@/components/ui/card";
import { DeltaText, MetricLabel } from "@/components/copy";
import { money } from "@/lib/format";
import type { OverviewDto } from "@/lib/db/queries/overview";
import type { DateRange } from "@/lib/date-range";

export function HeadlineCard({ overview, range }: { overview: OverviewDto; range: DateRange }) {
  const c = overview.current; const cmp = range.comparison;
  const sameBaseline = cmp && cmp.prevFrom === cmp.lastYearFrom;
  return (
    <Card className="border-0 bg-card shadow-sm">
      <CardContent className="p-6 sm:p-8">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Is Autumn working for you?</p>
        {c.autumnBookings === 0 ? (
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">No direct bookings from Autumn yet in this period.</h2>
        ) : (
          <h2 className="mt-3 text-2xl font-semibold leading-tight tracking-tight sm:text-4xl">
            Autumn brought you <span className="text-primary">{c.autumnBookings} direct bookings</span> worth <span className="text-primary">{money(c.autumnValueCents)}</span>.
          </h2>
        )}
        <p className="mt-3 text-lg text-muted-foreground">
          You kept <span className="font-semibold text-foreground">{money(c.netCents)}</span> after Autumn&apos;s fee of {money(c.feeCents)} ({overview.feeRateBps / 100}% of those bookings).
        </p>
        {cmp ? (
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1">
            <DeltaText current={c.autumnValueCents} previous={overview.previous?.autumnValueCents ?? null} vsLabel={cmp.prevLabel} />
            {!sameBaseline ? <DeltaText current={c.autumnValueCents} previous={overview.lastYear?.autumnValueCents ?? null} vsLabel={cmp.lastYearLabel} /> : null}
          </div>
        ) : null}
        <p className="mt-4 text-xs text-muted-foreground"><MetricLabel k="direct_bookings" /> · <MetricLabel k="autumn_fee" /> · <MetricLabel k="net_revenue" /></p>
      </CardContent>
    </Card>
  );
}
```

```tsx
// src/components/dashboard/stat-tile.tsx
import { Card, CardContent } from "@/components/ui/card";
import { MetricLabel } from "@/components/copy";
import type { GlossaryKey } from "@/lib/glossary";

export function StatTile({ k, value, meaning, sub }: { k: GlossaryKey; value: string; meaning?: string; sub?: React.ReactNode }) {
  return (
    <Card className="border-0 shadow-sm"><CardContent className="p-5">
      <MetricLabel k={k} as="h3" className="text-sm font-medium text-muted-foreground" />
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      {meaning ? <p className="mt-1 text-sm text-muted-foreground">{meaning}</p> : null}
      {sub ? <div className="mt-2">{sub}</div> : null}
    </CardContent></Card>
  );
}
```

```tsx
// src/components/dashboard/stat-tiles.tsx
import { StatTile } from "./stat-tile";
import { DeltaText } from "@/components/copy";
import { compact, money, pct } from "@/lib/format";
import type { OverviewDto } from "@/lib/db/queries/overview";
import type { DateRange } from "@/lib/date-range";

export function StatTiles({ overview, range }: { overview: OverviewDto; range: DateRange }) {
  const c = overview.current; const p = overview.previous; const vs = range.comparison?.prevLabel ?? "";
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatTile k="direct_share" value={pct(c.directShare)} meaning={`${c.directBookings} of ${c.totalBookings} bookings came direct instead of through an OTA.`} sub={<DeltaText current={c.directShare} previous={p?.directShare ?? null} vsLabel={vs} />} />
      <StatTile k="impressions" value={compact(c.impressions)} meaning={`${compact(c.clicks)} of them visited your website.`} sub={<DeltaText current={c.impressions} previous={p?.impressions ?? null} vsLabel={vs} />} />
      <StatTile k="cost_per_booking" value={overview.costPerBookingCents === null ? "—" : money(overview.costPerBookingCents)} meaning={overview.otaCommissionPerBookingCents === null ? "No Autumn bookings in this period." : `An OTA would have charged about ${money(overview.otaCommissionPerBookingCents)} per booking.`} />
    </div>
  );
}
```

```tsx
// src/components/dashboard/trend-chart.tsx
"use client";
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ChartFrame, axisBucket, axisCompact, axisMoney } from "@/components/charts";
import type { TrendMetric, TrendPoint } from "@/lib/db/queries/overview";
import type { DateRange } from "@/lib/date-range";
import { money, compact } from "@/lib/format";

const TITLES: Record<TrendMetric, string> = { booking_value: "Direct booking value from Autumn", direct_bookings: "Direct bookings", site_visits: "Website visits" };

export function TrendChart({ points, metric, range, autumnStart }: { points: TrendPoint[]; metric: TrendMetric; range: DateRange; autumnStart: string }) {
  const isMoney = metric === "booking_value";
  const fmt = isMoney ? money : (v: number) => compact(v);
  const total = points.reduce((s, p) => s + p.current, 0);
  const marker = points.find((p) => p.bucket >= autumnStart && (range.granularity !== "day" || p.bucket === autumnStart));
  return (
    <ChartFrame title={TITLES[metric]} summary={`${fmt(total)} over ${range.label.toLowerCase()}, shown by ${range.granularity}.`}>
      <AreaChart data={points} margin={{ left: 4, right: 12, top: 8 }}>
        <defs><linearGradient id="fillCurrent" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-current)" stopOpacity={0.25} /><stop offset="100%" stopColor="var(--color-current)" stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="bucket" tickFormatter={axisBucket(range.granularity)} tickLine={false} axisLine={false} minTickGap={32} />
        <YAxis tickFormatter={isMoney ? axisMoney : axisCompact} tickLine={false} axisLine={false} width={56} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => axisBucket(range.granularity)(String(v))} formatter={(v, name) => [fmt(Number(v)), " ", String(name)]} />} />
        {range.comparison ? <Area dataKey="lastYear" type="monotone" stroke="var(--color-lastYear)" fill="none" strokeDasharray="2 4" dot={false} /> : null}
        {range.comparison ? <Area dataKey="previous" type="monotone" stroke="var(--color-previous)" fill="none" strokeDasharray="6 4" dot={false} /> : null}
        <Area dataKey="current" type="monotone" stroke="var(--color-current)" fill="url(#fillCurrent)" strokeWidth={2} dot={false} />
        {marker && range.from <= autumnStart ? <ReferenceLine x={marker.bucket} stroke="var(--color-previous)" strokeDasharray="2 2" label={{ value: "Autumn started", position: "insideTopLeft", fontSize: 11 }} /> : null}
      </AreaChart>
    </ChartFrame>
  );
}
```

```tsx
// src/components/dashboard/trend-metric-tabs.tsx
"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TrendMetric } from "@/lib/db/queries/overview";

export function TrendMetricTabs({ metric }: { metric: TrendMetric }) {
  const router = useRouter(); const pathname = usePathname(); const sp = useSearchParams();
  return (
    <Tabs value={metric} onValueChange={(v) => { const p = new URLSearchParams(sp); p.set("metric", v); router.push(`${pathname}?${p}`); }}>
      <TabsList><TabsTrigger value="booking_value">Booking value</TabsTrigger><TabsTrigger value="direct_bookings">Direct bookings</TabsTrigger><TabsTrigger value="site_visits">Site visits</TabsTrigger></TabsList>
    </Tabs>
  );
}
```
`useSearchParams` needs a `<Suspense>` boundary around `TrendMetricTabs` in the page (Task 10).

```tsx
// src/components/dashboard/insight-list.tsx
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { InsightDto } from "@/lib/db/queries/overview";
import type { RangePreset } from "@/lib/date-range";
import { cn } from "@/lib/utils";

const KIND: Record<InsightDto["kind"], { label: string; className: string }> = {
  win: { label: "Win", className: "bg-primary/15 text-primary" },
  watch: { label: "Worth watching", className: "bg-watch/15 text-watch" },
  action: { label: "Autumn is on it", className: "bg-secondary text-foreground" },
};

export function InsightList({ items, range }: { items: InsightDto[]; range: RangePreset }) {
  if (items.length === 0) return <Card className="border-0 shadow-sm"><CardContent className="p-5 text-muted-foreground">Nothing needs your attention this period. Autumn is running your campaigns as usual.</CardContent></Card>;
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {items.map((i) => {
        const inner = (<>
          <Badge variant="secondary" className={cn("mb-2 border-0 font-medium", KIND[i.kind].className)}>{KIND[i.kind].label}</Badge>
          <p className="font-medium leading-snug">{i.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{i.body}</p>
        </>);
        return (
          <li key={i.id}>
            <Card className="h-full border-0 shadow-sm transition-shadow hover:shadow-md"><CardContent className="p-5">
              {i.linkAnchor ? <Link href={`/bookings?range=${range}#${i.linkAnchor}`} className="block">{inner}</Link> : inner}
            </CardContent></Card>
          </li>
        );
      })}
    </ul>
  );
}
```

```tsx
// src/components/dashboard/source-preview.tsx
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetricLabel } from "@/components/copy";
import { pct } from "@/lib/format";
import { glossary } from "@/lib/glossary";
import type { SourcePreviewDto } from "@/lib/db/queries/overview";
import type { RangePreset } from "@/lib/date-range";

function Meter({ share }: { share: number }) { return <div className="h-1.5 w-full rounded-full bg-secondary"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.round(share * 100)}%` }} /></div>; }

export function SourcePreview({ data, range }: { data: SourcePreviewDto; range: RangePreset }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="border-0 shadow-sm"><CardContent className="p-5">
        <h3 className="text-sm font-medium text-muted-foreground">Where guests came from</h3>
        <ul className="mt-3 space-y-3">{data.markets.map((m) => <li key={m.city}><div className="flex justify-between text-sm"><span>{m.city}{m.region ? `, ${m.region}` : ""}</span><span className="tabular-nums text-muted-foreground">{m.bookings} · {pct(m.share)}</span></div><Meter share={m.share} /></li>)}</ul>
      </CardContent></Card>
      <Card className="border-0 shadow-sm"><CardContent className="p-5">
        <h3 className="text-sm font-medium text-muted-foreground">Which ads brought them</h3>
        <ul className="mt-3 space-y-3">{data.campaigns.map((c) => <li key={c.category}><div className="flex justify-between text-sm"><MetricLabel k={c.category} /><span className="tabular-nums text-muted-foreground">{c.bookings} · {pct(c.share)}</span></div><Meter share={c.share} /></li>)}</ul>
        <Button asChild variant="link" className="mt-3 px-0"><Link href={`/bookings?range=${range}`}>See the full picture →</Link></Button>
      </CardContent></Card>
    </div>
  );
}
```

```tsx
// src/components/dashboard/glossary.tsx
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { glossary, type GlossaryKey } from "@/lib/glossary";

export function Glossary({ keys }: { keys: GlossaryKey[] }) {
  return (
    <Accordion type="single" collapsible className="rounded-xl bg-card px-5 shadow-sm">
      <AccordionItem value="glossary" className="border-0">
        <AccordionTrigger className="text-sm font-medium">Understand these numbers</AccordionTrigger>
        <AccordionContent><dl className="grid gap-3 sm:grid-cols-2">{keys.map((k) => <div key={k}><dt className="font-medium">{glossary[k].label}{glossary[k].industryTerm ? <span className="text-muted-foreground"> ({glossary[k].industryTerm})</span> : null}</dt><dd className="text-sm text-muted-foreground">{glossary[k].meaning}</dd></div>)}</dl></AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
```

```ts
// src/components/dashboard/index.ts
export { HeadlineCard } from "./headline-card";
export { StatTile } from "./stat-tile";
export { StatTiles } from "./stat-tiles";
export { TrendChart } from "./trend-chart";
export { TrendMetricTabs } from "./trend-metric-tabs";
export { InsightList } from "./insight-list";
export { SourcePreview } from "./source-preview";
export { Glossary } from "./glossary";
```

- [ ] **Step 3: Green, commit**

Run: `npm run typecheck && npm run lint && npm test` — Expected: component tests 5 passed in 4 files; totals re-measured.

```bash
git add src/components/dashboard tests/components
git commit -m "Add overview components: headline, tiles, trend, insights, preview, glossary

Headline states bookings, value, net and both comparisons as a sentence.
Gates: vitest passed; typecheck 0; lint 0.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Overview page composition, loading, error, not-found

**Files:**
- Create/replace: `src/app/page.tsx`, `src/app/loading.tsx`, `src/app/error.tsx`, `src/app/not-found.tsx`
- Delete: scaffold leftovers in `src/app/page.tsx` and `public/*.svg` that are unused

**Interfaces:**
- Consumes: everything above. `searchParams: Promise<{ range?: string; metric?: string }>`.

- [ ] **Step 1: Page**

```tsx
// src/app/page.tsx
import { Suspense } from "react";
import { db } from "@/lib/db/client";
import { getDataBounds } from "@/lib/db/queries/meta";
import { getInsights, getOverview, getSourcePreview, getTrend, type TrendMetric } from "@/lib/db/queries/overview";
import { parseRange } from "@/lib/date-range";
import { AppShell, PageHeader, Section } from "@/components/layout";
import { Glossary, HeadlineCard, InsightList, SourcePreview, StatTiles, TrendChart, TrendMetricTabs } from "@/components/dashboard";
import { Skeleton } from "@/components/ui/skeleton";

const METRICS: TrendMetric[] = ["booking_value", "direct_bookings", "site_visits"];

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ range?: string; metric?: string }> }) {
  const sp = await searchParams;
  const bounds = await getDataBounds(db);
  const range = parseRange(sp.range, bounds.min, bounds.max);
  const metric: TrendMetric = METRICS.includes(sp.metric as TrendMetric) ? (sp.metric as TrendMetric) : "booking_value";
  const overview = await getOverview(db, range, bounds.property.feeRateBps);

  return (
    <AppShell property={bounds.property} dataThrough={bounds.max} range={range} active="overview">
      <PageHeader title="Marketing overview" subtitle="What Autumn's marketing did for your hotel, in plain terms." />
      <HeadlineCard overview={overview} range={range} />
      <StatTiles overview={overview} range={range} />
      <Section title="How it's trending" action={<Suspense><TrendMetricTabs metric={metric} /></Suspense>}>
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
          <Trend range={range} metric={metric} autumnStart={bounds.property.autumnStartDate} />
        </Suspense>
      </Section>
      <Section title="What's happening" description="Wins, things worth watching, and what Autumn is doing about them.">
        <Suspense fallback={<Skeleton className="h-40 w-full rounded-xl" />}><Insights range={range} /></Suspense>
      </Section>
      <Section title="Where bookings come from">
        <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}><Preview range={range} /></Suspense>
      </Section>
      <Glossary keys={["direct_bookings", "booking_value", "autumn_fee", "net_revenue", "direct_share", "impressions", "site_visits", "cost_per_booking"]} />
    </AppShell>
  );
}

async function Trend({ range, metric, autumnStart }: { range: ReturnType<typeof parseRange>; metric: TrendMetric; autumnStart: string }) {
  const points = await getTrend(db, range, metric);
  return <div className="rounded-xl bg-card p-4 shadow-sm"><TrendChart points={points} metric={metric} range={range} autumnStart={autumnStart} /></div>;
}
async function Insights({ range }: { range: ReturnType<typeof parseRange> }) { return <InsightList items={await getInsights(db, range)} range={range.preset} />; }
async function Preview({ range }: { range: ReturnType<typeof parseRange> }) { return <SourcePreview data={await getSourcePreview(db, range)} range={range.preset} />; }
```

- [ ] **Step 2: loading, error, not-found**

```tsx
// src/app/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6"><Skeleton className="h-8 w-48" /><Skeleton className="mt-8 h-44 w-full rounded-xl" /><div className="mt-4 grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div></div>;
}
```

```tsx
// src/app/error.tsx
"use client";
import { Button } from "@/components/ui/button";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-start gap-3 px-6 py-24">
      <h1 className="text-xl font-semibold">We couldn&apos;t load your numbers.</h1>
      <p className="text-muted-foreground">Nothing is wrong with your bookings. The dashboard could not reach its data just now.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
```

```tsx
// src/app/not-found.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return <div className="mx-auto flex max-w-md flex-col items-start gap-3 px-6 py-24"><h1 className="text-xl font-semibold">This page took a wrong turn.</h1><Button asChild><Link href="/">Back to overview</Link></Button></div>;
}
```

- [ ] **Step 3: Run it and look**

Start with the preview tool (never bare `npm run dev`). Open `/`, `/?range=90d`, `/?range=all&metric=site_visits`. Take screenshots at 1280 px and 390 px and SEND them to the owner. Check the console for hydration warnings; there must be none.
Gate: the headline value for `?range=30d` equals `select sum(room_revenue_cents) from bookings where source='direct_autumn' and booked_on between (max(booked_on)-29) and max(booked_on)` — run that against Neon with `npx tsx -e` and paste both numbers into the commit.

- [ ] **Step 4: Commit**

```bash
git add src/app public
git commit -m "Compose the overview page from the query layer and component library

Headline for 30d: <UI value> == <SQL value>. Streams trend/insights/preview
behind Suspense. Gates: build ok, typecheck 0, lint 0, vitest passed;
screenshots at 390/1280 sent to owner.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: Bookings components

**Files:**
- Create: `src/components/bookings/{context-strip,source-mix-chart,campaign-table,feeder-market-list,guest-behaviour,recent-bookings,index}.tsx`
- Test: `tests/components/campaign-table.test.tsx`

**Interfaces:**
- Consumes: DTOs from Task 7 and `OverviewDto` for the strip.
- Produces: `<ContextStrip overview range />`, `<SourceMixChart data={SourceMixDto} range />` (client), `<CampaignTable rows={CampaignRow[]} />`, `<FeederMarketList rows={FeederMarketRow[]} />`, `<GuestBehaviour data={GuestBehaviourDto} />`, `<RecentBookings rows={RecentBookingRow[]} />`.

- [ ] **Step 1: Failing test**

```tsx
// tests/components/campaign-table.test.tsx
// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CampaignTable } from "@/components/bookings";

describe("CampaignTable", () => {
  it("uses plain names, purposes, and '1 in N' instead of CTR", () => {
    render(<TooltipProvider><CampaignTable rows={[{ category: "brand_protection", impressions: 2172, clicks: 669, bookings: 29, valueCents: 1109500, feeCents: 166425, ctr: 0.308 }]} /></TooltipProvider>);
    expect(screen.getByText("Brand protection")).toBeInTheDocument();
    expect(screen.getByText(/Keeps you first when guests search your name/)).toBeInTheDocument();
    expect(screen.getByText("1 in 3")).toBeInTheDocument();
    expect(screen.getByText("$11,095")).toBeInTheDocument();
    expect(screen.queryByText(/CTR/)).toBeNull();
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// src/components/bookings/context-strip.tsx
import { money, pct } from "@/lib/format";
import type { OverviewDto } from "@/lib/db/queries/overview";
export function ContextStrip({ overview }: { overview: OverviewDto }) {
  const c = overview.current;
  const items = [["Direct bookings from Autumn", String(c.autumnBookings)], ["Booking value", money(c.autumnValueCents)], ["Booked direct", pct(c.directShare)], ["You kept", money(c.netCents)]];
  return <dl className="grid grid-cols-2 gap-3 rounded-xl bg-card p-4 shadow-sm sm:grid-cols-4">{items.map(([k, v]) => <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="text-lg font-semibold tabular-nums">{v}</dd></div>)}</dl>;
}
```

```tsx
// src/components/bookings/source-mix-chart.tsx
"use client";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ChartFrame, axisBucket, axisCompact } from "@/components/charts";
import type { SourceMixDto } from "@/lib/db/queries/bookings";
import type { DateRange } from "@/lib/date-range";
import { money, pct } from "@/lib/format";

export function SourceMixChart({ data, range }: { data: SourceMixDto; range: DateRange }) {
  return (
    <div className="rounded-xl bg-card p-4 shadow-sm">
      <p className="mb-3 text-sm text-muted-foreground">{pct(data.directShare)} of bookings came direct. That avoided about <span className="font-medium text-foreground">{money(data.commissionAvoidedCents)}</span> in OTA commission.</p>
      <ChartFrame title="Direct versus OTA bookings" summary={`${pct(data.directShare)} direct over ${range.label.toLowerCase()}.`}>
        <BarChart data={data.points} margin={{ left: 4, right: 12 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="bucket" tickFormatter={axisBucket(range.granularity)} tickLine={false} axisLine={false} minTickGap={32} />
          <YAxis tickFormatter={axisCompact} tickLine={false} axisLine={false} width={40} />
          <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => axisBucket(range.granularity)(String(v))} />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="directAutumn" stackId="a" fill="var(--color-directAutumn)" radius={[0, 0, 0, 0]} />
          <Bar dataKey="directOther" stackId="a" fill="var(--color-directOther)" />
          <Bar dataKey="ota" stackId="a" fill="var(--color-ota)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartFrame>
    </div>
  );
}
```

```tsx
// src/components/bookings/campaign-table.tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MetricLabel } from "@/components/copy";
import { compact, money, oneIn } from "@/lib/format";
import { glossary } from "@/lib/glossary";
import type { CampaignRow } from "@/lib/db/queries/bookings";

export function CampaignTable({ rows }: { rows: CampaignRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl bg-card shadow-sm">
      <Table>
        <TableHeader><TableRow>
          <TableHead>Campaign</TableHead><TableHead className="text-right"><MetricLabel k="impressions" /></TableHead><TableHead className="text-right"><MetricLabel k="ctr" /></TableHead>
          <TableHead className="text-right">Bookings</TableHead><TableHead className="text-right"><MetricLabel k="booking_value" /></TableHead><TableHead className="text-right"><MetricLabel k="autumn_fee" /></TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.category}>
              <TableCell className="max-w-xs"><div className="font-medium">{glossary[r.category].label}</div><div className="text-xs text-muted-foreground">{glossary[r.category].purpose}</div></TableCell>
              <TableCell className="text-right tabular-nums">{compact(r.impressions)}</TableCell>
              <TableCell className="text-right tabular-nums">{oneIn(r.ctr)}</TableCell>
              <TableCell className="text-right tabular-nums">{r.bookings}</TableCell>
              <TableCell className="text-right tabular-nums">{money(r.valueCents)}</TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">{money(r.feeCents)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

```tsx
// src/components/bookings/feeder-market-list.tsx
import { money, pct } from "@/lib/format";
import type { FeederMarketRow } from "@/lib/db/queries/bookings";
const drive = (m: number | null) => (m === null ? null : m < 60 ? `${m} min drive` : `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ""} drive`.replace(/\s+/g, " ").trim());
export function FeederMarketList({ rows }: { rows: FeederMarketRow[] }) {
  return (
    <ol className="divide-y rounded-xl bg-card shadow-sm">
      {rows.map((m, i) => (
        <li key={`${m.city}-${m.region}`} className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-3 px-5 py-3">
          <span className="text-sm text-muted-foreground tabular-nums">{i + 1}</span>
          <div><div className="font-medium">{m.city}{m.region ? `, ${m.region}` : ""}</div><div className="text-xs text-muted-foreground">{drive(m.driveMinutes) ?? "Various"}</div><div className="mt-1.5 h-1.5 w-full rounded-full bg-secondary"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.round(m.share * 100)}%` }} /></div></div>
          <div className="text-right"><div className="font-medium tabular-nums">{m.bookings} · {pct(m.share)}</div><div className="text-xs text-muted-foreground tabular-nums">{money(m.valueCents)}</div></div>
        </li>
      ))}
    </ol>
  );
}
```

```tsx
// src/components/bookings/guest-behaviour.tsx
import type { GuestBehaviourDto } from "@/lib/db/queries/bookings";
function Bars({ title, note, items }: { title: string; note: string; items: { label: string; count: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.count)); const total = items.reduce((s, i) => s + i.count, 0) || 1;
  return (
    <div className="rounded-xl bg-card p-5 shadow-sm">
      <h3 className="text-sm font-medium">{title}</h3><p className="mb-3 text-xs text-muted-foreground">{note}</p>
      <ul className="space-y-2">{items.map((i) => <li key={i.label} className="text-sm"><div className="flex justify-between"><span>{i.label}</span><span className="tabular-nums text-muted-foreground">{Math.round((i.count / total) * 100)}%</span></div><div className="mt-1 h-1.5 rounded-full bg-secondary"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${(i.count / max) * 100}%` }} /></div></li>)}</ul>
    </div>
  );
}
export function GuestBehaviour({ data }: { data: GuestBehaviourDto }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Bars title="What they booked on" note="Most guests book on their phone, so your site has to work there first." items={data.device} />
      <Bars title="How far ahead they booked" note="Longer lead times mean more time for a reminder to land." items={data.leadTime} />
      <Bars title="When they booked" note="Evenings are when people plan trips." items={data.hour} />
    </div>
  );
}
```

```tsx
// src/components/bookings/recent-bookings.tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { longDate, money, shortDate } from "@/lib/format";
import { glossary } from "@/lib/glossary";
import type { RecentBookingRow } from "@/lib/db/queries/bookings";
export function RecentBookings({ rows }: { rows: RecentBookingRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl bg-card shadow-sm">
      <Table>
        <TableHeader><TableRow><TableHead>Booked</TableHead><TableHead>Stay</TableHead><TableHead>From</TableHead><TableHead>How</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader>
        <TableBody>{rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="whitespace-nowrap">{longDate(r.bookedOn)}</TableCell>
            <TableCell className="whitespace-nowrap">{shortDate(r.checkIn)} · {r.nights} {r.nights === 1 ? "night" : "nights"}</TableCell>
            <TableCell>{r.market}</TableCell>
            <TableCell className="text-muted-foreground">{r.category ? glossary[r.category].label : glossary[r.source].label}</TableCell>
            <TableCell className="text-right tabular-nums">{money(r.valueCents)}</TableCell>
          </TableRow>
        ))}</TableBody>
      </Table>
    </div>
  );
}
```

```ts
// src/components/bookings/index.ts
export { ContextStrip } from "./context-strip";
export { SourceMixChart } from "./source-mix-chart";
export { CampaignTable } from "./campaign-table";
export { FeederMarketList } from "./feeder-market-list";
export { GuestBehaviour } from "./guest-behaviour";
export { RecentBookings } from "./recent-bookings";
```

- [ ] **Step 3: Green, commit**

Run: `npm run typecheck && npm run lint && npm test` — Expected: campaign-table 1 passed; totals re-measured.

```bash
git add src/components/bookings tests/components/campaign-table.test.tsx
git commit -m "Add bookings-detail components with plain-language campaign rows

Gates: vitest passed; typecheck 0; lint 0.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12: Bookings page composition

**Files:**
- Create: `src/app/bookings/page.tsx`, `src/app/bookings/loading.tsx`

- [ ] **Step 1: Page**

```tsx
// src/app/bookings/page.tsx
import { Suspense } from "react";
import { db } from "@/lib/db/client";
import { getDataBounds } from "@/lib/db/queries/meta";
import { getOverview } from "@/lib/db/queries/overview";
import { getCampaignBreakdown, getFeederMarkets, getGuestBehaviour, getRecentBookings, getSourceMix } from "@/lib/db/queries/bookings";
import { parseRange } from "@/lib/date-range";
import { AppShell, PageHeader, Section } from "@/components/layout";
import { CampaignTable, ContextStrip, FeederMarketList, GuestBehaviour, RecentBookings, SourceMixChart } from "@/components/bookings";
import { Glossary } from "@/components/dashboard";
import { Skeleton } from "@/components/ui/skeleton";

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const sp = await searchParams;
  const bounds = await getDataBounds(db);
  const range = parseRange(sp.range, bounds.min, bounds.max);
  const fee = bounds.property.feeRateBps;
  const [overview, mix, campaigns, markets, guests, recent] = await Promise.all([
    getOverview(db, range, fee), getSourceMix(db, range), getCampaignBreakdown(db, range, fee), getFeederMarkets(db, range), getGuestBehaviour(db, range), getRecentBookings(db, range),
  ]);
  return (
    <AppShell property={bounds.property} dataThrough={bounds.max} range={range} active="bookings">
      <PageHeader title="Where your direct bookings come from" subtitle="The bookings behind the headline: which ads, which towns, and how guests booked." />
      <ContextStrip overview={overview} />
      <Section id="mix" title="Direct versus OTA" description="Bookings on your own site keep the commission with you."><SourceMixChart data={mix} range={range} /></Section>
      <Section id="campaigns" title="What each campaign is doing"><CampaignTable rows={campaigns} /></Section>
      <Section id="markets" title="Where guests come from" description="Ranked by direct bookings from Autumn's ads."><FeederMarketList rows={markets} /></Section>
      <Section id="guests" title="How guests book"><GuestBehaviour data={guests} /></Section>
      <Section id="recent" title="Recent direct bookings"><Suspense fallback={<Skeleton className="h-48 rounded-xl" />}><RecentBookings rows={recent} /></Suspense></Section>
      <Glossary keys={["direct_autumn", "direct_other", "ota", "ota_commission", "impressions", "ctr", "autumn_fee", "lead_time"]} />
    </AppShell>
  );
}
```
`Promise.all` here is deliberate: six small queries in parallel beat five Suspense boundaries for a page whose sections are all above the fold on desktop; the overview page streams because its trend query is the slowest and sits below the headline.

```tsx
// src/app/bookings/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() { return <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6"><Skeleton className="h-8 w-72" /><Skeleton className="mt-8 h-20 w-full rounded-xl" /><Skeleton className="mt-8 h-72 w-full rounded-xl" /></div>; }
```

- [ ] **Step 2: Run, verify anchors, screenshot**

Open `/bookings?range=90d#campaigns` in the preview; the section must scroll into view under the header (`scroll-mt-24`). Click an insight card on `/`; land on the anchor. Screenshots at 390/1280 sent to the owner.
Gate: the campaign table's bookings column sums to the context strip's "Direct bookings from Autumn" for the same range (both render from the same rows; this is the cross-screen consistency check).

- [ ] **Step 3: Commit**

```bash
git add src/app/bookings
git commit -m "Compose the bookings detail page with anchored sections

Campaign bookings sum == context strip Autumn bookings for 30d/90d/all.
Gates: build ok; typecheck 0; lint 0; vitest passed; screenshots sent.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 13: Visual and accessibility pass

**Files:**
- Modify: components and `globals.css` as the pass finds issues; `docs/screenshots/*.png`

- [ ] **Step 1: Responsive sweep.** In the preview, view both pages at 390, 768, 1280 and 1680 px. Fix: table overflow on phones (`overflow-x-auto` present), tile grid collapse, nav wrap, chart tick crowding (`minTickGap`), long headline wrapping at 390 px (`text-2xl` floor).
- [ ] **Step 2: Accessibility.** Run `design:accessibility-review` on both pages. Required: every chart has the `figcaption` summary; the range control is a radiogroup; contrast of `--muted-foreground` on `--card` ≥ 4.5:1 (measure; `#5c5b57` on `#fbfbfa` is ≈ 6.3:1); tooltips reachable by keyboard (`TooltipTrigger` is focusable — the `<h3>` trigger needs `tabIndex={0}`).
- [ ] **Step 3: Copy read-aloud.** Read both pages aloud as the innkeeper. Any sentence with a term not in the glossary gets rewritten or an entry.
- [ ] **Step 4: Save screenshots.** `docs/screenshots/reference-overview.png` and `reference-website-traffic.png` (copies of `docs/reference/*.png`), `new-overview.png`, `new-bookings.png` at 1280 px, plus `new-overview-mobile.png` at 390 px.
- [ ] **Step 5: Commit** with the list of fixes and the measured contrast ratios.

---

### Task 14: Deploy, live gate, README

**Files:**
- Create: `README.md` (replace stub), `vercel.ts` (optional; only if a setting is needed)

- [ ] **Step 1: HUMAN GATE — Vercel.** Ask the owner to import the GitHub repo in Vercel (or run `vercel link` themselves) and set `DATABASE_URL` in the project's Production and Preview environments to the same Neon string the seed used. Do not create the project or paste the secret.
- [ ] **Step 2: Deploy** via `vercel:deploy` (preview first, then `prod` on the owner's word). Expected: build log shows both routes; no warnings about dynamic usage.
- [ ] **Step 3: Live gate.** `curl -s <url>/ | grep -o 'direct bookings'` returns a hit; open `<url>/bookings?range=all` in the preview; the headline value on `/` equals `npm run db:verify`'s corresponding number computed by a one-off `npx tsx -e` query for the 30-day window. Lighthouse (browser pane or `npx lighthouse`) ≥ 90 performance and accessibility on both routes; record the four numbers.
- [ ] **Step 4: README** with: what it is, the two screens, stack, local setup (`cp .env.example .env`, `npm install`, `npm run db:migrate`, `npm run db:seed`, `npm run db:verify`, `npm run dev`), the data model table from the spec, the seed's realism rules in five bullets, the gates table from CLAUDE.md §7, and the screenshots inline. Link `docs/decisions.md` and the spec.
- [ ] **Step 5: Commit and push** (push is the §4 gate; the owner said yes once for the initial push — ask again). Send the owner: the live URL, the repo URL, the screenshot paths, and a one-paragraph summary of what was measured.

---

## Decision log discipline (applies to every task)

`docs/decisions.md` is the running record of why. Each task that settles a
question adds or updates a row there: the decision, the alternative, the reason,
and the test or gate that proves it. A task is not done until its row exists.
Commit the row in the same commit as the code.

## Self-review against the spec

- Spec §3 (screen 1) blocks 1–7 → Tasks 8, 9, 10. Block 3's three tiles → `StatTiles`. Block 4's "Autumn started" marker → `TrendChart` `ReferenceLine`. Block 5 kinds → `InsightList` `KIND`. Block 7 → `Glossary`.
- Spec §4 (screen 2) sections 1–6 → Tasks 11, 12, anchors `mix|campaigns|markets|guests|recent` match `generate-insights.ts` and the generator test.
- Spec §5 data model → Task 3 schema; every column in the table exists in `schema.ts`.
- Spec §5 seed realism rules → Task 4 profile + Task 5 generators; each rule has an assertion in `seed-profile.test.ts` or `seed-generators.test.ts` except "booking hour evening-heavy" — add: `expect(hourCounts[20] > hourCounts[3])` to the generators test during Task 5.
- Spec §6 error handling → Task 10 `error.tsx`, `InsightList` empty state, `StatTiles` "—".
- Spec §7 testing → Tasks 2–12 each carry their tests; live gate in Task 14.
- Type consistency: `PeriodTotals`, `OverviewDto`, `TrendPoint`, `InsightDto`, `SourcePreviewDto` (Task 6) are the names consumed in Tasks 9–10; `SourceMixDto`, `CampaignRow`, `FeederMarketRow`, `GuestBehaviourDto`, `RecentBookingRow` (Task 7) in Tasks 11–12; `parseRange`, `DateRange`, `RangePreset`, `Granularity` (Task 2) everywhere. `bucketStarts` is duplicated in `overview.ts` and `bookings.ts` on purpose for now; a follow-up may lift it to `date-range.ts` with its own test.
