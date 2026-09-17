import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// vitest.config.ts does not set `globals: true`, so React Testing Library never registers its own
// auto-cleanup. Without this, a second render in the same file leaves the first one mounted and
// queries fail with "Found multiple elements".
afterEach(cleanup);

// Recharts' ResponsiveContainer checks for ResizeObserver; jsdom has none. A no-op keeps chart tests quiet.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
}

// jsdom has no matchMedia; the theme switch reads prefers-color-scheme. Light by default in tests.
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string) =>
    ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }) as unknown as MediaQueryList;
}
