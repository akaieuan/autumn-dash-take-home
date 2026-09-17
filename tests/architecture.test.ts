import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out); else if (/\.(ts|tsx|css)$/.test(name)) out.push(p);
  }
  return out;
}
const read = (p: string) => readFileSync(p, "utf8");
const components = () => walk("src/components").filter((p) => !p.includes("/ui/"));

describe("architecture gates (CLAUDE.md §2 invariants)", () => {
  it("components never fetch: no @/lib/db import under src/components", () => {
    for (const f of components()) expect(read(f), f).not.toMatch(/from\s+["']@\/lib\/db/);
  });
  it("layout adapts by CSS only: no viewport hooks anywhere in src", () => {
    for (const f of walk("src")) expect(read(f), f).not.toMatch(/useIsMobile|matchMedia|window\.innerWidth|useMediaQuery/);
  });
  it("money is formatted only in format.ts", () => {
    for (const f of walk("src").filter((p) => !p.endsWith("src/lib/format.ts"))) expect(read(f), f).not.toMatch(/Intl\.NumberFormat/);
  });
  it("pages import barrels, never a file inside a component folder", () => {
    for (const f of walk("src/app")) expect(read(f), f).not.toMatch(/from\s+["']@\/components\/(layout|copy|charts|dashboard|website-traffic|assistant)\/[a-z]/);
  });
  it("globals.css carries the layout tokens and no dark block", () => {
    const css = read("src/app/globals.css");
    for (const t of ["--page-gutter", "--stack-gap", "--panel-pad", "--plot-height", "--radius-panel", "--r-in", "--radius-min", "--radius-float"]) expect(css).toContain(`${t}:`);
    expect(css).not.toMatch(/\.dark\s*\{/);
    expect(css).toMatch(/--chart-1:\s*#3f6b55/);
  });
  it("components set no outer margins (parents own spacing with gap)", () => {
    for (const f of components()) expect(read(f), f).not.toMatch(/className=["'][^"']*(?<![\w-])m[tb]-\d/);
  });
  it("corners are concentric: only radius tokens or pills, never rounded-md/lg/xl literals", () => {
    for (const f of components()) expect(read(f), f).not.toMatch(/\brounded-(xs|sm|md|lg|xl|2xl|3xl|4xl)\b/);
  });
});
