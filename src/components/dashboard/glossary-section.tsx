import type { GlossaryKey } from "@/lib/glossary";
import { CollapsibleSection } from "@/components/layout";
import { GlossaryEntry } from "@/components/copy";

export function GlossarySection({ keys }: { keys: GlossaryKey[] }) {
  return (
    <CollapsibleSection
      id="glossary"
      title="Understand these numbers"
      description="Plain-language meaning of every figure on this page."
    >
      <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
        {keys.map((k) => (
          <GlossaryEntry key={k} glossaryKey={k} />
        ))}
      </dl>
    </CollapsibleSection>
  );
}
