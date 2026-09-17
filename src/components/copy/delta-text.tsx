import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { delta, deltaText } from "@/lib/format";
import { cn } from "@/lib/utils";

const TONE = { up: "text-positive", down: "text-watch", flat: "text-muted-foreground" } as const;
const ICON = { up: TrendingUp, down: TrendingDown, flat: Minus } as const;

/** "+17% vs the previous 30 days". A drop is something to watch, so it wears the watch tone, not the error tone. */
export function DeltaText({ current, previous, vsLabel, className }: { current: number; previous: number | null; vsLabel: string; className?: string }) {
  const text = deltaText(current, previous, vsLabel);
  if (!text) return null;
  const d = delta(current, previous).direction;
  const Icon = ICON[d];
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", TONE[d], className)}>
      <Icon className="size-3.5" aria-hidden="true" />
      <span>{text}</span>
    </span>
  );
}
