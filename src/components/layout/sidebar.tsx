"use client";
import { useEffect } from "react";
import { ChevronsUpDown } from "lucide-react";
import { NAV_GROUPS } from "@/lib/navigation";
import { PROPERTY } from "@/lib/property";
import { SIDEBAR_MAX, SIDEBAR_RAIL } from "@/lib/sidebar";
import { cn } from "@/lib/utils";
import { NavList } from "./nav-list";
import { useSidebar } from "./sidebar-context";

/**
 * The app's left panel: in the page flow at every size, never an overlay. Width comes from the provider
 * (seeded by the server from a cookie) so the first paint is right; the owner drags the edge between the
 * icon rail and the maximum, or uses the trigger in the top bar. Under `sm` the rail is forced by CSS.
 */
export function Sidebar() {
  const { width, collapsed, dragging, preview, commit, setDragging, toggle } = useSidebar();

  // Ctrl/Cmd+B toggles the panel, as in shadcn's sidebar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "b" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = width;
    setDragging(true);
    const move = (ev: PointerEvent) => preview(Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_RAIL, startW + ev.clientX - startX)));
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDragging(false);
      commit(startW + ev.clientX - startX);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <aside
      id="app-sidebar"
      aria-label="Main"
      data-collapsed={collapsed}
      style={{ "--sidebar-w": `${width}px` } as React.CSSProperties}
      className={cn(
        "group/sidebar relative sticky top-0 flex h-dvh w-(--sidebar-w) shrink-0 flex-col gap-6 overflow-hidden p-3 max-sm:w-16",
        !dragging && "transition-[width] duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
      )}
    >
      <button
        type="button"
        aria-label={`${PROPERTY.name}. Switch property, coming soon`}
        disabled
        className="flex h-11 w-full items-center gap-2.5 overflow-hidden rounded-(--r-in) px-1 text-left disabled:cursor-default"
      >
        <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-(--r-in) bg-foreground text-card text-sm font-semibold">
          {PROPERTY.name.charAt(0)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col leading-tight whitespace-nowrap transition-opacity duration-200 group-data-[collapsed=true]/sidebar:opacity-0 max-sm:opacity-0">
          <span className="truncate text-sm font-semibold">{PROPERTY.name}</span>
          <span className="truncate text-[11px] text-muted-foreground">{PROPERTY.city}, {PROPERTY.region}</span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground transition-opacity duration-200 group-data-[collapsed=true]/sidebar:opacity-0 max-sm:opacity-0" aria-hidden="true" />
      </button>

      <div className="flex flex-1 flex-col gap-6">
        {NAV_GROUPS.map((g) => (
          <nav key={g.label} aria-label={g.label} className="flex flex-col gap-1.5">
            <span className="h-4 truncate whitespace-nowrap px-2.5 text-xs font-medium text-muted-foreground transition-opacity duration-200 group-data-[collapsed=true]/sidebar:opacity-0 max-sm:opacity-0">{g.label}</span>
            <NavList items={g.items} collapsed={collapsed} />
          </nav>
        ))}
      </div>

      {/* Resize edge: a thin strip on the panel's right. Hidden under sm where the rail is fixed. */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
        aria-valuemin={SIDEBAR_RAIL}
        aria-valuemax={SIDEBAR_MAX}
        aria-valuenow={width}
        onPointerDown={startDrag}
        className={cn(
          "absolute inset-y-0 -right-1.5 w-3 cursor-col-resize touch-none select-none max-sm:hidden",
          "after:absolute after:inset-y-3 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:rounded-full after:bg-transparent after:transition-colors hover:after:bg-foreground/20",
          dragging && "after:bg-foreground/30",
        )}
      />
    </aside>
  );
}
