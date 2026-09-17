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
  it("components never fetch: no @/lib/db value import under src/components", () => {
    // `import type { MarketDto } from "@/lib/db/queries"` is erased at compile time, so it carries no
    // Drizzle or postgres-js into a client bundle; only a value import from @/lib/db is forbidden.
    for (const f of components()) expect(read(f), f).not.toMatch(/(?<!import type[^;]{0,80})from\s+["']@\/lib\/db/);
  });
  it("layout adapts by CSS only: no viewport hooks anywhere in src", () => {
    for (const f of walk("src")) expect(read(f), f).not.toMatch(/useIsMobile|window\.innerWidth|useMediaQuery|matchMedia\(\s*[\"'`]\((?:min|max)-width/);
  });
  it("money is formatted only in format.ts", () => {
    for (const f of walk("src").filter((p) => !p.endsWith("src/lib/format.ts"))) expect(read(f), f).not.toMatch(/Intl\.NumberFormat/);
  });
  it("pages import barrels, never a file inside a component folder", () => {
    for (const f of walk("src/app")) expect(read(f), f).not.toMatch(/from\s+["']@\/components\/(layout|copy|charts|dashboard|website-traffic|bookings|assistant|design-system)\/[a-z]/);
  });
  it("the design-system reference is a path only: nothing in the product links to it", () => {
    const product = [...walk("src/components"), ...walk("src/lib"), ...walk("src/app/(dashboard)")].filter((p) => !p.includes("/design-system/"));
    for (const f of product) expect(read(f), f).not.toMatch(/["'`]\/design-system/);
  });
  it("globals.css carries the layout tokens and a dark theme block", () => {
    const css = read("src/app/globals.css");
    // --card-day, --card-event and --card-compare joined the list on 2026-09-17: the day card and the
    // event card reserve their height from a token, never a tuned-by-eye min-h-[19rem] (audit item 5).
    for (const t of ["--page-gutter", "--stack-gap", "--panel-pad", "--plot-height", "--card-day", "--card-day-stacked", "--card-event", "--card-compare", "--radius-panel", "--r-in", "--radius-min", "--radius-float"]) expect(css).toContain(`${t}:`);
    expect(css).toMatch(/\.dark\s*\{/); // light and dark themes (owner, 2026-09-17)
    expect(css).toMatch(/--chart-1:\s*#3f6b55/);
  });
  it("components set no outer margins (parents own spacing with gap)", () => {
    // Any margin utility (m-, mt-, mx-, ml-…) anywhere in a component file, whether in className="…" or inside cn("…").
    for (const f of components()) expect(read(f), f).not.toMatch(/(?<![\w-])m[tblrxy]?-[\w(\[]/);
  });
  it("corners are concentric: only radius tokens or pills, never rounded-md/lg/xl literals", () => {
    // Includes directional forms such as rounded-t-xl and rounded-tl-md.
    for (const f of components()) expect(read(f), f).not.toMatch(/\brounded-(?:[trblse]{1,2}-)?(xs|sm|md|lg|xl|2xl|3xl|4xl)\b/);
  });
});
