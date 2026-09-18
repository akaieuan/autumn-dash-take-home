"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RangePreset } from "@/lib/date-range";
import { DASHBOARD_SCREENS, type Screen } from "@/lib/navigation";
import { PillSelect } from "./pill-select";

/**
 * The two screens as one dropdown for a phone, where two tabs beside a range dropdown and a menu
 * button would not fit one line (owner, 2026-09-17: "a dropdown for page selection makes the most
 * sense"). From `sm` the top bar shows the tabs instead; CSS decides which. Picking a screen keeps
 * the range in the URL, as the tabs do, and runs in a transition so the bar never flickers.
 */
export function ScreenSelect({ active, range, className }: { active: Screen; range: RangePreset | null; className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <PillSelect
      value={active}
      onValueChange={(key) => {
        const s = DASHBOARD_SCREENS.find((x) => x.key === key);
        if (!s || s.key === active) return;
        start(() => router.push(range ? `${s.path}?range=${range}` : s.path, { scroll: false }));
      }}
      options={DASHBOARD_SCREENS.map((s) => ({ value: s.key, label: s.label }))}
      label="Screen"
      pending={pending}
      className={className}
    />
  );
}
