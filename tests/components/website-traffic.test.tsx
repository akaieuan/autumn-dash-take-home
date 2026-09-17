// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { ActivityCalendar, heatLevel, monthColumns } from "@/components/website-traffic";
import { DayCard } from "@/components/website-traffic/day-card";
import { WeekdayRhythm } from "@/components/website-traffic/weekday-rhythm";
import { TrafficIntro } from "@/components/website-traffic/traffic-intro";
import { parseRange, type RangePreset } from "@/lib/date-range";
import type { ActivityDay, ActivityDto } from "@/lib/db/queries";

const DAY = 86_400_000;
const at = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
/** Local, so no fixture below borrows the helper the component under test also uses. */
const weekdayOfDate = (d: string) => new Date(at(d)).getUTCDay();

const OVERRIDES: Record<string, Partial<ActivityDay>> = {
  "2026-08-12": { value: 900, bookings: 2 },  // Wednesday, the busiest day in every window below
  "2026-08-15": { value: 123, bookings: 0 },  // Saturday, the hover target
  "2026-08-19": { value: 456, bookings: 0 },  // Wednesday, one arrow-right from the busiest day
};

/** Values a reader can recompute: 20..79 on a 13-step cycle, with three days pinned by hand. */
function makeDays(from: string, length: number): ActivityDay[] {
  return Array.from({ length }, (_, i) => {
    const date = iso(at(from) + i * DAY);
    const value = 20 + ((i * 13) % 60);
    return { date, value, newVisitors: Math.round(value * 0.7), bookings: i % 9 === 0 ? 1 : 0, pagesPerSession: 3.1, ...OVERRIDES[date] };
  });
}

/** One DTO and the `?range=` that produced it: the calendar draws the page range, so each mode needs both. */
function fixture(preset: RangePreset, from: string, length: number) {
  const days = makeDays(from, length);
  const values = days.map((d) => d.value as number);
  const to = days[days.length - 1].date;
  const activity: ActivityDto = {
    metric: "website_visits", from, to,
    weeks: Math.ceil((weekdayOfDate(from) + length) / 7),
    max: Math.max(...values), total: values.reduce((a, b) => a + b, 0), days,
  };
  return { activity, range: { preset, from, to } };
}

// 2026-08-18 is a Tuesday: two blanks lead the month grid, and 2 + 30 = 32 fills five rows of seven (35 cells, 3 trailing).
const d30 = fixture("30d", "2026-08-18", 30);
// 2026-06-15 is a Monday: one leading blank + 90 days = 91 cells, exactly thirteen columns of seven.
const d90 = fixture("90d", "2026-06-15", 90);
// 2026-01-01..2026-09-16 is nine calendar months and 259 days (31+28+31+30+31+30+31+31+16).
const dYtd = fixture("ytd", "2026-01-01", 259);
// 365 days from 2025-09-17 touch thirteen calendar months; the block grid draws the twelve whole ones.
const d12m = fixture("12m", "2025-09-17", 365);
// 730 days from 2024-09-17 touch twenty-five; the block grid draws twenty-four, 12 x 2.
const dAll = fixture("all", "2024-09-17", 730);

const days = d12m.activity.days;

/** The original three-column window, kept for the two pure helpers the calendar re-exports. */
const threeWeeks: ActivityDay[] = Array.from({ length: 19 }, (_, i) => {
  const date = iso(Date.UTC(2026, 7, 23) + i * DAY);
  const v: Record<string, number> = { "2026-08-25": 50, "2026-09-02": 97, "2026-09-05": 290, "2026-09-10": 195 };
  return { date, value: date in v ? v[date] : date < "2026-08-25" ? null : 0, newVisitors: null, bookings: null, pagesPerSession: null };
});

const tile = (c: HTMLElement, date: string) => c.querySelector(`[data-date="${date}"]`);
const card = () => screen.getByRole("complementary", { name: "Selected day" });
const cells = (c: HTMLElement) => [...c.querySelectorAll<HTMLElement>("[data-date]")];
const blocks = (c: HTMLElement) => [...c.querySelectorAll<HTMLElement>("[data-busiest]")];
const dayStage = (c: HTMLElement) => c.querySelector<HTMLElement>("[data-stage=days]");
const dayGrid = (c: HTMLElement) => c.querySelector<HTMLElement>("[data-grid=days]");
const blockStage = (c: HTMLElement) => c.querySelector<HTMLElement>("[data-stage=blocks]");
const blockGrid = (c: HTMLElement) => c.querySelector<HTMLElement>("[data-grid=blocks]");
const legend = (c: HTMLElement) => c.querySelector<HTMLElement>("[data-legend]") as HTMLElement;

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

