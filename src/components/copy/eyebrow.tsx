import { cn } from "@/lib/utils";

/**
 * The 11px caps label: panel eyebrows, stat labels, small section labels, the industry term beside a
 * glossary title. It was declared by hand in twelve files before 2026-09-17 (design audit item 1);
 * it is one class here, so restyling the label happens once.
 *
 * `as` lets the same type serve whatever element the outline needs — a `dt` in a definition list, a
 * `th` inside a table, an `h3` where it is really a heading — without a second copy of the class.
 */
export const EYEBROW = "text-[11px] font-medium uppercase tracking-wide text-muted-foreground";

export function Eyebrow({
  as: Tag = "span",
  className,
  children,
  ...rest
}: { as?: "span" | "p" | "dt" | "h3" | "th"; className?: string; children: React.ReactNode } & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={cn(EYEBROW, className)} {...rest}>
      {children}
    </Tag>
  );
}
