import { cn } from "@/lib/utils";

/** The page column: full width, gutter and vertical rhythm from globals.css tokens. */
export function PageShell({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <main className={cn("flex w-full flex-1 flex-col gap-(--stack-gap) px-(--page-gutter) pb-12 pt-6", className)}>
      {children}
    </main>
  );
}
