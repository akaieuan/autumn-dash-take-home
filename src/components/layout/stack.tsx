import { cn } from "@/lib/utils";

const GAPS = { sm: "gap-3", md: "gap-(--stack-gap)", lg: "gap-8" } as const;

export function Stack({ gap = "md", className, children }: { gap?: keyof typeof GAPS; className?: string; children: React.ReactNode }) {
  return <div className={cn("flex flex-col", GAPS[gap], className)}>{children}</div>;
}
