/** One chapter of the reference: a heading, a sentence on what the chapter proves, then its specimens. */
export function DsSection({ id, title, description, children }: { id: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="flex scroll-mt-20 flex-col gap-6">
      <header className="flex flex-col gap-1 border-b border-border pb-4">
        <h2 id={`${id}-h`} className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      </header>
      {children}
    </section>
  );
}

/** A grid of specimens; columns are breakpoint classes only. */
export function DsGrid({ columns = 2, children }: { columns?: 1 | 2 | 3; children: React.ReactNode }) {
  const cols = { 1: "grid-cols-1", 2: "grid-cols-1 lg:grid-cols-2", 3: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" }[columns];
  return <div className={`grid gap-(--stack-gap) *:min-w-0 ${cols}`}>{children}</div>;
}
