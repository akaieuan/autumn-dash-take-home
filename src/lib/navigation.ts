/**
 * The app's primary navigation, as data. Only Dashboard goes anywhere today; the rest are the
 * product's planned surfaces and render as disabled entries so the layout is honest about scope.
 */
export type NavKey = "dashboard" | "calendar" | "guests" | "messages" | "reports" | "billing" | "settings" | "help";

export interface NavItem {
  key: NavKey;
  label: string;
  href: string | null; // null = not built yet
  /** Route prefixes that mark this item active. */
  matches?: string[];
}

export const PRIMARY_NAV: NavItem[] = [
  { key: "dashboard", label: "Dashboard", href: "/", matches: ["/", "/website-traffic"] },
  { key: "calendar", label: "Calendar", href: null },
  { key: "guests", label: "Guests", href: null },
  { key: "messages", label: "Messages", href: null },
  { key: "reports", label: "Reports", href: null },
  { key: "billing", label: "Billing", href: null },
];

export const SECONDARY_NAV: NavItem[] = [
  { key: "settings", label: "Settings", href: null },
  { key: "help", label: "Help", href: null },
];

/** The sidebar renders these groups in order, each under a small heading. */
export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  { label: "General", items: PRIMARY_NAV },
  { label: "Other", items: SECONDARY_NAV },
];

/** Dashboard's own tabs; the top bar renders these, the sidebar treats them as one destination. */
export const DASHBOARD_SCREENS = [
  { key: "overview", label: "Overview", path: "/" },
  { key: "website-traffic", label: "Website traffic", path: "/website-traffic" },
] as const;
export type Screen = (typeof DASHBOARD_SCREENS)[number]["key"];

export const isNavActive = (item: NavItem, pathname: string): boolean =>
  (item.matches ?? (item.href ? [item.href] : [])).some((m) => (m === "/" ? pathname === "/" : pathname.startsWith(m)));
