"use client";
import { useSyncExternalStore } from "react";

export type ChartStyle = "area" | "bars" | "line";
export const CHART_STYLES: ChartStyle[] = ["area", "bars", "line"];
const KEY = "autumn:chart-style";
const EVENT = "autumn:chart-style-change";

const read = (): ChartStyle => {
  try {
    const v = window.localStorage.getItem(KEY);
    return CHART_STYLES.includes(v as ChartStyle) ? (v as ChartStyle) : "area";
  } catch {
    return "area";
  }
};

const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
};

/** A per-browser preference. The server snapshot is always "area", so the first paint never differs from the server HTML. */
export function useChartStyle(): [ChartStyle, (s: ChartStyle) => void] {
  const style = useSyncExternalStore(subscribe, read, () => "area" as ChartStyle);
  const set = (s: ChartStyle) => {
    try {
      window.localStorage.setItem(KEY, s);
    } catch {
      /* private mode: the choice lasts for this render only */
    }
    window.dispatchEvent(new Event(EVENT));
  };
  return [style, set];
}
