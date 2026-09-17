import { Info } from "lucide-react";
import { glossary, type GlossaryKey } from "@/lib/glossary";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Plain label first; the industry term appears once, in the tooltip, in parentheses (D4). */
export function MetricLabel({ glossaryKey, className }: { glossaryKey: GlossaryKey; className?: string }) {
  const e = glossary[glossaryKey];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground", className)}>
      {e.label}
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" aria-label={`What does ${e.label} mean?`} className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground/70 hover:text-foreground">
            <Info className="size-3.5" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-64 rounded-(--radius-float) p-(--float-pad) text-sm leading-snug">
          {e.industryTerm ? `${e.meaning} (${e.industryTerm})` : e.meaning}
        </TooltipContent>
      </Tooltip>
    </span>
  );
}
