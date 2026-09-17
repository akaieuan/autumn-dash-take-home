"use client";
import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";
const subscribe = (cb: () => void) => {
  const m = window.matchMedia(QUERY);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
/** Chart animation is decoration; people who asked their OS for less motion get none. Server snapshot: animate. */
export const usePrefersReducedMotion = (): boolean => useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
