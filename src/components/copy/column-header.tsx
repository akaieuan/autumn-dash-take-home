import { EYEBROW } from "./eyebrow";

/**
 * A column header reads as the same 11px caps label as an eyebrow: it is the label of a column
 * rather than of a stat, so it borrows that class instead of declaring a second copy. Since
 * 2026-09-17 every table is a `DataTable`, whose `<TableHead>` is already a `th`, so this is a class,
 * not a component.
 */
export const COLUMN_HEADER = EYEBROW;
