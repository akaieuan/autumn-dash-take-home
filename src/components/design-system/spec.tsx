/**
 * One specimen: the component's name, the file it lives in, one line on when to use it, and the
 * real component rendered inside a dashed frame on the page surface, so it looks as it does in a panel.
 */
export function Spec({ name, file, note, children, surface = "background" }: { name: string; file: string; note?: string; children: React.ReactNode; surface?: "background" | "card" }) {
  return (
    <figure className="flex min-w-0 flex-col gap-3">
      <figcaption className="flex flex-col gap-0.5">
        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-sm font-semibold">{name}</span>
          <code className="font-mono text-[11px] text-muted-foreground">{file}</code>
        </span>
        {note ? <span className="text-xs text-muted-foreground">{note}</span> : null}
      </figcaption>
      <div className={`flex min-w-0 flex-col gap-4 rounded-(--r-in) border border-dashed border-border p-(--panel-pad) ${surface === "card" ? "bg-card" : "bg-background"}`}>
        {children}
      </div>
    </figure>
  );
}
