export type Rand = () => number;

export function hashString(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = <T>(rand: Rand, list: readonly T[]): T =>
  list[Math.floor(rand() * list.length)];

export const chance = (rand: Rand, probability: number) => rand() < probability;

export const between = (rand: Rand, min: number, max: number) =>
  min + Math.floor(rand() * (max - min + 1));

export function weighted<T>(rand: Rand, items: readonly (readonly [T, number])[]): T {
  const total = items.reduce((sum, [, w]) => sum + Math.max(0, w), 0);
  if (total <= 0) return items[0][0];
  let roll = rand() * total;
  for (const [item, w] of items) {
    roll -= Math.max(0, w);
    if (roll <= 0) return item;
  }
  return items[items.length - 1][0];
}

export function shuffle<T>(rand: Rand, list: readonly T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
