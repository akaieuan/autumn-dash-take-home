"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavActive, type NavItem } from "@/lib/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { NavIcon } from "./nav-icon";

/**
 * Items keep the icon at a fixed left position at every width, so collapsing only clips the label
 * (the aside clips overflow) instead of re-centring the icon. That is what makes the motion smooth.
 * Unbuilt destinations look quiet and say "coming soon" in a tooltip; they are never dead links.
 */
const ITEM =
  "flex h-10 w-full items-center justify-start gap-3 overflow-hidden rounded-(--r-in) px-2.5 text-left text-sm font-medium text-muted-foreground outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50";
const LABEL =
  "min-w-0 flex-1 truncate whitespace-nowrap transition-opacity duration-200 sm:group-data-[collapsed=true]/sidebar:opacity-0 max-sm:group-data-[drawer=false]/sidebar:opacity-0";
const TIP = "rounded-(--r-in) px-2.5 py-1.5 text-xs";

export function NavList({ items, collapsed = false, onNavigate }: { items: NavItem[]; collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => {
        const active = isNavActive(item, pathname);
        if (item.href) {
          const link = (
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              className={cn(ITEM, "hover:bg-muted hover:text-foreground", active && "bg-muted text-foreground")}
            >
              <NavIcon name={item.key} className="size-4.5 shrink-0" />
              <span className={LABEL}>{item.label}</span>
            </Link>
          );
          return (
            <li key={item.key}>
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={10} className={TIP}>{item.label}</TooltipContent>
                </Tooltip>
              ) : (
                link
              )}
            </li>
          );
        }
        // Not built yet: focusable so the tooltip can explain, aria-disabled so it is announced as unavailable, no action.
        return (
          <li key={item.key}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" aria-disabled="true" className={cn(ITEM, "cursor-default text-muted-foreground/60")}>
                  <NavIcon name={item.key} className="size-4.5 shrink-0" />
                  <span className={LABEL}>{item.label}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10} className={TIP}>
                {item.label} · coming soon
              </TooltipContent>
            </Tooltip>
          </li>
        );
      })}
    </ul>
  );
}
