export function LiveDot({ label = "Live" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
      <span aria-hidden="true" className="size-2 rounded-full bg-primary ring-3 ring-primary/20" />
      {label}
    </span>
  );
}
