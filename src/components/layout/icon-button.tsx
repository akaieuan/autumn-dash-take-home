"use client";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * An icon-only control with its name in a tooltip and on the button itself. The tooltip sits centred
 * under the button with a small offset so it reads as part of the control, not a floating box.
 */
export function IconButton({
  label,
  tip,
  side = "bottom",
  className,
  children,
  ...props
}: React.ComponentProps<"button"> & { label: string; tip?: React.ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-expanded:text-foreground",
            className,
          )}
          {...props}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} sideOffset={6} className="rounded-(--r-in) px-2.5 py-1.5 text-xs">
        {tip ?? label}
      </TooltipContent>
    </Tooltip>
  );
}
