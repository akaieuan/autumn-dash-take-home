import Link from "next/link";
import { Panel, PanelHeader, PageShell } from "@/components/layout";

export default function NotFound() {
  return (
    <PageShell className="items-center justify-center">
      <Panel className="w-full max-w-md items-start">
        <PanelHeader
          title="That page isn't here."
          description="The dashboard has two screens: the Overview and Website traffic."
        />
        <Link href="/" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          Back to the Overview
        </Link>
      </Panel>
    </PageShell>
  );
}
