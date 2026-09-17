/** Deterministic PRNG (mulberry32). Same seed → same rows, so the seed is repeatable. */
export interface Rng {
  next(): number;
  int(min: number, max: number): number;
  normal(mean: number, sd: number): number;
  poisson(lambda: number): number;
  binomial(n: number, p: number): number;
}

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const normal = (mean: number, sd: number) => {
    const u = 1 - next(), v = next();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const poisson = (lambda: number) => {
    if (lambda <= 0) return 0;
    if (lambda > 30) return Math.max(0, Math.round(normal(lambda, Math.sqrt(lambda))));
    const L = Math.exp(-lambda);
    let k = 0, p = 1;
    do { k++; p *= next(); } while (p > L);
    return k - 1;
  };
  const binomial = (n: number, p: number) => {
    if (n <= 0 || p <= 0) return 0;
    if (p >= 1) return n;
    if (n > 60) return Math.min(n, Math.max(0, Math.round(normal(n * p, Math.sqrt(n * p * (1 - p))))));
    let k = 0;
    for (let i = 0; i < n; i++) if (next() < p) k++;
    return k;
  };
  return { next, int: (min, max) => min + Math.floor(next() * (max - min + 1)), normal, poisson, binomial };
}
