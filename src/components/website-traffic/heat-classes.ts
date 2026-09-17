/**
 * The five heat steps as static classes, so Tailwind can see them, and the blank a month or a day
 * the data never reached gets. `heatLevel` in `@/lib/activity` picks the index; this file only names
 * the colour. Both the day tiles and the month blocks read it, which is why it is not in either.
 */
export const LEVEL = ["bg-(--heat-0)", "bg-(--heat-1)", "bg-(--heat-2)", "bg-(--heat-3)", "bg-(--heat-4)"] as const;
export const EMPTY = "bg-transparent";
