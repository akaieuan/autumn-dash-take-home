export interface LegendItem {
  label: string;
  kind: "line" | "dashed" | "rect";
  color: string;
}

/** Legend keys mirror the mark: a stroke for lines, a dashed stroke for the dashed series, a swatch for fills. */
export function ChartLegend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legend">
      {items.map((i) => (
        <li key={i.label} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={
              i.kind === "rect"
                ? "size-3 rounded-(--radius-min)"
                : i.kind === "dashed"
                  ? "w-3.5 border-t-2 border-dashed"
                  : "h-0.5 w-3.5"
            }
            style={i.kind === "dashed" ? { borderColor: i.color } : { background: i.color }}
          />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
