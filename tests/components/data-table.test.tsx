// @vitest-environment jsdom
// tests/components/data-table.test.tsx
//
// The one table primitive (design audit 2026-09-17, item 2). Six tables used to exist in two
// dialects — three `div role="table"` grids and three shadcn tables with their own scroll box —
// and each re-declared the pinned header, the column gating and the numeric cell. This file pins
// the primitive itself: everything the six callers rely on, asserted once, on a fixture that owes
// nothing to any of them.
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { DataTable, type DataColumn } from "@/components/charts";

interface Row {
  city: string;
  visits: number;
  bookings: number;
  spend: number;
}

const rows: Row[] = [
  { city: "South Haven, MI", visits: 377, bookings: 14, spend: 1200 },
  { city: "Chicago, IL", visits: 202, bookings: 9, spend: 800 },
];

const columns: DataColumn<Row>[] = [
  { key: "city", header: "City", cell: (r) => r.city },
  { key: "visits", header: "Visits", align: "right", cell: (r) => r.visits },
  { key: "bookings", header: "Bookings", align: "right", hideBelow: "md", cell: (r) => r.bookings },
  { key: "spend", header: "Spend", align: "right", hideBelow: "3xl", width: "20%", cell: (r) => r.spend },
];

const table = (extra?: Partial<React.ComponentProps<typeof DataTable<Row>>>) =>
  render(
    <DataTable
      label="Cities sending bookings"
      columns={columns}
      rows={rows}
      rowKey={(r) => r.city}
      rowLabel={(r) => r.city}
      {...extra}
    />,
  );

describe("DataTable", () => {
  it("is a labelled table with one row per record, named by rowLabel", () => {
    table();
    expect(screen.getByRole("table", { name: "Cities sending bookings" })).toBeInTheDocument();
    const row = screen.getByRole("row", { name: "South Haven, MI" });
    expect(within(row).getByText("377")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3); // header + two cities, no footer
    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["City", "Visits", "Bookings", "Spend"]);
  });

  it("right-aligned columns carry the numeric class on the header and on every cell", () => {
    table();
    const head = screen.getByRole("columnheader", { name: "Visits" });
    expect(head.className).toContain("text-right");
    expect(head.className).toContain("tabular-nums");
    const cell = within(screen.getByRole("row", { name: "Chicago, IL" })).getByText("202");
    expect(cell.className).toContain("text-right");
    expect(cell.className).toContain("tabular-nums");
  });

  it("hides a column below its breakpoint with a container query, on the header and the cells alike", () => {
    table();
    expect(screen.getByRole("columnheader", { name: "Bookings" }).className).toContain("hidden @md:table-cell");
    expect(screen.getByRole("columnheader", { name: "Spend" }).className).toContain("hidden @3xl:table-cell");
    const cell = within(screen.getByRole("row", { name: "Chicago, IL" })).getByText("9");
    expect(cell.className).toContain("hidden @md:table-cell");
    // The first column is never gated and never nowrap: a long city name wraps rather than widening
    // the table past its box (the efficiency table's overflow fix, now everyone's).
    const city = within(screen.getByRole("row", { name: "Chicago, IL" })).getByText("Chicago, IL");
    expect(city.className).not.toContain("whitespace-nowrap");
  });

  it("renders a footer row only when a column declares one", () => {
    const { unmount } = table();
    expect(screen.queryByRole("row", { name: "All cities" })).toBeNull();
    unmount();
    const withFoot = columns.map((c) => (c.key === "city" ? { ...c, foot: "All cities" } : c.key === "visits" ? { ...c, foot: 579 } : c));
    table({ columns: withFoot, footLabel: "All cities" });
    const foot = screen.getByRole("row", { name: "All cities" });
    expect(foot).toHaveTextContent("All cities579");
    expect(screen.getAllByRole("row")).toHaveLength(4); // header + two cities + footer
  });

  it("spans a group header over its own columns only, and gates it with them", () => {
    table({ group: { label: "What Autumn spent", from: "bookings", to: "spend", hideBelow: "3xl" } });
    const group = screen.getAllByRole("row")[0];
    expect(group.className).toContain("hidden @3xl:table-row");
    const cells = within(group).getAllByRole("columnheader");
    expect(cells.map((c) => c.getAttribute("colspan"))).toEqual(["2", "2"]);
    expect(cells[0].textContent).toBe("");                     // City and Visits are not Autumn's money
    expect(cells[1].textContent).toBe("What Autumn spent");
    expect(screen.getAllByRole("row")[1]).toHaveTextContent("City"); // the column names stay under it
  });

  it("fills a flex parent only when asked to", () => {
    const { container, unmount } = table({ fill: true });
    const box = container.firstElementChild as HTMLElement;
    expect(box.className).toContain("flex-1");
    expect(box.className).toContain("basis-0");
    expect(box.className).toContain("min-h-(--plot-height)");
    unmount();
    const natural = table().container.firstElementChild as HTMLElement;
    expect(natural.className).not.toContain("flex-1");
    expect(natural.className).toContain("overflow-auto");
  });
});
