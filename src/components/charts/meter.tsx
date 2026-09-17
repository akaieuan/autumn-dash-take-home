/** A share bar. Colour defaults to the brand primary; pass a series colour when rows are being compared. */
export function Meter({ share, label, color }: { share: number; label: string; color?: string }) {
  const clamped = Math.max(0, Math.min(1, share));
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={Number(clamped.toFixed(2))}
      className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
    >
      <div
        data-slot="meter-fill"
        className="h-full rounded-full bg-primary"
        style={{ width: `${Math.round(clamped * 100)}%`, ...(color ? { backgroundColor: color } : {}) }}
      />
    </div>
  );
}
