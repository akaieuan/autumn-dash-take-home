import { cookies } from "next/headers";
import { SIDEBAR_COOKIE, parseSidebarState } from "@/lib/sidebar";
import { AppFrame } from "@/components/layout";

/**
 * The dashboard's chrome: sidebar and inset content card. Every owner-facing screen lives in this
 * group; a route outside it (the design-system reference) renders without the frame.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const sidebar = parseSidebarState((await cookies()).get(SIDEBAR_COOKIE)?.value);
  return <AppFrame sidebar={sidebar}>{children}</AppFrame>;
}
