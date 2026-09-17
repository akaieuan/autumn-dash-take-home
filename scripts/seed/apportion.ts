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

/**
 * For small integer totals (a day's clicks or bookings), assign each unit to a
 * part by weighted draw. Largest-remainder always hands a lone unit to the
 * heaviest weight, so over a month the light parts never appear; a draw
 * spreads them in proportion. Sums are exact by construction; caps are respected.
 */
export function apportionByDraw(total: number, weights: number[], next: () => number, caps?: number[]): number[] {
  const n = weights.length;
  const out = new Array<number>(n).fill(0);
  if (total <= 0 || n === 0) return out;
  for (let u = 0; u < total; u++) {
    const w = weights.map((x, i) => (x > 0 && (!caps || out[i] < caps[i]) ? x : 0));
    const sum = w.reduce((s, x) => s + x, 0);
    if (sum <= 0) break;
    let r = next() * sum;
    for (let i = 0; i < n; i++) { r -= w[i]; if (r <= 0) { out[i]++; break; } }
  }
  return out;
}
