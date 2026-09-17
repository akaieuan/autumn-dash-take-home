/** Sidebar open/closed, kept in a cookie so the server renders the right width and the page never jumps. */
export type SidebarState = "expanded" | "collapsed";
export const SIDEBAR_COOKIE = "autumn-sidebar";
const MAX_AGE = 60 * 60 * 24 * 365;

export const parseSidebarState = (value: string | undefined): SidebarState => (value === "collapsed" ? "collapsed" : "expanded");

export function writeSidebarCookie(state: SidebarState): void {
  document.cookie = `${SIDEBAR_COOKIE}=${state}; path=/; max-age=${MAX_AGE}; samesite=lax`;
}
