// @vitest-environment jsdom
// tests/components/shell.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RangeSegment, TopBar, SidebarProvider } from "@/components/layout";

// The narrow-screen range dropdown navigates with the App Router; tests render outside one.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

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
  it("names the section, the two screens and the data date", () => {
    render(<TooltipProvider><SidebarProvider initialState="expanded"><TopBar active="overview" range="30d" dataThrough="2026-09-16" basePath="/" /></SidebarProvider></TooltipProvider>);
    expect(screen.queryByText("Dashboard")).toBeNull(); // the bar carries only the tabs and controls
    expect(screen.queryByRole("button", { name: /sidebar/ })).toBeNull(); // the collapse control lives in the sidebar now
    expect(screen.getByRole("link", { name: "Overview" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Website Traffic" }).getAttribute("href")).toBe("/website-traffic?range=30d");
    expect(screen.getByText("Data through Sep 16, 2026")).toBeInTheDocument();
  });
  it("renders same-height placeholders while loading so the header never jumps", () => {
    const { container } = render(<TooltipProvider><SidebarProvider initialState="expanded"><TopBar active="overview" range={null} dataThrough={null} basePath="/" /></SidebarProvider></TooltipProvider>);
    expect(container.querySelector("header")?.className).toContain("sticky"); // the bar sticks on scroll
    expect(container.querySelector("header > div")?.className).toContain("h-14"); // one fixed-height line at every width
    expect(screen.queryByText(/Data through/)).toBeNull();
    expect(container.querySelectorAll("[data-slot=skeleton]").length).toBeGreaterThan(0);
  });
});
