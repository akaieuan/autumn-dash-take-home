"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { EventImpactDto } from "@/lib/db/queries";
import { Panel, PanelHeader, PanelBody, EmptyState } from "@/components/layout";
import { EventImpactCard } from "./event-impact-card";

/**
 * Beside the chart: one change at a time, newest first, with arrows to walk through the rest. Controlled
 * when the caller passes `selected` and `onSelect` (so the chart can follow); otherwise it keeps its own place.
 */
export function WhatAutumnDid({ impacts, selected, onSelect }: { impacts: EventImpactDto[]; selected?: number | null; onSelect?: (id: number) => void }) {
  const [own, setOwn] = useState<number | null>(impacts[0]?.event.id ?? null);
  const current = selected ?? own;
  const index = Math.max(0, impacts.findIndex((i) => i.event.id === current));
  const pick = (i: number) => {
    const id = impacts[i]?.event.id;
    if (id === undefined) return;
    setOwn(id);
    onSelect?.(id);
  };
  const many = impacts.length > 1;
  return (
    <Panel id="events" className="h-full">
      <PanelHeader
        headingId="events-h"
        title="What Autumn did"
        description={many ? "Each change, with the days before and after it. The chart shows the one you pick." : "Each change, with the days before and after it."}
      />
      {impacts.length === 0 ? (
        <EmptyState title="Nothing changed in this period" description="Autumn's changes will appear here with their before and after." />
      ) : (
        <PanelBody className="flex-1 gap-5">
          <EventImpactCard impact={impacts[index]} />
          {many ? (
            // Pager at the foot: dots on the left tell where you are, the arrows on the right are the thing to press.
            <div className="flex flex-1 flex-wrap items-end justify-between gap-3">
              <ol aria-label="Changes" className="flex flex-wrap gap-1.5 pb-2">
                {impacts.map((i, n) => (
                  <li key={i.event.id}>
                    <button
                      type="button"
                      aria-label={`${i.event.kindLabel}: ${i.event.title}`}
                      aria-current={n === index ? "true" : undefined}
                      onClick={() => pick(n)}
                      className="block h-1.5 w-6 rounded-full bg-muted transition-colors aria-[current=true]:bg-foreground hover:bg-muted-foreground/40"
                    />
                  </li>
                ))}
              </ol>
              <div role="group" aria-label="Changes pager" className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
                <button
                  type="button"
                  aria-label="Previous change"
                  onClick={() => pick(index - 1)}
                  disabled={index === 0}
                  className="flex size-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-35 disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </button>
                <span aria-live="polite" className="min-w-12 text-center text-xs font-medium tabular-nums">
                  {index + 1} of {impacts.length}
                </span>
                <button
                  type="button"
                  aria-label="Next change"
                  onClick={() => pick(index + 1)}
                  disabled={index === impacts.length - 1}
                  className="flex size-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-35 disabled:hover:bg-transparent"
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ) : null}
        </PanelBody>
      )}
    </Panel>
  );
}
