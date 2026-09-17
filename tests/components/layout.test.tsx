// @vitest-environment jsdom
// tests/components/layout.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageShell, Stack, Grid, Panel, PanelHeader, PanelBody, EmptyState } from "@/components/layout";

describe("layout atoms", () => {
  it("PageShell is a main landmark that uses the gutter token", () => {
    render(<PageShell><p>hi</p></PageShell>);
    const main = screen.getByRole("main");
    expect(main.className).toContain("px-(--page-gutter)");
    expect(main.className).toContain("gap-(--stack-gap)");
  });
  it("Grid variants map to breakpoint classes only", () => {
    const { container } = render(<Grid variant="wide-three"><div /></Grid>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("grid-cols-1");
    expect(el.className).toContain("lg:grid-cols-2");
    expect(el.className).toContain("2xl:grid-cols-3");
  });
  it("Panel renders a titled section with the padding token", () => {
    render(<Panel id="markets"><PanelHeader headingId="mk" title="Where your guests come from" description="Ranked by bookings." action={<a href="#all">All</a>} /><PanelBody>body</PanelBody></Panel>);
    expect(screen.getByRole("heading", { level: 2, name: "Where your guests come from" })).toBeInTheDocument();
    expect(screen.getByText("Ranked by bookings.")).toBeInTheDocument();
    expect(document.getElementById("markets")?.className).toContain("p-(--panel-pad)");
    expect(document.getElementById("markets")?.className).toContain("rounded-(--radius-panel)");
  });
  it("EmptyState says something rather than rendering a blank card", () => {
    render(<EmptyState title="Nothing needs your attention this period" description="Autumn will flag anything that changes." />);
    expect(screen.getByText("Nothing needs your attention this period")).toBeInTheDocument();
    expect(screen.getByText("Nothing needs your attention this period").parentElement?.className).toContain("rounded-(--r-in)");
  });
  it("Stack exposes small, default and large gaps", () => {
    const { container } = render(<Stack gap="lg"><i /></Stack>);
    expect((container.firstElementChild as HTMLElement).className).toContain("gap-8");
  });
});
