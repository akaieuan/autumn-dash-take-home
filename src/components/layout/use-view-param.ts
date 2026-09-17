"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Writes the view's search params (range, metric) without moving the page. The push runs inside a
 * transition, so the content the owner is reading stays on screen until the server has the new
 * payload, and `scroll: false` keeps the scroll position where it was. Controls read `pending` to
 * show that a change is in flight; they never change size while it is.
 */
export function useViewParam(basePath: string) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const go = (params: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    const qs = q.toString();
    start(() => router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false }));
  };
  return { go, pending };
}
