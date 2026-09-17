// @vitest-environment jsdom
// tests/components/copy.test.tsx
//
// Literals corrected against the live `src/lib/glossary.ts` on 2026-09-17: the
// brief (and Task 2's brief before it) quoted labels the implemented glossary
// reworded — `impressions.label` is "Saw your hotel", not "People reached";
// `ctr` is "People who clicked" with industryTerm "click-through rate, CTR";
// its meaning quotes '1 in N'. The assertions keep their force — each expected
// string is still written out here, so a component that stopped reading the
// glossary, or a glossary reword, turns this file red.
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MetricLabel, DeltaText, Value, InsightTag, LiveDot, GlossaryEntry } from "@/components/copy";

const wrap = (ui: React.ReactNode) => render(<TooltipProvider>{ui}</TooltipProvider>);

describe("copy atoms", () => {
  it("MetricLabel shows the plain label and offers the meaning without a bare acronym", () => {
    wrap(<MetricLabel glossaryKey="impressions" />);
    expect(screen.getByText("Saw your hotel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "What does Saw your hotel mean?" })).toBeInTheDocument();
  });
  it("DeltaText writes the change as a sentence fragment, or nothing", () => {
    const { container } = wrap(<DeltaText current={41} previous={35} vsLabel="the previous 30 days" />);
    expect(screen.getByText("+17% vs the previous 30 days")).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
    const { container: empty } = wrap(<DeltaText current={5} previous={0} vsLabel="last year" />);
    expect(empty.textContent).toBe("");
  });
  it("DeltaText tones a drop as watch, never as an error", () => {
    wrap(<DeltaText current={90} previous={100} vsLabel="last year" />);
    expect(screen.getByText("-10% vs last year").parentElement?.className).toContain("text-watch");
  });
  it("Value formats money from cents and counts with separators, tabular", () => {
    wrap(<><Value kind="money" value={1824000} /><Value kind="count" value={6400} size="lg" /></>);
    expect(screen.getByText("$18,240").className).toContain("tabular-nums");
    expect(screen.getByText("6,400").className).toContain("text-2xl");
  });
  it("InsightTag reads in plain words", () => {
    wrap(<><InsightTag kind="win" /><InsightTag kind="watch" /><InsightTag kind="action" /></>);
    expect(screen.getByText("Win")).toBeInTheDocument();
    expect(screen.getByText("Watch")).toBeInTheDocument();
    expect(screen.getByText("Autumn is on it")).toBeInTheDocument();
  });
  it("LiveDot and GlossaryEntry render their copy", () => {
    wrap(<><LiveDot /><dl><GlossaryEntry glossaryKey="ctr" /></dl></>);
    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(screen.getByText("People who clicked (click-through rate, CTR)")).toBeInTheDocument();
    expect(screen.getByText(/Shown as '1 in N'/)).toBeInTheDocument();
  });
});
