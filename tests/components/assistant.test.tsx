// @vitest-environment jsdom
// tests/components/assistant.test.tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { AssistantPopover } from "@/components/assistant";

// The vitest config does not enable globals, so React Testing Library cannot register
// its own afterEach(cleanup); without this each test would query a DOM still holding the
// previous test's launcher and popover.
afterEach(cleanup);

describe("AssistantPopover", () => {
  it("opens from a launcher into a dialog anchored to it, without a backdrop", () => {
    const { baseElement } = render(<AssistantPopover />);
    fireEvent.click(screen.getByRole("button", { name: "Ask Autumn" }));
    expect(screen.getByRole("dialog", { name: "Ask Autumn" })).toBeInTheDocument();
    expect(baseElement.querySelector('[data-slot$="overlay"]')).toBeNull();
  });
  it("offers example questions as buttons and unbuilt actions as Coming soon, not buttons", () => {
    render(<AssistantPopover />);
    fireEvent.click(screen.getByRole("button", { name: "Ask Autumn" }));
    fireEvent.click(screen.getByRole("button", { name: "Why did Chicago drop?" }));
    expect((screen.getByLabelText("Your question") as HTMLInputElement).value).toBe("Why did Chicago drop?");
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Pause/ })).toBeNull();
    expect(screen.getByText(/Pause .Finding new guests. for two weeks/)).toBeInTheDocument();
  });
  it("says plainly that replies are not wired up yet", () => {
    render(<AssistantPopover />);
    fireEvent.click(screen.getByRole("button", { name: "Ask Autumn" }));
    fireEvent.change(screen.getByLabelText("Your question"), { target: { value: "hello" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(screen.getByRole("status")).toHaveTextContent("Ask Autumn is a preview. Replies aren't connected yet.");
  });
});
