"use client";
import { Menu } from "lucide-react";
import { IconButton } from "./icon-button";
import { useSidebar } from "./sidebar-context";

/**
 * The phone's way into the sidebar: a small rounded button in the top bar's corner. Under `sm` the
 * sidebar is not on the page at all until this opens it as a drawer (owner, 2026-09-17: "hide the
 * sidebar on small screen sizes and only show a little hamburger in a small rounded-corner button").
 * From `sm` the sidebar is in the page flow with its own control, so this button is not drawn.
 */
export function MenuButton() {
  const { drawerOpen, toggle } = useSidebar();
  return (
    <IconButton
      label="Open menu"
      onClick={toggle}
      aria-expanded={drawerOpen}
      aria-controls="app-sidebar"
      className="rounded-(--r-in) border border-border bg-card text-foreground sm:hidden"
    >
      <Menu className="size-4" aria-hidden="true" />
    </IconButton>
  );
}
