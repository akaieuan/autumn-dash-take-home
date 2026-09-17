// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { ActivityCalendar, heatLevel, monthColumns } from "@/components/website-traffic";
import { DayCard } from "@/components/website-traffic/day-card";
import { MonthSummary, WeekStrip } from "@/components/website-traffic/day-context";
import { WeekdayRhythm } from "@/components/website-traffic/weekday-rhythm";
import { TrafficIntro } from "@/components/website-traffic/traffic-intro";
import { glossary } from "@/lib/glossary";
import { parseRange } from "@/lib/date-range";
import type { ActivityDay, ActivityDto } from "@/lib/db/queries";

const DAY = 86_400_000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

/**
 * Fifty-three whole weeks, Sunday 2025-08-31 through Saturday 2026-09-05, so each span has an exact
 * column count to claim: 53, 26 and 13. Three days are pinned to hand-picked values; everything else
 * stays under 80, which makes 2026-08-12 the unique busiest day and so the day the calendar opens on.
 */
const OVERRIDES: Record<string, Partial<ActivityDay>> = {
  "2026-08-12": { value: 900, bookings: 2 },  // Wednesday, the busiest day of the year
  "2026-08-15": { value: 123, bookings: 0 },  // Saturday, the hover target
  "2026-08-19": { value: 456, bookings: 0 },  // Wednesday, one arrow-right from the busiest day
};
const days: ActivityDay[] = Array.from({ length: 371 }, (_, i) => {
  const date = iso(Date.UTC(2025, 7, 31) + i * DAY);
  const value = i < 7 ? null : 20 + ((i * 13) % 60);
  return {
    date,
    value,
    newVisitors: value === null ? null : Math.round(value * 0.7),
    bookings: value === null ? null : i % 9 === 0 ? 1 : 0,
    pagesPerSession: value === null ? null : 3.1,
    ...OVERRIDES[date],
  };
});
const values = days.flatMap((d) => (d.value === null ? [] : [d.value]));
const activity: ActivityDto = {
  metric: "website_visits",
  from: days[0].date,
  to: days[days.length - 1].date,
  weeks: 53,
  max: Math.max(...values),
  total: values.reduce((a, b) => a + b, 0),
  days,
};

/** The original three-column window, kept for the two pure helpers the calendar re-exports. */
const threeWeeks: ActivityDay[] = Array.from({ length: 19 }, (_, i) => {
  const date = iso(Date.UTC(2026, 7, 23) + i * DAY);
  const v: Record<string, number> = { "2026-08-25": 50, "2026-09-02": 97, "2026-09-05": 290, "2026-09-10": 195 };
  return { date, value: date in v ? v[date] : date < "2026-08-25" ? null : 0, newVisitors: null, bookings: null, pagesPerSession: null };
});

const tile = (container: HTMLElement, date: string) => container.querySelector(`[data-date="${date}"]`);
const card = () => screen.getByRole("complementary", { name: "Selected day" });

beforeEach(() => window.localStorage.clear());

describe("heatLevel and monthColumns", () => {
  it("is blank before the data, 0 for a quiet day, then quartiles of the window's own maximum", () => {
    expect(heatLevel(null, 290)).toBeNull();
    expect(heatLevel(0, 290)).toBe(0);
    expect(heatLevel(50, 290)).toBe(1);   // 17% → first quartile
    expect(heatLevel(97, 290)).toBe(2);   // 33%
    expect(heatLevel(195, 290)).toBe(3);  // 67%
    expect(heatLevel(290, 290)).toBe(4);
    expect(heatLevel(7, 0)).toBe(0);      // an all-empty window never divides by zero
  });
  it("labels the column where a month starts and skips a stub at the left edge", () => {
    // Columns start 08-23, 08-30, 09-06: August is a stub (only two columns), September starts at column 3.
    expect(monthColumns(threeWeeks)).toEqual([{ column: 3, label: "Sep" }]);
  });
});

