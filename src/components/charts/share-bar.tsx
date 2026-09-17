import { pct } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ShareSegment {
  label: string;
  share: number;
  color: string;
}

/** One stacked bar showing how a whole splits across a few named parts. A 2px gap separates the parts. */
export function ShareBar({ segments, label, className }: { segments: ShareSegment[]; label: string; className?: string }) {
  const visible = segments.filter((s) => s.share > 0);
  const summary = visible.map((s) => `${s.label} ${pct(s.share)}`).join(", ");
  return (
    <div role="img" aria-label={`${label}: ${summary}`} className={cn("flex h-3 w-full gap-0.5 overflow-hidden rounded-full", className)}>
      {visible.map((s) => (
        <span
          key={s.label}
          title={`${s.label} · ${pct(s.share)}`}
          className="h-full first:rounded-l-full last:rounded-r-full"
          style={{ width: `${s.share * 100}%`, backgroundColor: s.color }}
        />
      ))}
    </div>
  );
}

/** The key for a ShareBar: swatch, name, share. Text stays in text colours; only the swatch carries the hue. */
export function ShareLegend({ segments, className }: { segments: ShareSegment[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-1.5 text-xs", className)}>
      {segments.map((s) => (
        <li key={s.label} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
          <span className="text-foreground">{s.label}</span>
          <span className="tabular-nums text-muted-foreground">{pct(s.share)}</span>
        </li>
      ))}
    </ul>
  );
}
