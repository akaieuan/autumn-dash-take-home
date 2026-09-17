import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("scaffold", () => {
  it("resolves the @ alias and cn merges conflicting classes", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
