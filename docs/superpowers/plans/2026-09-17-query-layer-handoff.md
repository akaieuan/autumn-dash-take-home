# Query layer handoff — what exists on `main` as of commit f4dc290 (2026-09-17)

For the agent executing `2026-09-17-overview-component-library.md`. Tasks 2–5
of that plan schedule files that now exist. Extend them; do not recreate them.
All of this is green: `npm run typecheck && npm run lint && npm test` → 12
files, 53 tests.

## Live modules and exports

| File | Exports | Notes |
|---|---|---|
| `src/lib/property.ts` | `PROPERTY { name, city, region, roomCount, feeRateBps }`, `OTA_COMMISSION_RATE = 0.18` | Corrected 2026-09-17: Task 2 took the rename. Was `src/lib/config.ts` with a separate `FEE_RATE_BPS`; the rate now lives inside `PROPERTY` and `tests/property.test.ts` holds `PROPERTY` equal to the seed's own copy. Import `PROPERTY.feeRateBps`, not `FEE_RATE_BPS`. |
| `src/lib/format.ts` | `money`, `count`, `moneyCompact`, `compact`, `pct`, `delta`, `deltaText`, `oneIn`, `shortDate`, `longDate`, `bucketLabel`, `rangeLabel` | Corrected 2026-09-17: Task 2 added `count` and `rangeLabel` and moved the date helpers to US order (`Sep 1`, `Sep 1, 2026`, `Wk of Aug 31`), which is what `tests/format.test.ts` now fixes. |
| `src/lib/glossary.ts` | `GlossaryKey`, `CampaignKey`, `DeviceKey`, `GlossaryEntry`, `glossary`, `isGlossaryKey`, `campaignKey`, `deviceKey`, `valueLabel(seedLabel)`, `MARKET_HINTS` | Corrected 2026-09-17: Task 2 added the four names the plan asked for and re-keyed campaigns from the seeded string to `brand_protection | discovery | hotel_ads | retargeting`, with every label, meaning and purpose kept verbatim. Reach an entry with `glossary[campaignKey(label)!]`, not `glossary[label]`. Devices have entries too (`device_mobile` → "Phone") but `valueLabel` deliberately passes device and city values through unchanged, so query rows still read "Mobile"; a component wanting the softer wording goes via `deviceKey`. |
| `src/lib/date-range.ts` | `parseRange`, `DateRange`, `RangePreset`, `Granularity`, `addDays`, `addYears`, `daysBetween`, `dayOfWeek`, `eachDay`, `granularityFor` | Tested. |
| `src/lib/db/types.ts` | `AnyDb`, `rowsOf` | Plan puts `PeriodTotals`, `n`, `toCents`, `chunkSums` in `queries/types.ts`; `n`/`toCents` are currently private in each query module. Lift them into `queries/types.ts` and add `chunkSums` there. |
| `src/lib/db/queries/meta.ts` | `getDataBounds(db) → { min, max }` | Throws a readable error on an empty table. Matches the plan. |
| `src/lib/db/queries/overview.ts` | `PeriodTotals`, `OverviewDto`, `getPeriodTotals(db, from, to, feeRateBps?)`, `getOverview(db, range, feeRateBps?)`, `TREND_METRICS`, `TrendMetric`, `TrendPoint`, `bucketStarts`, `getTrend(db, range, metric) → TrendPoint[]` | `PeriodTotals` is richer than the plan's (has `from/to/days`, `feeCents`, `netCents`, `ctr`, `conversion`, `avgBookingValueCents`); `OverviewDto` carries `costPerBookingCents`, `otaCommissionPerBookingCents`, `commissionAvoidedCents`. Field name difference: `bookingValueCents` here vs `valueCents` in the plan. Pick one and apply across; `bookingValueCents` is what the tests and `insights.ts` use. `getTrend` returns the points array; wrap it in the plan's `TrendDto { metric, granularity, points }` if the chart wants that. Moving `getTrend` to `trend.ts` is fine; re-export from `queries/index.ts`. |
| `src/lib/db/queries/breakdowns.ts` | `BreakdownRowDto`, `getBreakdown(db, range, dimension, feeRateBps?)`, `getAllBreakdowns(db, range)` | Generic per-dimension aggregate ranked by bookings with `shareOfBookings`, `shareOfClicks`, `ctr`, `conversion`, `feeCents`, and `previous` figures. Build the plan's `getMarkets` (fold + hints), `getCampaigns` (`live` flag, `total` from `daily_metrics` via `getPeriodTotals`) and `getFunnel` on top of `getBreakdown` + `getPeriodTotals`; the SQL is already there. `getQuickAnalytics` needs per-day series: `series()` in `overview.ts` is private, export it or add a `getDailySeries(db, from, to, metric)` next to it. |
| `src/lib/db/queries/index.ts` | barrel of the above | Add new exports here. |
| `src/lib/insights.ts` | `Insight`, `InsightKind`, `InsightInput`, `computeInsights(input, limit=5)` | Six rules, `tests/insights.test.ts` (6). Takes `{ overview: OverviewDto, breakdowns: Record<Dimension, BreakdownRowDto[]>, range }`. Plan Task 5 names the type `InsightDto`; alias it or rename, and if the input becomes `{ overview, markets, campaigns, funnel }` adapt the rules rather than starting over. |
| `tests/queries/{setup,fixture,overview,breakdowns,schema,seed}.test.ts` | | `fixture.ts` exports `FIXTURE_RANGE` and `loadFixture(db)` with hand-computed expectations documented inline. Extend the fixture; do not replace it (the existing tests depend on those rows). |

## Conventions already enforced by tests

- Money: `numeric` dollars in the database, integer cents in every DTO via one `toCents` at the query boundary.
- Comparisons are aligned by bucket index; buckets start on the range's first day (`bucketStarts`).
- Every expected value in a query test is computed by hand from the fixture.
- Negative controls run so far: apportion remainder (3 red), date filter in `getPeriodTotals` (2 red).

## Nothing exists yet under

`src/components/**` (only `ui/` from shadcn), `src/app/{loading,error,not-found}.tsx`, `tests/components/**`, `tests/architecture.test.ts`. Those are yours.
