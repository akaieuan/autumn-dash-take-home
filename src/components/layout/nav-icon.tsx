import { LayoutDashboard, CalendarDays, Users, MessageSquare, FileBarChart, CreditCard, Settings, CircleHelp } from "lucide-react";
import type { NavKey } from "@/lib/navigation";

const ICONS: Record<NavKey, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  calendar: CalendarDays,
  guests: Users,
  messages: MessageSquare,
  reports: FileBarChart,
  billing: CreditCard,
  settings: Settings,
  help: CircleHelp,
};

export function NavIcon({ name, className }: { name: NavKey; className?: string }) {
  const Icon = ICONS[name];
  return <Icon className={className} aria-hidden="true" />;
}
