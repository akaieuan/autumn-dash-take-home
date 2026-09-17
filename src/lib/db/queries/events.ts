import { sql } from "drizzle-orm";
import { n, rowsOf, toCents, type AnyDb } from "./types";
import { addDays, type DateRange } from "@/lib/date-range";
import type { EventKind } from "../schema";
import { EVENT_KIND_LABELS, valueLabel } from "@/lib/glossary";

export interface CampaignMetaDto { name: string; label: string; objective: string; focus: string; launchedOn: string; status: "live" | "paused"; monthlyBudgetCents: number }

/** What each campaign is for, in the owner's words. */
export async function getCampaignMeta(db: AnyDb): Promise<CampaignMetaDto[]> {
  const rows = rowsOf<{ name: string; objective: string; focus: string; launched_on: string; status: "live" | "paused"; budget: unknown }>(
    await db.execute(sql`select name, objective, focus, launched_on::text as launched_on, status, monthly_budget::float8 as budget from campaigns order by launched_on, name`),
  );
  return rows.map((r) => ({ name: r.name, label: valueLabel(r.name), objective: r.objective, focus: r.focus, launchedOn: r.launched_on, status: r.status, monthlyBudgetCents: toCents(r.budget) }));
}

export interface EventDto { id: number; date: string; campaign: string | null; campaignLabel: string | null; kind: EventKind; kindLabel: string; title: string; note: string }

/** What Autumn did inside the range, newest first. */
export async function getEvents(db: AnyDb, range: DateRange, limit = 10): Promise<EventDto[]> {
  const rows = rowsOf<{ id: number; date: string; campaign_name: string | null; kind: EventKind; title: string; note: string }>(
    await db.execute(sql`select id, date::text as date, campaign_name, kind, title, note from campaign_events where date between ${range.from} and ${range.to} order by date desc, id desc limit ${limit}`),
  );
  return rows.map((r) => ({
    id: Number(r.id), date: r.date, campaign: r.campaign_name, campaignLabel: r.campaign_name ? valueLabel(r.campaign_name) : null,
    kind: r.kind, kindLabel: EVENT_KIND_LABELS[r.kind], title: r.title, note: r.note,
  }));
}

export interface WindowTotals { from: string; to: string; impressions: number; clicks: number; bookings: number; bookingValueCents: number; spendCents: number; ctr: number; conversion: number }
export interface EventImpactDto { event: EventDto; days: number; before: WindowTotals; after: WindowTotals }

interface Sums { i: unknown; c: unknown; b: unknown; v: unknown; s: unknown }

/** The five figures a window reports, from whichever table the event's scope reads. */
const SUMS = sql`coalesce(sum(t.impressions),0) as i, coalesce(sum(t.clicks),0) as c, coalesce(sum(t.bookings),0) as b, coalesce(sum(t.booking_value),0)::float8 as v, coalesce(sum(t.spend),0)::float8 as s`;

const windowOf = (r: Sums | undefined, from: string, to: string): WindowTotals => {
  const impressions = n(r?.i), clicks = n(r?.c), bookings = n(r?.b);
  return { from, to, impressions, clicks, bookings, bookingValueCents: toCents(r?.v), spendCents: toCents(r?.s), ctr: impressions ? clicks / impressions : 0, conversion: clicks ? bookings / clicks : 0 };
};

async function windowTotals(db: AnyDb, campaign: string | null, from: string, to: string): Promise<WindowTotals> {
  const [r] = rowsOf<Sums>(
    campaign === null
      ? await db.execute(sql`select ${SUMS} from daily_metrics t where t.date between ${from} and ${to}`)
      : await db.execute(sql`select ${SUMS} from breakdowns t where t.dimension = 'campaign' and t.dimension_value = ${campaign} and t.date between ${from} and ${to}`),
  );
  return windowOf(r, from, to);
}

/**
 * The two windows an impact compares, and the length actually compared: `days` from the
 * event (clipped to `clipTo`, normally the last day with data) against the same number of
 * days before it. One definition, shared by the single lookup and the grouped one, so the
 * two can never drift apart.
 */
function impactWindows(date: string, days: number, clipTo?: string): { days: number; before: { from: string; to: string }; after: { from: string; to: string } } {
  let afterTo = addDays(date, days - 1);
  if (clipTo && afterTo > clipTo) afterTo = clipTo;
  const actual = Math.max(1, Math.round((Date.parse(afterTo) - Date.parse(date)) / 86_400_000) + 1);
  return { days: actual, before: { from: addDays(date, -actual), to: addDays(date, -1) }, after: { from: date, to: afterTo } };
}

