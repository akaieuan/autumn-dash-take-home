export interface MarkerEvent { id: number; kindLabel: string; title: string }

/**
 * The pin on a `ReferenceLine`: a small amber dot at the top of the line, titled with what Autumn did
 * and wrapped in an SVG link, so clicking it lands on that change's card in the list beside the chart.
 * Recharts clones this element with the line's `viewBox`, so the dot sits on the line without measuring
 * anything itself. Several changes in one bucket share one line; the dot then carries their count.
 */
export function EventMarker({ events, viewBox, active = false, onPick }: { events: MarkerEvent[]; viewBox?: { x?: number; y?: number }; active?: boolean; onPick?: (id: number) => void }) {
  if (events.length === 0) return null;
  const x = viewBox?.x ?? 0;
  const y = viewBox?.y ?? 0;
  const title =
    events.length === 1
      ? `${events[0].kindLabel}: ${events[0].title}`
      : `${events.length} changes: ${events.map((e) => e.title).join(", ")}`;
  return (
    <a href={`#event-${events[0].id}`} className="cursor-pointer" onClick={onPick ? (e) => { e.preventDefault(); onPick(events[0].id); } : undefined}>
      <title>{title}</title>
      {/* An invisible disc under the dot: a 6px target is too small to hit, 20px is not. */}
      <circle cx={x} cy={y} r={10} fill="transparent" />
      <circle cx={x} cy={y} r={active ? 5 : 3} fill="var(--chart-2)" stroke="var(--card)" strokeWidth={active ? 2 : 1} />
      {events.length > 1 ? (
        <text x={x + 6} y={y + 4} className="fill-muted-foreground text-[10px] font-medium">
          {events.length}
        </text>
      ) : null}
    </a>
  );
}
