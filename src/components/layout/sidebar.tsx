"use client";
import { useEffect } from "react";
import { PanelLeft } from "lucide-react";
import { NAV_GROUPS } from "@/lib/navigation";
import { PROPERTY } from "@/lib/property";
import { cn } from "@/lib/utils";
import { IconButton } from "./icon-button";
import { NavList } from "./nav-list";
import { useSidebar } from "./sidebar-context";

/**
 * Two states, no in-between. From `sm` up it is a column in the page flow: a 64px icon rail or a 240px
 * panel, chosen by a cookie the server read. Under `sm` the rail stays in flow and the open state is a
 * drawer drawn over the page with a backdrop, because a phone has no room for a second column.
 * All of that is CSS on two data attributes; nothing here measures the window.
 */
export function Sidebar() {
  const { collapsed, drawerOpen, toggle, closeDrawer } = useSidebar();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "b" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
      if (e.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, closeDrawer]);

  return (
    <>
      {drawerOpen ? (
        <button type="button" aria-label="Close menu" onClick={closeDrawer} className="fixed inset-0 z-30 bg-foreground/30 backdrop-blur-[2px] sm:hidden" />
      ) : null}
      <aside
        id="app-sidebar"
        aria-label="Main"
        data-collapsed={collapsed}
        data-drawer={drawerOpen}
        className={cn(
          "group/sidebar sticky top-0 flex h-dvh shrink-0 flex-col gap-6 overflow-clip bg-sidebar p-3 transition-[width] duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
          // sm and up: rail or panel, in flow
          "sm:data-[collapsed=true]:w-16 sm:data-[collapsed=false]:w-60",
          // under sm: always the rail in flow; when the drawer is open, a fixed panel over the page
          "max-sm:w-16 max-sm:data-[drawer=true]:fixed max-sm:data-[drawer=true]:inset-y-0 max-sm:data-[drawer=true]:left-0 max-sm:data-[drawer=true]:z-40 max-sm:data-[drawer=true]:w-72 max-sm:data-[drawer=true]:border-r max-sm:data-[drawer=true]:border-border max-sm:data-[drawer=true]:shadow-2xl",
        )}
      >
        <div className="flex h-11 items-center gap-2.5 px-1">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-(--r-in) bg-foreground text-sm font-semibold text-card sm:group-data-[collapsed=true]/sidebar:hidden max-sm:group-data-[drawer=false]/sidebar:hidden"
          >
            {PROPERTY.name.charAt(0)}
          </span>
          <span className="flex min-w-0 flex-1 flex-col leading-tight whitespace-nowrap sm:group-data-[collapsed=true]/sidebar:hidden max-sm:group-data-[drawer=false]/sidebar:hidden">
            <span className="truncate text-sm font-semibold">{PROPERTY.name}</span>
            <span className="truncate text-[11px] text-muted-foreground">{PROPERTY.city}, {PROPERTY.region}</span>
          </span>
          <IconButton
            label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            side="right"
            onClick={toggle}
            aria-expanded={!collapsed}
            aria-controls="app-sidebar"
            aria-keyshortcuts="Control+B"
            tip={
              <span className="flex items-center gap-2">
                {collapsed ? "Expand sidebar" : "Collapse sidebar"}
                <kbd className="rounded-(--radius-min) bg-card/20 px-1 font-mono text-[10px]">⌃B</kbd>
              </span>
            }
            className="rounded-(--r-in)"
          >
            <PanelLeft className="size-4" aria-hidden="true" />
          </IconButton>
        </div>

        <div className="flex flex-1 flex-col gap-6">
          {NAV_GROUPS.map((g) => (
            <nav key={g.label} aria-label={g.label} className="flex flex-col gap-1.5">
              <span className="h-4 truncate whitespace-nowrap px-2.5 text-xs font-medium text-muted-foreground transition-opacity duration-200 sm:group-data-[collapsed=true]/sidebar:opacity-0 max-sm:group-data-[drawer=false]/sidebar:opacity-0">
                {g.label}
              </span>
              <NavList items={g.items} collapsed={collapsed} onNavigate={closeDrawer} />
            </nav>
          ))}
        </div>
      </aside>
    </>
  );
}
