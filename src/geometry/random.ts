/**
 * A seeded generator (mulberry32): small, fast, and the same everywhere, so a
 * layout made with it comes out identical in the explorer and, via
 * scene.json, in Blender.
 */
export function generator(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    random: next,
    uniform: (lo: number, hi: number) => lo + (hi - lo) * next(),
    int: (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1)),
    choice: <T,>(xs: readonly T[]) => xs[Math.floor(next() * xs.length)],
  };
}
