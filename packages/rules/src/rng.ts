export type SeededRng = {
  readonly seed: string;
  readonly nextUint32: () => number;
  readonly nextFloat: () => number;
  readonly nextInt: (maxExclusive: number) => number;
  readonly chance: (probability: number) => boolean;
  readonly pick: <T>(items: readonly T[]) => T;
  readonly shuffle: <T>(items: readonly T[]) => readonly T[];
  readonly fork: (label: string) => SeededRng;
  readonly snapshot: () => { readonly seed: string; readonly counter: number };
};

const hashStringToUint32 = (input: string): number => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

const nextMulberry32 = (state: number): number => {
  let value = state + 0x6d2b79f5;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return (value ^ (value >>> 14)) >>> 0;
};

export const createRng = (seed: string): SeededRng => {
  let state = hashStringToUint32(seed);
  let counter = 0;

  const nextUint32 = (): number => {
    state = nextMulberry32(state);
    counter += 1;
    return state;
  };

  const nextFloat = (): number => nextUint32() / 0x100000000;

  const nextInt = (maxExclusive: number): number => {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
      throw new Error(`nextInt requires a positive integer, received ${maxExclusive}`);
    }
    return Math.floor(nextFloat() * maxExclusive);
  };

  return {
    seed,
    nextUint32,
    nextFloat,
    nextInt,
    chance: (probability: number): boolean => {
      if (probability <= 0) {
        return false;
      }
      if (probability >= 1) {
        return true;
      }
      return nextFloat() < probability;
    },
    pick: <T>(items: readonly T[]): T => {
      if (items.length === 0) {
        throw new Error("Cannot pick from an empty collection");
      }
      const item = items[nextInt(items.length)];
      if (item === undefined) {
        throw new Error("RNG selected an out-of-range item");
      }
      return item;
    },
    shuffle: <T>(items: readonly T[]): readonly T[] => {
      const copy = [...items];
      for (let index = copy.length - 1; index > 0; index -= 1) {
        const swapIndex = nextInt(index + 1);
        const current = copy[index];
        const swap = copy[swapIndex];
        if (current === undefined || swap === undefined) {
          throw new Error("Shuffle selected an out-of-range item");
        }
        copy[index] = swap;
        copy[swapIndex] = current;
      }
      return copy;
    },
    fork: (label: string): SeededRng => createRng(`${seed}:${counter}:${label}`),
    snapshot: () => ({ seed, counter })
  };
};
