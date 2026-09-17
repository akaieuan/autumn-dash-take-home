import { money, count } from "@/lib/format";
import { cn } from "@/lib/utils";

const SIZE = { sm: "text-sm font-medium", md: "text-base font-semibold", lg: "text-2xl font-semibold tracking-tight" } as const;

export function Value({ kind, value, size = "md", className }: { kind: "money" | "count"; value: number; size?: keyof typeof SIZE; className?: string }) {
  return <span className={cn("tabular-nums", SIZE[size], className)}>{kind === "money" ? money(value) : count(value)}</span>;
}
