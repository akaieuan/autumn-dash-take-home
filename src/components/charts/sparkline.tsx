const W = 72;
const H = 22;

/** Decorative trend hint beside a value; the value and its delta carry the meaning, so this is aria-hidden. */
export function Sparkline({ points, tone = "primary" }: { points: number[]; tone?: "primary" | "muted" }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const pts = points
    .map(
      (v, i) =>
        `${((i / Math.max(1, points.length - 1)) * W).toFixed(1)},${(H - 2 - ((v - min) / span) * (H - 4)).toFixed(1)}`,
    )
    .join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className="shrink-0">
      <polyline
        points={pts}
        fill="none"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        className={tone === "primary" ? "stroke-(--chart-1)" : "stroke-(--chart-2)"}
      />
    </svg>
  );
}
