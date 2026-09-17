// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ActivityCalendar, heatLevel, monthColumns } from "@/components/website-traffic";
import type { ActivityDto } from "@/lib/db/queries";

const activity: ActivityDto = {
  metric: "website_visits", from: "2026-08-23", to: "2026-09-10", weeks: 3, max: 290, total: 632,
  days: Array.from({ length: 19 }, (_, i) => {
    const d = new Date(Date.UTC(2026, 7, 23 + i)).toISOString().slice(0, 10);
    const v: Record<string, number> = { "2026-08-25": 50, "2026-09-02": 97, "2026-09-05": 290, "2026-09-10": 195 };
    return { date: d, value: d in v ? v[d] : d < "2026-08-25" ? null : 0 };
  }),
};

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
    expect(monthColumns(activity.days)).toEqual([{ column: 3, label: "Sep" }]);
  });
});

describe("ActivityCalendar", () => {
  it("draws one cell per day, sums the year and reads the hovered day into the header", () => {
    const { container } = render(<ActivityCalendar activity={activity} />);
    expect(screen.getByRole("heading", { level: 2, name: "Every day of the last year" })).toBeInTheDocument();
    const cells = container.querySelectorAll("[data-date]");
    expect(cells).toHaveLength(19);
    expect(container.querySelector("[data-date='2026-09-05']")?.getAttribute("data-level")).toBe("4");
    expect(container.querySelector("[data-date='2026-08-23']")?.getAttribute("data-level")).toBeNull(); // before the data: blank
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain("632 visits");
    expect(screen.getByText("Point at a day")).toBeInTheDocument();
    fireEvent.pointerMove(container.querySelector("[data-date='2026-09-05']")!);
    expect(screen.getByText("Sat, Sep 5")).toBeInTheDocument();
    expect(screen.getByText("290 visits")).toBeInTheDocument();
    fireEvent.pointerLeave(screen.getByRole("img"));
    expect(screen.getByText("Point at a day")).toBeInTheDocument();
  });
});
