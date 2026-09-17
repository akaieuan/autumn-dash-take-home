// @vitest-environment jsdom
// tests/components/charts.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, renderHook, act } from "@testing-library/react";
import {
  Meter,
  Sparkline,
  ChartLegend,
  TrendTable,
  TrendChart,
  useChartStyle,
  StyleSegment,
  METRIC_ORDER,
  METRIC_LABELS,
} from "@/components/charts";
import type { ChartMetric, ChartPoint } from "@/components/charts";
import { TREND_METRICS } from "@/lib/db/queries";
import type { TrendMetric, TrendPoint } from "@/lib/db/queries";

const metric: TrendMetric = "booking_value";
const granularity = "day" as const;
const points: TrendPoint[] = [
  { bucket: "2026-09-01", current: 0, previous: 0, lastYear: 0 },
  { bucket: "2026-09-02", current: 100000, previous: 0, lastYear: 0 },
  { bucket: "2026-09-03", current: 0, previous: 90000, lastYear: 20000 },
];

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
  it("TrendTable is the chart's twin: one row per bucket, money formatted, change and totals", () => {
    render(<TrendTable metric="booking_value" granularity="day" points={points} prevLabel="Previous 10 days" lastYearLabel="Same days last year" />);
    expect(screen.getByRole("row", { name: /Sep 3/ })).toHaveTextContent("$0$900-100%$200"); // 0 vs 900 → −100%
    expect(screen.getByRole("row", { name: /Sep 2/ })).toHaveTextContent("$1,000$0—$0");     // no previous → no change
    const total = screen.getAllByRole("row").at(-1)!;
    expect(total).toHaveTextContent("Total$1,000$900+11%$200");                            // 100000 vs 90000 → +11%
  });
  it("TrendChart renders an accessible figure, a legend and the table twin", () => {
    render(<TrendChart metric={metric} granularity={granularity} points={points} prevLabel="Previous 10 days" lastYearLabel="Same days last year" />);
    expect(screen.getByRole("figure", { name: "Booking value, day by day" })).toBeInTheDocument();
    expect(screen.getAllByText("Previous 10 days").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("radio", { name: "Table" })); // the table twin swaps into the same box
    expect(screen.getByRole("row", { name: /Sep 3/ })).toBeInTheDocument();
    expect(screen.queryByRole("figure", { name: "Booking value, day by day" })).not.toBeNull();
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

/** True only when the two types are mutually assignable, so a widened or narrowed copy is an error. */
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

describe("the chart layer's copy of the trend contract", () => {
  // src/components/charts/chart-config.ts declares METRIC_ORDER, ChartMetric and ChartPoint
  // itself, because MetricSelect and TrendChart are client components and a value import of
  // TREND_METRICS would pull the query layer (Drizzle, postgres-js) into the browser bundle —
  // which tests/architecture.test.ts forbids under src/components. These are the drift alarms:
  // they go red the day the query layer adds, removes, renames or reorders a metric, or changes
  // a field of TrendPoint, without the chart layer following.
  it("METRIC_ORDER is exactly the query layer's TREND_METRICS, in order", () => {
    expect(METRIC_ORDER).toEqual([...TREND_METRICS]);
  });
  it("every metric the query layer can return has a plain-language label", () => {
    for (const m of TREND_METRICS) expect(METRIC_LABELS[m]).toBeTruthy();
  });
  it("ChartMetric and ChartPoint are exactly TrendMetric and TrendPoint (checked by tsc)", () => {
    const sameMetric: Exact<ChartMetric, TrendMetric> = true;
    const samePoint: Exact<ChartPoint, TrendPoint> = true;
    expect([sameMetric, samePoint]).toEqual([true, true]);
  });
});