describe("ActivityCalendar", () => {
  it("draws one tile per visible day: six months by default, the whole year on demand", () => {
    const { container } = render(<ActivityCalendar activity={activity} />);
    expect(screen.getByRole("heading", { level: 2, name: "Every day people visited" })).toBeInTheDocument();
    expect(container.querySelectorAll("[data-date]")).toHaveLength(182); // 26 columns
    expect(tile(container, "2026-03-07")).toBeNull();                    // the Saturday before the half-year window
    fireEvent.click(screen.getByRole("radio", { name: "Year" }));
    expect(container.querySelectorAll("[data-date]")).toHaveLength(371); // all 53 columns
    expect(window.localStorage.getItem("autumn:calendar-span")).toBe("year");
  });

  it("13 weeks draws thirteen columns and writes the number inside each tile", () => {
    const { container } = render(<ActivityCalendar activity={activity} />);
    fireEvent.click(screen.getByRole("radio", { name: "13 weeks" }));
    const tiles = container.querySelectorAll("[data-date]");
    expect(tiles).toHaveLength(91);
    expect(Math.ceil(tiles.length / 7)).toBe(13);
    expect(tile(container, "2026-06-07")).not.toBeNull();  // the window's first Sunday
    expect(tile(container, "2026-06-06")).toBeNull();      // the day before it
    expect(tile(container, "2026-08-19")?.textContent).toBe("456");
    expect(tile(container, "2026-08-12")?.textContent).toBe("900");
  });

  it("opens on the busiest visible day and keeps the day that is clicked", () => {
    const { container } = render(<ActivityCalendar activity={activity} />);
    expect(tile(container, "2026-08-12")?.getAttribute("aria-pressed")).toBe("true");
    expect(within(card()).getByText("Kept open")).toBeInTheDocument();
    fireEvent.click(tile(container, "2026-08-19")!);
    expect(tile(container, "2026-08-19")?.getAttribute("aria-pressed")).toBe("true");
    expect(tile(container, "2026-08-12")?.getAttribute("aria-pressed")).toBe("false");
    expect(within(card()).getByText("Wed, Aug 19, 2026")).toBeInTheDocument();
    expect(within(card()).getByText("456")).toBeInTheDocument();
  });

  it("reads the day under the pointer into the header and the card, without losing the kept day", () => {
    const { container } = render(<ActivityCalendar activity={activity} />);
    fireEvent.pointerMove(tile(container, "2026-08-15")!);
    expect(screen.getByText("Sat, Aug 15")).toBeInTheDocument();
    expect(screen.getByText("123 visits")).toBeInTheDocument();
    expect(within(card()).getByText("Pointing at")).toBeInTheDocument();
    expect(within(card()).getByText("Sat, Aug 15, 2026")).toBeInTheDocument();
    fireEvent.pointerLeave(screen.getByRole("grid"));
    expect(within(card()).getByText("Kept open")).toBeInTheDocument();
    expect(within(card()).getByText("Wed, Aug 12, 2026")).toBeInTheDocument();
  });

  it("walks the kept day with the arrow keys: sideways a week, down a day", () => {
    const { container } = render(<ActivityCalendar activity={activity} />);
    fireEvent.keyDown(screen.getByRole("grid"), { key: "ArrowRight" });
    expect(tile(container, "2026-08-19")?.getAttribute("aria-pressed")).toBe("true");
    expect(tile(container, "2026-08-19")?.getAttribute("tabindex")).toBe("0");
    fireEvent.keyDown(screen.getByRole("grid"), { key: "ArrowDown" });
    expect(tile(container, "2026-08-20")?.getAttribute("aria-pressed")).toBe("true");
    fireEvent.keyDown(screen.getByRole("grid"), { key: "ArrowLeft" });
    expect(tile(container, "2026-08-13")?.getAttribute("aria-pressed")).toBe("true");
    fireEvent.keyDown(screen.getByRole("grid"), { key: "End" });
    expect(tile(container, "2026-09-05")?.getAttribute("aria-pressed")).toBe("true");
  });

  it("colours tiles and nothing else: no inner rings, and a smaller corner on a year's tiles", () => {
    // The amber booking ring was removed on 2026-09-17: nearly every day books, so it covered the
    // whole grid. Tiles carry colour and a corner, never an inset shadow.
    const { container } = render(<ActivityCalendar activity={activity} />);
    for (const t of container.querySelectorAll("[data-date]")) expect(t.className).not.toContain("inset");
    expect(tile(container, "2026-08-12")?.className).toContain("rounded-(--radius-min)"); // half span
    fireEvent.click(screen.getByRole("radio", { name: "Year" }));
    expect(tile(container, "2026-08-12")?.className).toContain("rounded-(--radius-tile)"); // a 4px corner on a 10px tile reads as a circle
    for (const t of container.querySelectorAll("[data-date]")) expect(t.className).not.toContain("inset");
  });

  it("shows the kept day's week and its month beside the grid", () => {
    render(<ActivityCalendar activity={activity} />);
    const strip = screen.getByText("The week of Aug 9").parentElement as HTMLElement;
    expect(within(strip).getAllByRole("button")).toHaveLength(7);
    expect(within(strip).getByRole("button", { name: "Wed, Aug 12: 900 visits" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Aug 2026")).toBeInTheDocument();
  });
});

describe("WeekStrip", () => {
  const week = days.filter((d) => d.date >= "2026-08-09" && d.date <= "2026-08-15");
  it("renders a column per day and presses the kept one", () => {
    const picked: string[] = [];
    render(<WeekStrip days={week} pinned="2026-08-12" onPick={(d) => picked.push(d)} unit="visits" />);
    expect(screen.getAllByRole("button")).toHaveLength(7);
    expect(screen.getByRole("button", { name: "Wed, Aug 12: 900 visits" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Sat, Aug 15: 123 visits" }).getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "Sat, Aug 15: 123 visits" }));
    expect(picked).toEqual(["2026-08-15"]);
  });
  it("leaves a day the data does not cover as an empty column", () => {
    render(<WeekStrip days={[null, ...week.slice(1)]} pinned={null} onPick={() => {}} unit="visits" />);
    expect(screen.getAllByRole("button")).toHaveLength(6);
    expect(screen.getByText("The week of Aug 10")).toBeInTheDocument();
  });
});

describe("MonthSummary", () => {
  it("names the rank and compares with the month before", () => {
    const { rerender } = render(<MonthSummary label="Sep 2026" total={1200} rank={1} count={12} deltaPct={12} unit="visits" />);
    expect(screen.getByText("1,200")).toBeInTheDocument();
    expect(screen.getByText("Your busiest month of the year")).toBeInTheDocument();
    expect(screen.getByText("+12% vs the month before")).toBeInTheDocument();
    rerender(<MonthSummary label="Sep 2026" total={1200} rank={3} count={12} deltaPct={-4} unit="visits" />);
    expect(screen.getByText("3rd busiest of 12 months")).toBeInTheDocument();
    expect(screen.getByText("-4% vs the month before")).toBeInTheDocument();
    rerender(<MonthSummary label="Sep 2025" total={40} rank={12} count={12} deltaPct={null} unit="visits" />);
    expect(screen.getByText("12th busiest of 12 months")).toBeInTheDocument();
    expect(screen.getByText("No month before it in the data")).toBeInTheDocument();
  });
});

describe("WeekdayRhythm", () => {
  it("orders the weekdays Monday first and says how far apart the ends are", () => {
    const averages = [40, 30, 20, 25, 35, 50, 60].map((average, weekday) => ({ weekday, average }));
    render(<WeekdayRhythm averages={averages} />);
    expect(screen.getAllByText(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/).map((e) => e.textContent)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    // `times` from format.ts drops a decimal that says nothing, so an exact 3 reads "3×", not "3.0×".
    expect(screen.getByText("Saturdays bring 3× a Tuesday.")).toBeInTheDocument(); // 60 / 20
  });
  it("says nothing about the ratio when a weekday has no traffic at all", () => {
    render(<WeekdayRhythm averages={[0, 30, 20, 25, 35, 50, 60].map((average, weekday) => ({ weekday, average }))} />);
    expect(screen.queryByText(/bring/)).toBeNull();
  });
});

describe("DayCard", () => {
  it("reads one day out against a typical one of the same weekday", () => {
    const day = days.find((d) => d.date === "2026-08-12") as ActivityDay;
    render(<DayCard day={day} typical={600} mode="pinned" unit="visits" />);
    expect(screen.getByText("Wed, Aug 12, 2026")).toBeInTheDocument();
    expect(screen.getByText("900")).toBeInTheDocument();
    expect(screen.getByText("+50% vs a typical Wed")).toBeInTheDocument(); // (900 − 600) / 600
    expect(screen.getByText("A typical Wednesday brings 600 visits.")).toBeInTheDocument();
    expect(screen.getByText("1 in 450 visits booked")).toBeInTheDocument(); // 2 bookings in 900 visits
  });
  it("asks for a day when none is chosen", () => {
    render(<DayCard day={null} typical={null} mode="pinned" unit="visits" />);
    expect(screen.getByText("Pick a day")).toBeInTheDocument();
    expect(screen.getByText("Kept open")).toBeInTheDocument();
    expect(screen.queryByRole("meter")).toBeNull();
  });
  it("renders an em dash for a day the data does not cover", () => {
    render(<DayCard day={{ date: "2025-08-31", value: null, newVisitors: null, bookings: null, pagesPerSession: null }} typical={null} mode="hover" unit="visits" />);
    expect(screen.getByText("Pointing at")).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(4);
  });
});

describe("TrafficIntro", () => {
  // One word for one thing (design audit 2026-09-17, item 10): the headline calls an ad-driven visit
  // what the glossary calls it, and says where first-time visitors come from in the glossary's own
  // words. Rewording either entry without following it here turns this red.
  const range = parseRange("30d", "2024-09-17", "2026-09-16");
  it("names visits the way the glossary does and keeps new visitors separate from them", () => {
    render(<TrafficIntro range={range} totals={{ visits: 1548, newVisitors: 1116, previousVisits: 1402 }} />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("1,548 people visited your site from Autumn's ads. 1,116 first-time visitors came from any source, not only ads.");
    expect(glossary.website_visits.label).toBe("Visited your site");
    expect(h1.textContent).toContain(glossary.website_visits.label.toLowerCase());
    expect(glossary.new_visitors.meaning).toContain("from any source, not only ads");
    expect(h1.textContent).toContain("from any source, not only ads");
  });
});
