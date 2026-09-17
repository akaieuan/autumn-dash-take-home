import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

/** A titled card. Radius and padding come from tokens so an inset child using rounded-(--r-in) is concentric with it (D28). */
export function Panel({ id, className, children }: { id?: string; className?: string; children: React.ReactNode }) {
  return (
    <Card id={id} className={cn("gap-4 overflow-visible rounded-(--radius-panel) p-(--panel-pad) [--card-spacing:0px]", className)}>
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
      {action ? <div className="shrink-0 text-xs font-medium">{action}</div> : null}
    </div>
  );
}

export function PanelBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("flex min-w-0 flex-col", className)}>{children}</div>;
}
