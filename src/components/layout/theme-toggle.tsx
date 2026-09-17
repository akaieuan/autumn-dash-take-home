"use client";
import { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { applyTheme, isThemePref, THEME_CHANGE_EVENT, THEME_STORAGE_KEY, type ThemePref } from "@/lib/theme";
import { IconButton } from "./icon-button";

function readPref(): ThemePref {
  try {
    const v = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePref(v) ? v : "system";
  } catch {
    return "system";
  }
}
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
  };
}
function setPref(pref: ThemePref) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    /* storage blocked: the class still flips for this page view */
  }
  applyTheme(pref);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

/**
 * One button that flips between light and dark. Which icon and which tooltip show is decided by the
 * `.dark` class in CSS, so the server and the first paint agree without knowing the preference.
 * Until the owner chooses, the page follows the device; a click always sets an explicit choice.
 */
export function ThemeToggle() {
  const pref = useSyncExternalStore(subscribe, readPref, () => "system" as ThemePref);

  useEffect(() => {
    if (pref !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const follow = () => applyTheme("system");
    media.addEventListener("change", follow);
    return () => media.removeEventListener("change", follow);
  }, [pref]);

  const flip = () => setPref(document.documentElement.classList.contains("dark") ? "light" : "dark");

  return (
    <IconButton
      label="Switch theme"
      onClick={flip}
      tip={
        <>
          <span className="dark:hidden">Switch to dark theme</span>
          <span className="hidden dark:inline">Switch to light theme</span>
        </>
      }
    >
      <Sun className="size-4 dark:hidden" aria-hidden="true" />
      <Moon className="hidden size-4 dark:block" aria-hidden="true" />
    </IconButton>
  );
}
