import type { InsightKind } from "@/lib/insights";
import { cn } from "@/lib/utils";

const COPY: Record<InsightKind, string> = { win: "Win", watch: "Watch", action: "Autumn is on it" };
const TONE: Record<InsightKind, string> = { win: "bg-primary/15 text-primary", watch: "bg-watch/15 text-watch", action: "bg-muted text-foreground" };

export function InsightTag({ kind }: { kind: InsightKind }) {
  return <span className={cn("inline-flex h-6 items-center rounded-(--r-in) px-2 text-[11px] font-semibold uppercase tracking-wide", TONE[kind])}>{COPY[kind]}</span>;
}
