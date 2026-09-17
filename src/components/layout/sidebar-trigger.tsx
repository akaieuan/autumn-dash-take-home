"use client";
import { PanelLeft } from "lucide-react";
import { IconButton } from "./icon-button";
import { useSidebar } from "./sidebar-context";

/** The open/close control, placed in the top bar like shadcn's sidebar trigger. */
export function SidebarTrigger() {
  const { collapsed, toggle } = useSidebar();
  return (
    <IconButton
      label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
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
    >
      <PanelLeft className="size-4" aria-hidden="true" />
    </IconButton>
  );
}
