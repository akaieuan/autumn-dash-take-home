/** Identity colours for comparing things side by side (campaigns, cities, devices). Tokens live in globals.css. */
export const SERIES_COLORS = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)"] as const;
export const OTHER_COLOR = "var(--series-other)";

/** Colour follows position in a stable list; past the fourth item everything folds into the neutral. */
export const seriesColor = (index: number): string => SERIES_COLORS[index] ?? OTHER_COLOR;
