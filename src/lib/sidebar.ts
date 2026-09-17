/**
 * Sidebar width in pixels, kept in a cookie so the server renders the right width and the page never jumps.
 * The rail (icons only) is the minimum; anything wider shows labels.
 */
export const SIDEBAR_RAIL = 64;
export const SIDEBAR_MIN_EXPANDED = 176;
export const SIDEBAR_MAX = 320;
export const SIDEBAR_DEFAULT = 240;
export const SIDEBAR_COOKIE = "autumn-sidebar";
const MAX_AGE = 60 * 60 * 24 * 365;

export const clampSidebarWidth = (px: number): number => {
  if (!Number.isFinite(px)) return SIDEBAR_DEFAULT;
  if (px < SIDEBAR_MIN_EXPANDED) return SIDEBAR_RAIL; // snap: a half-open drawer is neither rail nor panel
  return Math.min(SIDEBAR_MAX, Math.round(px));
};

export const parseSidebarWidth = (value: string | undefined): number => clampSidebarWidth(Number(value));

export const isRail = (width: number): boolean => width <= SIDEBAR_RAIL;

export function writeSidebarCookie(width: number): void {
  document.cookie = `${SIDEBAR_COOKIE}=${width}; path=/; max-age=${MAX_AGE}; samesite=lax`;
}
