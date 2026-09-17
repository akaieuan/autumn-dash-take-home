// @vitest-environment jsdom
// tests/components/sidebar.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar, SidebarProvider } from "@/components/layout";
import { parseSidebarState, type SidebarState } from "@/lib/sidebar";

const pathname = "/website-traffic";
vi.mock("next/navigation", () => ({ usePathname: () => pathname, useRouter: () => ({ push: vi.fn() }) }));

const wrap = (state: SidebarState = "expanded") =>
  render(<TooltipProvider><SidebarProvider initialState={state}><Sidebar /></SidebarProvider></TooltipProvider>);

describe("sidebar state", () => {
  it("reads the cookie value, defaulting to expanded", () => {
    expect(parseSidebarState("collapsed")).toBe("collapsed");
    expect(parseSidebarState(undefined)).toBe("expanded");
    expect(parseSidebarState("garbage")).toBe("expanded");
  });
});

describe("Sidebar", () => {
  it("marks Dashboard active for both dashboard screens and keeps unbuilt items quiet, labelled buttons", () => {
    wrap();
    expect(screen.getByRole("link", { name: "Dashboard" }).getAttribute("aria-current")).toBe("page");
    const calendar = screen.getByRole("button", { name: "Calendar" });
    expect(calendar.getAttribute("aria-disabled")).toBe("true");
    expect(calendar).not.toHaveTextContent("Soon"); // "coming soon" lives in the tooltip, not the label
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("navigation", { name: "General" })).toBeInTheDocument();
    const other = screen.getByRole("navigation", { name: "Other" });
    expect(other.parentElement?.className).toContain("border-t"); // pinned at the bottom, behind a hairline
    expect(screen.getByRole("navigation", { name: "General" }).parentElement?.className).toContain("flex-1"); // what pushes it there
  });
  it("snaps between the panel and the rail from its top-row control, remembering the state in a cookie", () => {
    wrap();
    const aside = screen.getByRole("complementary", { name: "Main" });
    expect(aside.dataset.collapsed).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(aside.dataset.collapsed).toBe("true");
    expect(document.cookie).toContain("autumn-sidebar=collapsed");
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();
    expect(screen.queryByRole("separator")).toBeNull(); // no resize handle: two states only
  });
  it("renders the rail from the server-provided state without a click", () => {
    wrap("collapsed");
    expect(screen.getByRole("complementary", { name: "Main" }).dataset.collapsed).toBe("true");
  });
  it("on small screens the open state is a drawer over the page with a backdrop that closes it", () => {
    wrap("collapsed");
    const aside = screen.getByRole("complementary", { name: "Main" });
    expect(aside.dataset.drawer).toBe("false");
    expect(screen.queryByRole("button", { name: "Close menu" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
    expect(aside.dataset.drawer).toBe("true");
    expect(aside.className).toContain("max-sm:data-[drawer=true]:fixed"); // CSS decides, never a viewport hook
    fireEvent.click(screen.getByRole("button", { name: "Close menu" }));
    expect(aside.dataset.drawer).toBe("false");
  });
  it("closes the drawer when a destination is chosen", () => {
    wrap("collapsed");
    fireEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
    fireEvent.click(screen.getByRole("link", { name: "Dashboard" }));
    expect(screen.getByRole("complementary", { name: "Main" }).dataset.drawer).toBe("false");
  });
});