type Side = "before" | "after";
interface WindowSpec { eventId: number; side: Side; campaign: string | null; from: string; to: string }

/**
 * Every window of one scope in a single statement: the list travels as a parameterised
 * `values` table joined to the metric rows it selects, so five events cost one statement
 * instead of ten. Keyed `<event id>|<side>`; a window with no matching rows still comes
 * back (left join + coalesce), exactly as a single lookup would.
 */
async function groupedWindows(db: AnyDb, specs: WindowSpec[], scope: "campaign" | "program"): Promise<Map<string, Sums>> {
  const values = sql.join(
    specs.map((s, i) =>
      scope === "campaign"
        ? i === 0
          ? sql`(${s.eventId}::int, ${s.side}::text, ${s.campaign}::text, ${s.from}::date, ${s.to}::date)`
          : sql`(${s.eventId}, ${s.side}, ${s.campaign}, ${s.from}, ${s.to})`
        : i === 0
          ? sql`(${s.eventId}::int, ${s.side}::text, ${s.from}::date, ${s.to}::date)`
          : sql`(${s.eventId}, ${s.side}, ${s.from}, ${s.to})`,
    ),
    sql`, `,
  );
  const rows = rowsOf<Sums & { event_id: number; side: Side }>(
    await db.execute(
      scope === "campaign"
        ? sql`select w.event_id, w.side, ${SUMS}
            from (values ${values}) as w(event_id, side, campaign, from_date, to_date)
            left join breakdowns t on t.dimension = 'campaign' and t.dimension_value = w.campaign and t.date between w.from_date and w.to_date
            group by w.event_id, w.side`
        : sql`select w.event_id, w.side, ${SUMS}
            from (values ${values}) as w(event_id, side, from_date, to_date)
            left join daily_metrics t on t.date between w.from_date and w.to_date
            group by w.event_id, w.side`,
    ),
  );
  return new Map(rows.map((r) => [`${Number(r.event_id)}|${r.side}`, r]));
}

/**
 * The album-release comparison: the `days` days from the event against the same
 * number of days before it, scoped to the event's campaign (program-wide events
 * read `daily_metrics`). `clipTo` (normally the last day with data) shortens the
 * after-window for recent events; `days` reports the length actually compared.
 */
export async function getEventImpact(db: AnyDb, event: EventDto, days = 28, clipTo?: string): Promise<EventImpactDto> {
  const w = impactWindows(event.date, days, clipTo);
  const [before, after] = await Promise.all([
    windowTotals(db, event.campaign, w.before.from, w.before.to),
    windowTotals(db, event.campaign, w.after.from, w.after.to),
  ]);
  return { event, days: w.days, before, after };
}

/**
 * The most recent events in the range, each with its before/after windows, newest first.
 * Two statements at most instead of two per event: the windows are built here and both
 * scopes are aggregated in one grouped pass each. `getEventImpact` stays the single lookup.
 */
export async function getRecentEventImpacts(db: AnyDb, range: DateRange, count = 3, days = 28): Promise<EventImpactDto[]> {
  const events = await getEvents(db, range, count);
  if (events.length === 0) return [];
  const windows = events.map((event) => ({ event, ...impactWindows(event.date, days, range.to) }));
  const specs: WindowSpec[] = windows.flatMap((w) => [
    { eventId: w.event.id, side: "before" as const, campaign: w.event.campaign, ...w.before },
    { eventId: w.event.id, side: "after" as const, campaign: w.event.campaign, ...w.after },
  ]);
  const scoped = specs.filter((s) => s.campaign !== null);
  const program = specs.filter((s) => s.campaign === null);
  const [byCampaign, byProgram] = await Promise.all([
    scoped.length > 0 ? groupedWindows(db, scoped, "campaign") : null,
    program.length > 0 ? groupedWindows(db, program, "program") : null,
  ]);
  const sums = (w: (typeof windows)[number], side: Side) =>
    (w.event.campaign !== null ? byCampaign : byProgram)?.get(`${w.event.id}|${side}`);
  return windows.map((w) => ({
    event: w.event,
    days: w.days,
    before: windowOf(sums(w, "before"), w.before.from, w.before.to),
    after: windowOf(sums(w, "after"), w.after.from, w.after.to),
  }));
}
