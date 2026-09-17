"use client";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { clampSidebarWidth, isRail, SIDEBAR_DEFAULT, SIDEBAR_RAIL, writeSidebarCookie } from "@/lib/sidebar";

interface SidebarContextValue {
  width: number;
  collapsed: boolean;
  dragging: boolean;
  /** Jump between the rail and the last expanded width. */
  toggle: () => void;
  /** Live width while dragging (not persisted). */
  preview: (px: number) => void;
  /** Settle on a width and persist it. */
  commit: (px: number) => void;
  setDragging: (on: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

/** One source of truth for the panel's width, shared by the panel, its resize edge and the top-bar trigger. */
export function SidebarProvider({ initialWidth, children }: { initialWidth: number; children: React.ReactNode }) {
  const [width, setWidth] = useState(() => clampSidebarWidth(initialWidth));
  const [dragging, setDragging] = useState(false);
  const lastExpanded = useRef(isRail(initialWidth) ? SIDEBAR_DEFAULT : clampSidebarWidth(initialWidth));

  const commit = useCallback((px: number) => {
    const w = clampSidebarWidth(px);
    if (!isRail(w)) lastExpanded.current = w;
    setWidth(w);
    writeSidebarCookie(w);
  }, []);
  const toggle = useCallback(() => commit(isRail(width) ? lastExpanded.current : SIDEBAR_RAIL), [commit, width]);
  const preview = useCallback((px: number) => setWidth(px), []);

  const value = useMemo<SidebarContextValue>(
    () => ({ width, collapsed: isRail(width), dragging, toggle, preview, commit, setDragging }),
    [width, dragging, toggle, preview, commit],
  );
  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used inside <SidebarProvider>");
  return ctx;
}