describe("DayCard band", () => {
  it("is a horizontal band with a fixed height, so it never squeezes the grid beside it", () => {
    render(<DayCard day={days[0]} typical={40} mode="pinned" unit="visits" rank={{ day: 3, days: 90, weekday: 2, weekdays: 13 }} />);
    const band = card();
    expect(band.className).toContain("min-h-(--card-day-stacked)"); // cells two abreast when narrow
    expect(band.className).toContain("@lg:min-h-(--card-day)");     // two rows once its container is 32rem
    expect(band.firstElementChild?.className).toContain("@lg:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))]");
  });
  it("reads the day's rank as one line: where it sits in the range and among its own weekday", () => {
    const day = days.find((d) => d.date === "2026-08-12") as ActivityDay;
    render(<DayCard day={day} typical={600} mode="pinned" unit="visits" rank={{ day: 3, days: 90, weekday: 2, weekdays: 13 }} />);
    expect(screen.getByText("3rd of 90 days · 2nd of 13 Wednesdays")).toBeInTheDocument();
  });
  it("renders the same blocks for a full day, a day with no typical weekday and no rank, and no day at all", () => {
    const full = render(<DayCard day={{ date: "2026-09-05", value: 290, newVisitors: 200, bookings: 2, pagesPerSession: 3.4 }} typical={120} mode="pinned" unit="visits" rank={{ day: 3, days: 371, weekday: 1, weekdays: 53 }} />);
    const count = (c: HTMLElement) => c.querySelectorAll("aside > *").length;
    const notes = (c: HTMLElement) => c.querySelectorAll("aside .text-\\[11px\\]").length;
    const a = { blocks: count(full.container), notes: notes(full.container) };
    full.unmount();
    const bare = render(<DayCard day={{ date: "2026-09-06", value: 0, newVisitors: null, bookings: null, pagesPerSession: null }} typical={0} mode="hover" unit="visits" rank={null} />);
    expect(count(bare.container)).toBe(a.blocks);   // typical and rank blocks are always there
    expect(notes(bare.container)).toBe(a.notes);    // every stat keeps its note line
    expect(screen.getByText("No typical Sunday to compare with yet.")).toBeInTheDocument();
  });
});

