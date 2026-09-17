/** Theme preference shared by the pre-paint script and the header switch, so both resolve it the same way. */
export type ThemePref = "light" | "dark" | "system";
export const THEME_PREFS: readonly ThemePref[] = ["light", "dark", "system"];
export const THEME_STORAGE_KEY = "autumn:theme";
export const THEME_CHANGE_EVENT = "autumn:theme-change";

export const isThemePref = (v: unknown): v is ThemePref => THEME_PREFS.includes(v as ThemePref);

/** Adds or removes `.dark` on <html>. "system" follows the OS colour scheme (not the viewport). */
export function applyTheme(pref: ThemePref): void {
  const dark = pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

/**
 * Inline in <head> so the first paint already has the right theme (no light flash for dark users).
 * Kept as a string because it must run before React loads; it mirrors applyTheme.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var d=p==="dark"||(p!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})();`;
