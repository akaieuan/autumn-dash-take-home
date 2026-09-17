export interface TokenSwatch { name: string; note?: string }

/** Colour tokens as swatches. The colour comes from the live CSS variable, so the page can never show a stale hex. */
export function SwatchGrid({ tokens }: { tokens: TokenSwatch[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {tokens.map((t) => (
        <li key={t.name} className="flex flex-col gap-1.5">
          <span aria-hidden="true" className="h-12 w-full rounded-(--r-in) border border-border" style={{ background: `var(${t.name})` }} />
          <code className="font-mono text-[11px]">{t.name}</code>
          {t.note ? <span className="text-xs text-muted-foreground">{t.note}</span> : null}
        </li>
      ))}
    </ul>
  );
}

/** The concentric rule drawn: a panel, an inset child, and a floating surface, each radius from its token. */
export function RadiusDemo() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <div className="rounded-(--radius-panel) border border-border bg-card p-(--panel-pad)">
          <div className="flex h-24 items-center justify-center rounded-(--r-in) bg-muted text-xs text-muted-foreground">rounded-(--r-in) = panel − pad</div>
        </div>
        <code className="font-mono text-[11px] text-muted-foreground">--radius-panel · --panel-pad · --r-in</code>
      </div>
      <div className="flex flex-col gap-2">
        <div className="rounded-(--radius-float) border border-border bg-popover p-(--float-pad) shadow-sm">
          <div className="flex h-24 items-center justify-center rounded-(--r-float-in) bg-muted text-xs text-muted-foreground">rounded-(--r-float-in) = float − pad</div>
        </div>
        <code className="font-mono text-[11px] text-muted-foreground">--radius-float · --float-pad · --r-float-in · floor --radius-min</code>
      </div>
    </div>
  );
}

const SPACING = [
  { name: "--page-gutter", note: "inset of the page from the content card" },
  { name: "--stack-gap", note: "between panels and rows" },
  { name: "--panel-pad", note: "inside every panel" },
  { name: "--plot-height", note: "the chart's minimum box" },
];

/** Spacing tokens as measured bars; the width is the live value. */
export function SpacingDemo() {
  return (
    <ul className="flex flex-col gap-3">
      {SPACING.map((s) => (
        <li key={s.name} className="grid grid-cols-[10rem_minmax(0,1fr)] items-center gap-4">
          <span className="flex flex-col"><code className="font-mono text-[11px]">{s.name}</code><span className="text-xs text-muted-foreground">{s.note}</span></span>
          <span aria-hidden="true" className="h-3 rounded-(--radius-min) bg-primary" style={{ width: `var(${s.name})` }} />
        </li>
      ))}
    </ul>
  );
}

const TYPE = [
  { cls: "text-3xl font-semibold tracking-tight", label: "Headline · 30/600", sample: "Autumn brought you 78 direct bookings" },
  { cls: "text-xl font-semibold tracking-tight", label: "Section · 20/600", sample: "What these numbers mean" },
  { cls: "text-base font-semibold", label: "Panel title · 16/600", sample: "Where your guests come from" },
  { cls: "text-sm", label: "Body · 14/400", sample: "Cities sending bookings, biggest first." },
  { cls: "text-xs text-muted-foreground", label: "Caption · 12/400 muted", sample: "Data through Sep 16, 2026" },
  { cls: "text-[11px] font-medium uppercase tracking-wide text-muted-foreground", label: "Label · 11/500 caps", sample: "Direct bookings from Autumn" },
  { cls: "text-2xl font-semibold tabular-nums", label: "Value · 24/600 tabular", sample: "$117,368" },
];

/** The type scale in use, each line in its real classes. One family, tabular numerals wherever a number appears. */
export function TypeScale() {
  return (
    <ul className="flex flex-col divide-y divide-border">
      {TYPE.map((t) => (
        <li key={t.label} className="grid grid-cols-1 items-baseline gap-1 py-3 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-4">
          <span className="text-xs text-muted-foreground">{t.label}</span>
          <span className={t.cls}>{t.sample}</span>
        </li>
      ))}
    </ul>
  );
}
