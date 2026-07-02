export const ZONES = [
  "pack",
  "pool",
  "bench",
  "board",
  "spellrail",
  "sourceRow",
  "ashes",
  "void",
  "removed"
] as const;
export type Zone = (typeof ZONES)[number];
