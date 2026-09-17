"use client";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { Panel } from "./panel";

/**
 * Closed on the server and on first paint, so hydration never moves the page. Opens on click or when the URL
 * hash names it (insight links). With openAtWide the content is shown in place from 2xl by CSS alone.
 */
export function CollapsibleSection({
  id,
  title,
  description,
  openAtWide = false,
  children,
}: {
  id: string;
  title: string;
  description: string;
  openAtWide?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const check = () => {
      if (window.location.hash === `#${id}`) setOpen(true);
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, [id]);
  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <Panel id={id} className="gap-0 scroll-mt-20">
        <CollapsibleTrigger
          className={cn(
            "flex w-full items-center justify-between gap-3 text-left",
            openAtWide && "2xl:pointer-events-none",
          )}
        >
          <span className="flex flex-col gap-0.5">
            <span className="text-base font-semibold leading-snug">{title}</span>
            <span className="text-sm text-muted-foreground">{description}</span>
          </span>
          <span
            aria-hidden="true"
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-(--r-in) border border-border text-muted-foreground transition-transform",
              open && "rotate-180",
              openAtWide && "2xl:hidden",
            )}
          >
            <ChevronDown className="size-4" />
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent
          forceMount
          data-slot="collapsible-content"
          className={cn("pt-4 data-[state=closed]:hidden", openAtWide && "2xl:block")}
        >
          {children}
        </CollapsibleContent>
      </Panel>
    </Collapsible>
  );
}
