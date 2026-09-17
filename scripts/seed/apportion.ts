/**
 * Split an integer total across weights so the parts sum EXACTLY to the total
 * (largest-remainder method). Optional per-part caps are respected by pushing
 * overflow to the uncapped parts. A zero weight always yields a zero part.
 */
export function apportion(total: number, weights: number[], caps?: number[]): number[] {
  const n = weights.length;
  const out = new Array<number>(n).fill(0);
  if (total <= 0 || n === 0) return out;
  const sum = weights.reduce((s, w) => s + Math.max(0, w), 0);
  if (sum <= 0) return out;
  const ideal = weights.map((w) => (Math.max(0, w) / sum) * total);
  let remaining = total;
  for (let i = 0; i < n; i++) { out[i] = Math.floor(ideal[i]); remaining -= out[i]; }
  const order = ideal.map((v, i) => ({ i, frac: v - Math.floor(v) })).filter((x) => weights[x.i] > 0).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; remaining > 0 && order.length > 0; k = (k + 1) % order.length) { out[order[k].i]++; remaining--; }
  if (caps) {
    let overflow = 0;
    for (let i = 0; i < n; i++) if (out[i] > caps[i]) { overflow += out[i] - caps[i]; out[i] = caps[i]; }
    for (let i = 0; overflow > 0 && i < n; i++) { const room = caps[i] - out[i]; if (weights[i] > 0 && room > 0) { const take = Math.min(room, overflow); out[i] += take; overflow -= take; } }
  }
  return out;
}
