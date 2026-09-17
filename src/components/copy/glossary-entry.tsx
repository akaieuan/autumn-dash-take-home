import { glossary, type GlossaryKey } from "@/lib/glossary";

export function GlossaryEntry({ glossaryKey }: { glossaryKey: GlossaryKey }) {
  const e = glossary[glossaryKey];
  return (
    <div className="flex flex-col gap-0.5 py-2">
      <dt className="text-sm font-semibold">{e.industryTerm ? `${e.label} (${e.industryTerm})` : e.label}</dt>
      <dd className="text-sm text-muted-foreground">{e.purpose ? `${e.meaning} ${e.purpose}` : e.meaning}</dd>
    </div>
  );
}
