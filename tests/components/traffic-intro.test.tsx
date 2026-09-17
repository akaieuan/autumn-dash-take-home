// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrafficIntro } from "@/components/website-traffic/traffic-intro";
import { parseRange } from "@/lib/date-range";

const range = parseRange("30d", "2024-09-17", "2026-09-16");

describe("TrafficIntro", () => {
  it("states ads' visits as a share of all visits, in the same unit on both sides", () => {
    render(<TrafficIntro range={range} totals={{ visits: 1548, allVisits: 12679, newVisitors: 8924, previousVisits: 1580 }} />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("1,548 people came to your website from Autumn's ads, about 1 in 8 of the 12,679 visits your site had in all.");
    expect(h1).not.toHaveTextContent("first-time"); // new visitors are people, not visits; they belong elsewhere
  });
  it("does not print a share when there is nothing to divide by", () => {
    render(<TrafficIntro range={range} totals={{ visits: 0, allVisits: 0, newVisitors: 0, previousVisits: null }} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("0 people came to your website from Autumn's ads.");
    expect(screen.queryByText(/1 in/)).toBeNull();
  });
});
