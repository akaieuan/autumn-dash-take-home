"use client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface PillOption<V extends string> { value: V; label: string }

/**
 * The one dropdown every control uses: a pill trigger and a floating list with the panel's own
 * radius rhythm (--radius-float outside, --r-float-in on the rows). shadcn's Select underneath;
 * this only fixes the look, so a second dropdown can never drift from the first.
 */
export function PillSelect<V extends string>({
  value, onValueChange, options, label, children, align = "end", pending, className,
}: {
  value: V;
  onValueChange: (v: V) => void;
  options: PillOption<V>[];
  /** Accessible name of the trigger. */
  label: string;
  /** What the closed pill shows; defaults to the selected option's label. */
  children?: React.ReactNode;
  align?: "start" | "center" | "end";
  pending?: boolean;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onValueChange(v as V)}>
      <SelectTrigger
        aria-label={label}
        aria-busy={pending || undefined}
        data-pending={pending || undefined}
        className={cn(
          "h-8 gap-1.5 rounded-full border-border bg-card pl-3 pr-2 text-xs font-medium shadow-none transition-opacity hover:bg-muted data-pending:opacity-60",
          className,
        )}
      >
        <SelectValue>{children}</SelectValue>
      </SelectTrigger>
      <SelectContent
        position="popper"
        align={align}
        sideOffset={6}
        className="min-w-44 rounded-(--radius-float) border border-border/70 bg-popover/95 p-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-12px_rgba(0,0,0,0.18)] ring-0 backdrop-blur-xl"
      >
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="rounded-(--r-float-in) py-2 pl-2.5 pr-8 text-sm data-highlighted:bg-muted">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
