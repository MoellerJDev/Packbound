export const ZONES = [
  "pack",
  "pool",
  "bench",
  "command",
  "board",
  "spellrail",
  "sourceRow",
  "ashes",
  "void",
  "removed"
] as const;
export type Zone = (typeof ZONES)[number];
