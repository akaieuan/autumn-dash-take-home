import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Design system · Autumn dashboard",
  robots: { index: false, follow: false },
};

/**
 * A reference, not a screen: no sidebar, no header, nothing links here from the dashboard. It exists
 * at /design-system for whoever is building the product, and search engines are told to ignore it.
 */
export default function DesignSystemLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-full bg-background text-foreground">{children}</div>;
}
