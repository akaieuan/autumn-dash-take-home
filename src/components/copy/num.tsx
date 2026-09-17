/**
 * A number cell: right-aligned and tabular, so a column of figures lines up and a changing value never
 * shifts its neighbours. Four files declared this pair by hand before 2026-09-17 (design audit item 1);
 * `DataTable` applies it to every right-aligned column, so it is a class, not a component.
 */
export const NUM = "text-right tabular-nums";
