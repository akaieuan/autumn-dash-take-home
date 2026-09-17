import { Panel, PanelHeader } from "@/components/layout";

/** Marks a section that is planned but not designed yet, so the scaffold shows the page's intended shape. */
export function SectionPlaceholder({ id, title, description, planned }: { id?: string; title: string; description: string; planned: string[] }) {
  return (
    <Panel id={id} className="scroll-mt-20">
      <PanelHeader
        title={title}
        description={description}
        action={<span className="inline-flex h-6 items-center rounded-(--r-in) bg-muted px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Coming soon</span>}
      />
      <ul className="flex flex-col gap-2 rounded-(--r-in) border border-dashed border-border p-4 text-sm text-muted-foreground">
        {planned.map((p) => (
          <li key={p} className="flex items-center gap-2">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-muted-foreground/40" />
            {p}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