describe("ActivityCalendar", () => {
  it("draws thirty days as five columns of squares, blanks before the first day, never a calendar of tiles", () => {
    // 2026-08-18 is a Tuesday: two blanks lead, and 2 + 30 = 32 cells fill five columns of seven.
    const { container } = render(<ActivityCalendar {...d30} />);
    const grid = dayGrid(container) as HTMLElement;
    expect(grid.children).toHaveLength(32);
    expect(grid.querySelectorAll("[data-blank]")).toHaveLength(2);
    expect(cells(container)).toHaveLength(30);
    expect(grid.className).toContain("grid-rows-7");
    expect(container.querySelectorAll("[data-weekday-head]")).toHaveLength(0);
    expect(tile(container, "2026-08-18")?.textContent).toBe("");                 // no number inside a square
    // The grid is capped at 1.5rem a square, so five columns stay a compact block beside the legend.
    const cap = dayStage(container)?.getAttribute("style") as string;
    expect(cap).toContain("max-width: calc(");
    expect(cap).toContain("7.5rem");   // 5 × 1.5rem of squares
    expect(cap).toContain("12px");     // 4 gaps of 3px
    expect(blocks(container)).toHaveLength(0);
  });

  it("draws thirteen columns of day squares for 90 days, with nothing written inside a square", () => {
    const { container } = render(<ActivityCalendar {...d90} />);
    const grid = dayGrid(container) as HTMLElement;
    expect(grid.children).toHaveLength(91);                                  // 1 leading blank + 90 days
    expect(grid.querySelectorAll("[data-blank]")).toHaveLength(1);
    expect(Math.ceil(grid.children.length / 7)).toBe(13);
    expect(cells(container)).toHaveLength(90);
    expect(tile(container, "2026-08-12")?.textContent).toBe("");
    const cap = dayStage(container)?.getAttribute("style") as string;
    expect(cap).toContain("19.5rem");  // 13 × 1.5rem of squares
    expect(cap).toContain("36px");     // 12 gaps of 3px
    expect(blocks(container)).toHaveLength(0);
  });

  it("keeps day squares wide and falls back to one block per month narrow, for year to date", () => {
    const { container } = render(<ActivityCalendar {...dYtd} />);
    expect(cells(container)).toHaveLength(259);
    expect(dayStage(container)?.className).toContain("hidden @2xl:grid");
    expect(blocks(container)).toHaveLength(9);                               // Jan..Sep
    expect(blockStage(container)?.className).toContain("@2xl:hidden");
    expect(blockGrid(container)?.className).toContain("grid-cols-4");        // 7..12 blocks
  });

  it("draws a year of squares wide and twelve month blocks narrow", () => {
    const { container } = render(<ActivityCalendar {...d12m} />);
    expect(cells(container)).toHaveLength(365);
    expect(dayStage(container)?.className).toContain("hidden @2xl:grid");
    expect(blocks(container)).toHaveLength(12);
    expect(blockStage(container)?.className).toContain("@2xl:hidden");
    expect(blockGrid(container)?.className).toContain("grid-cols-4");        // 4 x 3
  });

  it("is month blocks at every width for the whole history: twenty-four of them and no day grid at all", () => {
    const { container } = render(<ActivityCalendar {...dAll} />);
    expect(cells(container)).toHaveLength(0);
    expect(dayStage(container)).toBeNull();
    expect(blocks(container)).toHaveLength(24);
    expect(blockStage(container)?.className).not.toContain("hidden");
    expect(blockGrid(container)?.className).toContain("grid-cols-6");        // 6 x 4 on a phone
    expect(blockGrid(container)?.className).toContain("@2xl:grid-cols-12");  // a year a row when there is room
  });

  it("carries the readout in the header and nothing else: no span toggle, no description", () => {
    const { container } = render(<ActivityCalendar {...d90} />);
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(screen.queryByText(/13 weeks/)).toBeNull();
    const h2 = screen.getByRole("heading", { level: 2, name: "Every day people visited" });
    expect(h2.parentElement?.querySelectorAll("p")).toHaveLength(0);
    const readout = container.querySelector("#activity p[aria-live]") as HTMLElement;
    expect(readout.className).toContain("basis-full");   // own line, left aligned, on a phone
    expect(readout.className).toContain("sm:w-52");      // fixed width from sm, so nothing beside it slides
    expect(readout.className).toContain("sm:justify-end");
  });

  it("names the total and the days it covers in the legend, and never a busiest day", () => {
    const { container } = render(<ActivityCalendar {...d90} />);
    expect(legend(container).textContent).toMatch(/^[\d,]+ visits · Jun 15 – Sep 12, 2026/);
    expect(legend(container).textContent).not.toContain("busiest");
  });

  it("opens on the busiest day of the range and keeps the day that is clicked", () => {
    const { container } = render(<ActivityCalendar {...d90} />);
    expect(tile(container, "2026-08-12")?.getAttribute("aria-pressed")).toBe("true");
    expect(within(card()).getByText("Kept open")).toBeInTheDocument();
    fireEvent.click(tile(container, "2026-08-19")!);
    expect(tile(container, "2026-08-19")?.getAttribute("aria-pressed")).toBe("true");
    expect(tile(container, "2026-08-12")?.getAttribute("aria-pressed")).toBe("false");
    expect(within(card()).getByText("Wed, Aug 19, 2026")).toBeInTheDocument();
    expect(within(card()).getByText("456")).toBeInTheDocument();
  });

  it("reads the day under the pointer into the header and the band, without losing the kept day", () => {
    const { container } = render(<ActivityCalendar {...d90} />);
    fireEvent.pointerMove(tile(container, "2026-08-15")!);
    expect(screen.getByText("Sat, Aug 15")).toBeInTheDocument();
    expect(screen.getByText("123 visits")).toBeInTheDocument();
    expect(within(card()).getByText("Pointing at")).toBeInTheDocument();
    expect(within(card()).getByText("Sat, Aug 15, 2026")).toBeInTheDocument();
    fireEvent.pointerLeave(dayGrid(container) as HTMLElement);
    expect(within(card()).getByText("Kept open")).toBeInTheDocument();
    expect(within(card()).getByText("Wed, Aug 12, 2026")).toBeInTheDocument();
  });

  it("walks the kept day with the arrow keys: sideways a week, down a day", () => {
    const { container } = render(<ActivityCalendar {...d90} />);
    const grid = dayGrid(container) as HTMLElement;
    fireEvent.keyDown(grid, { key: "ArrowRight" });
    expect(tile(container, "2026-08-19")?.getAttribute("aria-pressed")).toBe("true");
    expect(tile(container, "2026-08-19")?.getAttribute("tabindex")).toBe("0");
    fireEvent.keyDown(grid, { key: "ArrowDown" });
    expect(tile(container, "2026-08-20")?.getAttribute("aria-pressed")).toBe("true");
    fireEvent.keyDown(grid, { key: "ArrowLeft" });
    expect(tile(container, "2026-08-13")?.getAttribute("aria-pressed")).toBe("true");
    fireEvent.keyDown(grid, { key: "End" });
    expect(tile(container, "2026-09-12")?.getAttribute("aria-pressed")).toBe("true");
  });

  it("colours tiles and nothing else: no inner rings, and a smaller corner where a square is 10px", () => {
    // The amber booking ring was removed on 2026-09-17: nearly every day books, so it covered the
    // whole grid. Tiles carry colour and a corner, never an inset shadow.
    const ninety = render(<ActivityCalendar {...d90} />);
    for (const t of cells(ninety.container)) expect(t.className).not.toContain("inset");
    expect(tile(ninety.container, "2026-08-12")?.className).toContain("rounded-(--radius-min)");
    ninety.unmount();
    const year = render(<ActivityCalendar {...d12m} />);
    expect(tile(year.container, "2026-08-12")?.className).toContain("rounded-(--radius-tile)"); // 53 columns: a 4px corner on a 10px square reads as a circle
    for (const t of cells(year.container)) expect(t.className).not.toContain("inset");
  });

  it("reads the kept day's week and its month out in the band, as figures rather than a chart", () => {
    render(<ActivityCalendar {...d90} />);
    const band = card();
    // The week of Sunday Aug 9: 75 + 28 + 41 + 900 + 67 + 20 + 123 = 1,254, and Wednesday's 900 is the top.
    expect(within(band).getByText("The week of Aug 9")).toBeInTheDocument();
    expect(within(band).getByText("1,254")).toBeInTheDocument();
    expect(within(band).getByText("busiest on Wednesday")).toBeInTheDocument();
    // August is 2,853 against July's 1,593: the busiest of the four months, +79%.
    expect(within(band).getByText("Aug 2026")).toBeInTheDocument();
    expect(within(band).getByText("2,853")).toBeInTheDocument();
    expect(within(band).getByText("Your busiest month · +79% vs the month before")).toBeInTheDocument();
    expect(within(band).queryAllByRole("button")).toHaveLength(0); // figures, not the week strip's bars
  });

  it("keeps a month block's tap on the day it stands for", () => {
    const { container } = render(<ActivityCalendar {...dAll} />);
    const august = blocks(container).find((b) => b.getAttribute("data-busiest")?.startsWith("2026-08")) as HTMLElement;
    fireEvent.click(august);
    expect(august.getAttribute("aria-pressed")).toBe("true");
    expect(within(card()).getByText("Wed, Aug 12, 2026")).toBeInTheDocument(); // the month's busiest day
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
    expect(screen.getByText("A typical Wednesday")).toBeInTheDocument();
    expect(screen.getByText("600")).toBeInTheDocument();
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
    expect(screen.getAllByText("—")).toHaveLength(7); // four readings, then the typical day, the week and the month; the rank is one line, and it says so in words
  });
});

describe("TrafficIntro", () => {
  // The headline states ads' visits as a share of every visit the site had (main, 2026-09-17): the same
  // unit on both sides and the scope said out loud, so the share is real. Never a share of new visitors.
  const range = parseRange("30d", "2024-09-17", "2026-09-16");
  it("states ads' visits as one-in-N of all visits, and never as a share of new visitors", () => {
    render(<TrafficIntro range={range} totals={{ visits: 1548, allVisits: 6192, newVisitors: 1116, previousVisits: 1402 }} />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("1,548 people came to your website from Autumn's ads, about 1 in 4 of the 6,192 visits your site had in all.");
    expect(h1.textContent).not.toContain("1,116");
  });
  it("drops the share when the site total is unknown", () => {
    render(<TrafficIntro range={range} totals={{ visits: 1548, allVisits: 0, newVisitors: 1116, previousVisits: null }} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("1,548 people came to your website from Autumn's ads.");
  });
});
