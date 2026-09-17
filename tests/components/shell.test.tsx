// @vitest-environment jsdom
// tests/components/shell.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RangeSegment, TopBar } from "@/components/layout";

describe("RangeSegment", () => {
  it("is five links that carry the range in the URL, with the current one marked", () => {
    render(<RangeSegment current="90d" basePath="/" metric="website_visits" />);
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "/?range=30d&metric=website_visits",
      "/?range=90d&metric=website_visits",
      "/?range=ytd&metric=website_visits",
      "/?range=12m&metric=website_visits",
      "/?range=all&metric=website_visits",
    ]);
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
