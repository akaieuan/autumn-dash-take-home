// @vitest-environment jsdom
// tests/components/sidebar.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar, SidebarProvider, SidebarTrigger } from "@/components/layout";
import { clampSidebarWidth, parseSidebarWidth, SIDEBAR_DEFAULT, SIDEBAR_MAX, SIDEBAR_RAIL } from "@/lib/sidebar";

const pathname = "/website-traffic";
vi.mock("next/navigation", () => ({ usePathname: () => pathname, useRouter: () => ({ push: vi.fn() }) }));

const wrap = (ui: React.ReactNode, width = SIDEBAR_DEFAULT) =>
  render(<TooltipProvider><SidebarProvider initialWidth={width}><SidebarTrigger />{ui}</SidebarProvider></TooltipProvider>);

describe("sidebar width rules", () => {
  it("clamps to the rail below the expanded minimum and to the maximum above it", () => {
    expect(clampSidebarWidth(20)).toBe(SIDEBAR_RAIL);
    expect(clampSidebarWidth(150)).toBe(SIDEBAR_RAIL); // half-open snaps shut
    expect(clampSidebarWidth(200)).toBe(200);
    expect(clampSidebarWidth(900)).toBe(SIDEBAR_MAX);
    expect(parseSidebarWidth(undefined)).toBe(SIDEBAR_DEFAULT);
    expect(parseSidebarWidth("garbage")).toBe(SIDEBAR_DEFAULT);
  });
});

describe("Sidebar", () => {
  it("marks Dashboard active for both dashboard screens and keeps unbuilt items as disabled, labelled buttons", () => {
    wrap(<Sidebar />);
    expect(screen.getByRole("link", { name: "Dashboard" }).getAttribute("aria-current")).toBe("page");
    const calendar = screen.getByRole("button", { name: /Calendar/ });
    expect(calendar).toBeDisabled();
    expect(calendar).toHaveTextContent("Soon");
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("navigation", { name: "General" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Other" })).toBeInTheDocument();
  });
  it("collapses to the rail from the top-bar trigger, remembering the width in a cookie", () => {
    wrap(<Sidebar />);
    const aside = screen.getByRole("complementary", { name: "Main" });
    expect(aside.dataset.collapsed).toBe("false");
    expect(aside.style.getPropertyValue("--sidebar-w")).toBe(`${SIDEBAR_DEFAULT}px`);
    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(aside.dataset.collapsed).toBe("true");
    expect(aside.style.getPropertyValue("--sidebar-w")).toBe(`${SIDEBAR_RAIL}px`);
    expect(document.cookie).toContain(`autumn-sidebar=${SIDEBAR_RAIL}`);
    fireEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
    expect(aside.style.getPropertyValue("--sidebar-w")).toBe(`${SIDEBAR_DEFAULT}px`); // back to the last width, not a fixed one
  });
  it("renders the rail from the server-provided width without a click", () => {
    wrap(<Sidebar />, SIDEBAR_RAIL);
    expect(screen.getByRole("complementary", { name: "Main" }).dataset.collapsed).toBe("true");
  });
  it("exposes a resize handle with the width range, and is never an overlay", () => {
    wrap(<Sidebar />);
    const handle = screen.getByRole("separator", { name: "Resize sidebar" });
    expect(handle.getAttribute("aria-valuemin")).toBe(String(SIDEBAR_RAIL));
    expect(handle.getAttribute("aria-valuemax")).toBe(String(SIDEBAR_MAX));
    expect(screen.queryByRole("dialog")).toBeNull();
    // Under sm the rail is forced by a class, not by a viewport hook.
    expect(screen.getByRole("complementary", { name: "Main" }).className).toContain("max-sm:w-16");
  });
});
