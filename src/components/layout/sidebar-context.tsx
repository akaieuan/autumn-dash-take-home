"use client";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { writeSidebarCookie, type SidebarState } from "@/lib/sidebar";

interface SidebarContextValue {
  /** Wide screens: rail or full panel. Persisted. */
  collapsed: boolean;
  /** Small screens: whether the panel is drawn over the page. Never persisted; starts closed. */
  drawerOpen: boolean;
  toggle: () => void;
  closeDrawer: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

/**
 * One source of truth for the panel. The same toggle drives both states; CSS decides which one is
 * visible at the current width, so no code ever asks how wide the window is.
 */
export function SidebarProvider({ initialState, children }: { initialState: SidebarState; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(initialState === "collapsed");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      writeSidebarCookie(next ? "collapsed" : "expanded");
      return next;
    });
    setDrawerOpen((o) => !o);
  }, []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const value = useMemo<SidebarContextValue>(() => ({ collapsed, drawerOpen, toggle, closeDrawer }), [collapsed, drawerOpen, toggle, closeDrawer]);
  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used inside <SidebarProvider>");
  return ctx;
}
