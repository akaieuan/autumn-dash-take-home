import { Suspense } from "react";
import { cookies } from "next/headers";
import { db } from "@/lib/db/client";
import { parseRange, type DateRange } from "@/lib/date-range";
import { weekdayAverages } from "@/lib/activity";
import { CALENDAR_SPAN_COOKIE, parseCalendarSpan, type CalendarSpan } from "@/lib/calendar-span";
import {
  getActivity,
  getBreakdownBundle,
  getCampaignEfficiency,
  getDataBounds,
  getPeriodTotals,
  getRecentEventImpacts,
  getTrafficByCampaign,
} from "@/lib/db/queries";
import { AppShell, Grid, Stack } from "@/components/layout";
import { AssistantPopover } from "@/components/assistant";
import {
  TrafficIntro,
  TrafficBodySkeleton,
  ActivityCalendar,
  TrafficStory,
  CampaignEfficiencyTable,
  WeekdayRhythm,
  DeviceConversion,
  isTrafficMetric,
  type TrafficMetric,
} from "@/components/website-traffic";

export const dynamic = "force-dynamic";

type Search = Promise<{ range?: string; metric?: string }>;

/** The second screen (D31): traffic explained through the days it arrives on and the campaigns that produce it. */
export default async function WebsiteTrafficPage({ searchParams }: { searchParams: Search }) {
  const { range: rangeParam, metric: metricParam } = await searchParams;
  const span = parseCalendarSpan((await cookies()).get(CALENDAR_SPAN_COOKIE)?.value);
  const bounds = await getDataBounds(db);
  const range = parseRange(rangeParam, bounds.min, bounds.max);
  const metric: TrafficMetric = isTrafficMetric(metricParam) ? metricParam : "clicks";
  const c = range.comparison;
  const [totals, previous] = await Promise.all([
    getPeriodTotals(db, range.from, range.to),
    c ? getPeriodTotals(db, c.prevFrom, c.prevTo) : null,
  ]);
  return (
    <AppShell
      active="website-traffic"
      range={range.preset}
      dataThrough={bounds.max}
      basePath="/website-traffic"
      metric={metric === "clicks" ? undefined : metric}
    >
      <TrafficIntro range={range} totals={{ visits: totals.websiteVisits, newVisitors: totals.newVisitors, previousVisits: previous?.websiteVisits ?? null }} />
      <Suspense fallback={<TrafficBodySkeleton />}>
        <TrafficBody range={range} metric={metric} dataThrough={bounds.max} span={span} />
      </Suspense>
      <AssistantPopover />
    </AppShell>
  );
}

/**
 * Everything below the headline, streamed behind one boundary. The efficiency table and the
 * device split read the same `breakdowns` rows, so they share one bundle rather than
 * aggregating that table twice (audit item 7).
 */
async function TrafficBody({ range, metric, dataThrough, span }: { range: DateRange; metric: TrafficMetric; dataThrough: string; span: CalendarSpan }) {
  const [activity, series, impacts, bundle] = await Promise.all([
    getActivity(db, dataThrough, "website_visits"),
    getTrafficByCampaign(db, range, metric),
    getRecentEventImpacts(db, range, 5),
    getBreakdownBundle(db, range),
  ]);
  const efficiency = await getCampaignEfficiency(db, range, bundle);
  return (
    <Stack>
      <ActivityCalendar activity={activity} initialSpan={span} />
      <TrafficStory data={series} impacts={impacts} range={range} metric={metric} />
      <CampaignEfficiencyTable data={efficiency} />
      {/* Nothing here repeats the Overview: markets and the glossary live there (owner's ruling 2026-09-17). */}
      <Grid variant="two">
        <WeekdayRhythm averages={weekdayAverages(activity.days)} />
        <DeviceConversion devices={bundle.rows.device} />
      </Grid>
    </Stack>
  );
}
