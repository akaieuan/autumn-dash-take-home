import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { COLUMN_HEADER, NUM } from "@/components/copy";
import { cn } from "@/lib/utils";

/**
 * One table, six callers. Before 2026-09-17 the repo held two table dialects — three plain
 * div grids with table roles, and three shadcn tables that each re-declared the scroll box, the pinned
 * header, the container-query column gating and the right-aligned numeric cell (design audit item
 * 2). This is the shadcn dialect, wrapped once: a caller describes its columns and hands over its
 * rows, and every table on both screens then fixes, gates and scrolls the same way.
 */

export type TableBreakpoint = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";

/**
 * Static class maps: Tailwind only compiles the classes it can see, so a breakpoint is looked up,
 * never interpolated into a string. Breaking one of these turns the hideBelow test red.
 */
const HIDE_CELL: Record<TableBreakpoint, string> = {
  sm: "hidden @sm:table-cell",
  md: "hidden @md:table-cell",
  lg: "hidden @lg:table-cell",
  xl: "hidden @xl:table-cell",
  "2xl": "hidden @2xl:table-cell",
  "3xl": "hidden @3xl:table-cell",
};
const HIDE_ROW: Record<TableBreakpoint, string> = {
  sm: "hidden @sm:table-row",
  md: "hidden @md:table-row",
  lg: "hidden @lg:table-row",
  xl: "hidden @xl:table-row",
  "2xl": "hidden @2xl:table-row",
  "3xl": "hidden @3xl:table-row",
};

/** Headers wrap onto a second line rather than clip: `table-fixed` plus wrapping is what keeps a table inside its box. */
const HEAD = cn(COLUMN_HEADER, "h-9 py-1.5 leading-tight whitespace-normal");
const CELL = "py-2.5";
const FOOT = "py-2.5 font-semibold";

export interface DataColumn<T> {
  /** Stable identity for React keys and for a group's `from`/`to`. */
  key: string;
  header: React.ReactNode;
  /** right → the numeric class on the header and on every cell of the column. */
  align?: "left" | "right";
  cell: (row: T) => React.ReactNode;
  /** Footer cell; the footer row renders when any column has one. */
  foot?: React.ReactNode;
  /** Hide this column while the table's container is narrower than the breakpoint (container query). */
  hideBelow?: TableBreakpoint;
  /** Percentage width for the fixed layout; unset columns share the rest. */
  width?: string;
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** aria-label on each row, so a test (and a screen reader) can name it by the thing it describes. */
  rowLabel?: (row: T) => string;
  /** aria-label of the table itself. */
  label: string;
  /** aria-label of the footer row; without it the footer is named by its own cells. */
  footLabel?: string;
  /** An optional group header spanning some columns, e.g. "What Autumn spent" over the two cost columns. */
  group?: { label: string; from: string; to: string; hideBelow?: TableBreakpoint };
  /** true: the table fills a flex parent and scrolls inside its pinned header and footer; false: natural height. */
  fill?: boolean;
  className?: string;
}

export function DataTable<T>({ columns, rows, rowKey, rowLabel, label, footLabel, group, fill = false, className }: DataTableProps<T>) {
  const hasFoot = columns.some((c) => c.foot !== undefined);
  const gate = (c: DataColumn<T>) => (c.hideBelow ? HIDE_CELL[c.hideBelow] : undefined);
  const num = (c: DataColumn<T>) => (c.align === "right" ? NUM : undefined);

  const from = group ? columns.findIndex((c) => c.key === group.from) : -1;
  const to = group ? columns.findIndex((c) => c.key === group.to) : -1;
  const spans = group && from !== -1 && to >= from ? { lead: from, over: to - from + 1, trail: columns.length - 1 - to } : null;

  return (
    // This box is the only scroll container: shadcn's own wrapper is made overflow-visible so the
    // pinned header and footer stick to it rather than to a wrapper that never scrolls.
    <div
      className={cn(
        "min-w-0 overflow-auto rounded-(--r-in) border border-border [&>[data-slot=table-container]]:overflow-visible",
        fill && "min-h-(--plot-height) flex-1 basis-0",
        className,
      )}
    >
      {/* When the table fills its panel the rows share the spare height, so a short list never stops short of the panel beside it. */}
      <Table aria-label={label} className={cn("table-fixed text-xs", fill && "h-full")}>
        <TableHeader className="sticky top-0 z-10 bg-card shadow-[inset_0_-1px_0_var(--color-border)]">
          {spans ? (
            <TableRow className={cn("border-0 hover:bg-transparent", group?.hideBelow && HIDE_ROW[group.hideBelow])}>
              {spans.lead > 0 ? <TableHead colSpan={spans.lead} /> : null}
              <TableHead colSpan={spans.over} className={cn(HEAD, "text-center")}>
                {group!.label}
              </TableHead>
              {spans.trail > 0 ? <TableHead colSpan={spans.trail} /> : null}
            </TableRow>
          ) : null}
          <TableRow className="border-0 hover:bg-transparent">
            {columns.map((c) => (
              // The column's own class comes first, so the shared label type always wins the
              // typography: a caller tunes width and tone, never the 11px caps label itself.
              <TableHead key={c.key} style={c.width ? { width: c.width } : undefined} className={cn(c.className, HEAD, num(c), gate(c))}>
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={rowKey(row)} aria-label={rowLabel?.(row)}>
              {columns.map((c, i) => (
                // The first column holds the name of the thing: it wraps, so a long label never
                // pushes the table wider than its box.
                <TableCell key={c.key} className={cn(CELL, i === 0 && "whitespace-normal", num(c), gate(c), c.className)}>
                  {c.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
        {hasFoot ? (
          <TableFooter className="sticky bottom-0 bg-card shadow-[inset_0_1px_0_var(--color-border)]">
            <TableRow className="border-0 hover:bg-transparent" aria-label={footLabel}>
              {columns.map((c, i) => (
                // FOOT comes last: the totals row is bold whatever weight the body cells carry.
                <TableCell key={c.key} className={cn(i === 0 && "whitespace-normal", num(c), gate(c), c.className, FOOT)}>
                  {c.foot}
                </TableCell>
              ))}
            </TableRow>
          </TableFooter>
        ) : null}
      </Table>
    </div>
  );
}
