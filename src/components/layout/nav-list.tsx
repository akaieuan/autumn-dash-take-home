"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavActive, type NavItem } from "@/lib/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { NavIcon } from "./nav-icon";

/**
 * Items keep the icon at a fixed left position at every width, so collapsing only clips the label
 * (the aside hides overflow) instead of re-centring the icon. That is what makes the motion smooth.
 */
const ITEM =
  "flex h-10 w-full items-center gap-3 overflow-hidden rounded-(--r-in) px-2.5 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50";
const LABEL =
  "min-w-0 flex-1 truncate whitespace-nowrap transition-opacity duration-200 group-data-[collapsed=true]/sidebar:opacity-0 max-sm:opacity-0";

export function NavList({ items, collapsed = false, onNavigate }: { items: NavItem[]; collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => {
        const active = isNavActive(item, pathname);
        const inner = item.href ? (
          <Link href={item.href} aria-current={active ? "page" : undefined} onClick={onNavigate} className={cn(ITEM, active && "bg-muted text-foreground")}>
            <NavIcon name={item.key} className="size-4.5 shrink-0" />
            <span className={LABEL}>{item.label}</span>
          </Link>
        ) : (
          <button type="button" disabled aria-disabled="true" className={cn(ITEM, "cursor-default opacity-60 hover:bg-transparent hover:text-muted-foreground")}>
            <NavIcon name={item.key} className="size-4.5 shrink-0" />
            <span className={LABEL}>{item.label}</span>
            <span className={cn("shrink-0 text-[10px] font-semibold uppercase tracking-wide transition-opacity duration-200", "group-data-[collapsed=true]/sidebar:opacity-0 max-sm:opacity-0")}>Soon</span>
          </button>
        );
        return (
          <li key={item.key}>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>{inner}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={10} className="rounded-(--r-in) px-2.5 py-1.5 text-xs">
                  {item.label}
                  {item.href ? "" : " · coming soon"}
                </TooltipContent>
              </Tooltip>
            ) : (
              inner
            )}
          </li>
        );
      })}
    </ul>
  );
}
