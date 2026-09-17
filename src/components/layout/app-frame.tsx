import { Sidebar } from "./sidebar";
import { SidebarProvider } from "./sidebar-context";

/**
 * Sidebar on the left, the app inset as a card on the right (shadcn's "inset" layout). Lives in the root
 * layout so the panel persists across routes. Padding on the frame, never margins on the children.
 */
import type { SidebarState } from "@/lib/sidebar";

export function AppFrame({ sidebar, children }: { sidebar: SidebarState; children: React.ReactNode }) {
  return (
    <SidebarProvider initialState={sidebar}>
      <div className="flex min-h-full w-full bg-sidebar">
        <Sidebar />
        <div className="flex min-w-0 flex-1 py-2 pr-2 max-sm:py-0 max-sm:pr-0">
          <div className="flex min-h-full min-w-0 flex-1 flex-col overflow-clip rounded-(--radius-panel) border border-border bg-background max-sm:rounded-none max-sm:border-0">
            {children}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
