"use client";
import { useState } from "react";
import { MessageCircle, ChevronDown, Sparkles, Send, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Eyebrow } from "@/components/copy";
import { PromptChip, ComingSoonAction } from "./prompt-chip";

const QUESTIONS = ["Why did Chicago drop?", "Compare to last September", "What drove Labor Day?", "Explain the fee"];
const ACTIONS = ["Pause “Finding new guests” for two weeks", "Email me a one-page summary every Monday", "Add Kalamazoo as a market to watch"];
const PREVIEW_NOTICE = "Nothing was sent: this is a placeholder for the planned assistant. In production the reply would come from your own numbers.";

/**
 * Help-desk style: a launcher in the corner and a card anchored above it. The page behind stays fully
 * visible (owner's call, 2026-09-17). The card is a placeholder for the production layout and says so
 * in its own words (owner, 2026-09-17): a "Preview" badge in the header, a first message that explains
 * what the real thing would do, and a send that reports it went nowhere. Nothing here pretends to reply.
 */
export function AssistantPopover() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={open ? "Close Ask Autumn" : "Ask Autumn"} className="fixed right-(--page-gutter) bottom-6 z-40 inline-flex size-12 items-center justify-center rounded-full bg-foreground text-card shadow-lg shadow-foreground/20 hover:bg-foreground/90">
          {open ? <ChevronDown className="size-5" aria-hidden="true" /> : <MessageCircle className="size-5" aria-hidden="true" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" side="top" sideOffset={12} aria-label="Ask Autumn" className="flex w-[min(22.5rem,calc(100vw-2*var(--page-gutter)))] flex-col gap-0 rounded-(--radius-panel) p-0 shadow-xl shadow-foreground/10">
        <div className="flex items-center justify-between gap-3 border-b border-border p-(--panel-pad)">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex size-7 items-center justify-center rounded-(--r-in) bg-primary text-primary-foreground"><Sparkles className="size-4" aria-hidden="true" /></span>
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold">
                Ask Autumn
                <span className="inline-flex h-5 items-center rounded-(--r-in) bg-muted px-1.5 text-[10px] font-semibold text-foreground">Preview</span>
              </p>
              <p className="text-xs text-muted-foreground">A placeholder for the planned assistant</p>
            </div>
          </div>
          <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="inline-flex size-7 items-center justify-center rounded-(--r-in) text-muted-foreground hover:bg-muted"><X className="size-4" aria-hidden="true" /></button>
        </div>
        <div className="flex flex-col gap-3 p-(--panel-pad)">
          <p className="max-w-64 rounded-(--r-in) rounded-tl-(--radius-min) bg-background px-3 py-2 text-sm leading-snug">
            This is a mock-up of where Ask Autumn would live. In production you&apos;d ask about any number on this page, or tell Autumn what you&apos;d like changed, and it would answer from your own data.
          </p>
          <Eyebrow as="p">Try asking</Eyebrow>
          <div className="flex flex-wrap gap-1.5">{QUESTIONS.map((q) => <PromptChip key={q} text={q} onPick={setDraft} />)}</div>
          <Eyebrow as="p" className="flex items-center gap-2">Take action <span className="inline-flex h-5 items-center rounded-(--r-in) bg-muted px-1.5 text-[10px] font-semibold normal-case tracking-normal text-foreground">Coming soon</span></Eyebrow>
          <div className="flex flex-col gap-1.5">{ACTIONS.map((a) => <ComingSoonAction key={a} text={a} />)}</div>
          {notice ? <p role="status" className="rounded-(--r-in) bg-muted px-3 py-2 text-xs text-muted-foreground">{notice}</p> : null}
        </div>
        <form className="flex items-center gap-1.5 border-t border-border p-(--panel-pad)" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) setNotice(PREVIEW_NOTICE); }}>
          <label htmlFor="ask-autumn" className="sr-only">Your question</label>
          <input id="ask-autumn" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask about your numbers…" className="h-10 min-w-0 flex-1 rounded-(--r-in) border border-border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50" />
          <button type="submit" aria-label="Send" disabled={!draft.trim()} className="inline-flex size-10 shrink-0 items-center justify-center rounded-(--r-in) bg-foreground text-card disabled:opacity-40"><Send className="size-4" aria-hidden="true" /></button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
