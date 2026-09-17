import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

/**
 * The room a jump target leaves for the sticky top bar. Anything an insight or the sidebar can link
 * to needs it; `Panel` applies it itself whenever it has an `id`, so the thirteen callers that
 * repeated it no longer can forget it (design audit 2026-09-17, item 3). The constant is exported
 * for the one anchor that is not a Panel — `EventImpactCard`'s `<article>`.
 */
export const ANCHOR = "scroll-mt-20";

/** A titled card. Radius and padding come from tokens so an inset child using rounded-(--r-in) is concentric with it (D28). */
export function Panel({ id, className, children }: { id?: string; className?: string; children: React.ReactNode }) {
  return (
    <Card id={id} className={cn("gap-4 overflow-visible rounded-(--radius-panel) p-(--panel-pad) [--card-spacing:0px]", id && ANCHOR, className)}>
      {children}
    </Card>
  );
}

export function PanelHeader({ title, description, action, headingId }: { title: string; description?: string; action?: React.ReactNode; headingId?: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 id={headingId} className="text-base font-semibold leading-snug">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {/* Capped at the panel's width: an action row wider than the panel wraps inside its slot instead of running past the edge. */}
      {action ? <div className="min-w-0 max-w-full shrink-0 text-xs font-medium">{action}</div> : null}
    </div>
  );
}

export function PanelBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("flex min-w-0 flex-col", className)}>{children}</div>;
}
