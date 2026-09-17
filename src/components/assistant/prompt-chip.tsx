"use client";
import { ArrowRight } from "lucide-react";

export function PromptChip({ text, onPick }: { text: string; onPick: (text: string) => void }) {
  return (
    <button type="button" onClick={() => onPick(text)} className="inline-flex h-8 items-center rounded-full border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-muted">
      {text}
    </button>
  );
}

/** An action that does not exist yet. Deliberately not a button: nothing should look pressable that does nothing. */
export function ComingSoonAction({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-(--r-in) border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
      <span>{text}</span>
      <ArrowRight className="size-3 shrink-0 text-muted-foreground/60" aria-hidden="true" />
    </div>
  );
}
