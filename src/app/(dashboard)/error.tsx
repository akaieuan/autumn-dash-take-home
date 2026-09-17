"use client";
import { Panel, PanelHeader, PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PageShell className="items-center justify-center">
      <Panel className="w-full max-w-md items-start">
        <PanelHeader
          title="We couldn't load your numbers."
          description="Nothing is wrong with your data. Try again in a moment."
        />
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
      </Panel>
    </PageShell>
  );
}
