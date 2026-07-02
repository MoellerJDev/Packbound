export const ASPECTS = ["Ember", "Shade", "Bloom", "Tide", "Gleam"] as const;
export type Aspect = (typeof ASPECTS)[number];

export type AspectCountMap = Partial<Record<Aspect, number>>;
