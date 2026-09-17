/**
 * The small shared vocabulary of the query layer: the driver types, and the two
 * conversions every module needs. `n` and `toCents` used to be private copies in
 * `overview.ts` and `breakdowns.ts`; they live here now so the cents boundary is
 * one function, crossed once, at the edge of a query (CLAUDE.md §2).
 */
export type { AnyDb } from "../types";
export { rowsOf } from "../types";

export const n = (v: unknown): number => Number(v ?? 0);

/** numeric(10,2) dollars from the driver (string) → integer cents, once, at the query boundary. */
export const toCents = (dollars: unknown): number => Math.round(n(dollars) * 100);

/**
 * Sums `values` into `chunks` near-equal groups, the first groups one longer when
 * it does not divide. A sparkline shows the shape of a period in a fixed number of
 * marks, so the group sizes come from the day count, never the other way round.
 * chunkSums([1..10], 4) → [6, 15, 15, 19]; chunkSums(Array(30).fill(1), 4) → [8, 8, 7, 7];
 * chunkSums([5], 4) → [5, 0, 0, 0].
 */
export function chunkSums(values: number[], chunks: number): number[] {
  if (chunks <= 0) return [];
  const base = Math.floor(values.length / chunks), extra = values.length % chunks;
  const out: number[] = [];
  let i = 0;
  for (let g = 0; g < chunks; g++) {
    const size = base + (g < extra ? 1 : 0);
    let sum = 0;
    for (let k = 0; k < size; k++) sum += values[i++] ?? 0;
    out.push(sum);
  }
  return out;
}
