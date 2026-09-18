// @vitest-environment jsdom
// tests/components/shell.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RangeSegment, TopBar, SidebarProvider } from "@/components/layout";

// The range controls navigate with the App Router; tests render outside one.
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

describe("RangeSegment", () => {
  it("is five buttons; pressing one writes the range to the URL without moving the page", () => {
    render(<RangeSegment current="90d" basePath="/" metric="website_visits" />);
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["30d", "90d", "YTD", "12m", "All"]);
    expect(screen.getByRole("button", { name: "90d" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "30d" }).getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "30d" }));
    expect(push).toHaveBeenCalledWith("/?range=30d&metric=website_visits", { scroll: false }); // scroll: false is the whole point
    push.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "90d" })); // already current: no navigation
    expect(push).not.toHaveBeenCalled();
  });
});

describe("TopBar", () => {
  it("carries the phone's menu button in its corner: a small rounded button that opens the sidebar drawer, hidden from sm", () => {
    render(<TooltipProvider><SidebarProvider initialState="expanded"><TopBar active="overview" range="30d" dataThrough="2026-09-16" basePath="/" /></SidebarProvider></TooltipProvider>);
    const menu = screen.getByRole("button", { name: "Open menu" });
    expect(menu.className).toContain("sm:hidden");
    expect(menu.className).toContain("rounded-(--r-in)");
    expect(menu.getAttribute("aria-controls")).toBe("app-sidebar");
    expect(menu.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(menu);
    expect(menu.getAttribute("aria-expanded")).toBe("true");
  });
  it("collapses the two screens into a dropdown on a phone, beside the menu button, and shows tabs from sm", () => {
    const { container } = render(<TooltipProvider><SidebarProvider initialState="expanded"><TopBar active="website-traffic" range="90d" dataThrough="2026-09-16" basePath="/website-traffic" /></SidebarProvider></TooltipProvider>);
    const select = screen.getByRole("combobox", { name: "Screen" });
    expect(select.className).toContain("sm:hidden");
    expect(select).toHaveTextContent("Website Traffic");
    expect(container.querySelector("nav[aria-label=Screens]")?.className).toContain("hidden");
    expect(container.querySelector("nav[aria-label=Screens]")?.className).toContain("sm:flex");
    expect(container.querySelector("header")?.className).toContain("px-[calc(var(--page-gutter)+0.75rem)]"); // inset further than the content on a phone
  });
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
    expect(container.querySelector("header > div")?.className).toContain("h-12 "); // one fixed-height line: shorter on a phone
    expect(container.querySelector("header > div")?.className).toContain("sm:h-14");
    expect(screen.queryByText(/Data through/)).toBeNull();
    expect(container.querySelectorAll("[data-slot=skeleton]").length).toBeGreaterThan(0);
  });
});
