import { cn } from "@/lib/utils";

/** Page-level grids. Column changes are breakpoint classes only; never a JS viewport check. */
const VARIANTS = {
  two: "grid-cols-1 lg:grid-cols-2",
  three: "grid-cols-1 lg:grid-cols-3",
  sidebar: "grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]",
  "wide-three": "grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3",
} as const;

export function Grid({ variant, className, children }: { variant: keyof typeof VARIANTS; className?: string; children: React.ReactNode }) {
  return <div className={cn("grid gap-(--stack-gap) *:min-w-0", VARIANTS[variant], className)}>{children}</div>;
}
