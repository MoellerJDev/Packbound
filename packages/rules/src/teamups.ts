import type { ContentCatalog } from "@packbound/content";
import type {
  ActiveTeamup,
  BoardState,
  CardDefId,
  CardDefinition,
  CardInstance,
  CardInstanceId,
  TraitCategory,
  TraitDefinition,
  TraitThreshold,
  Zone
} from "@packbound/shared";

import type { RunState } from "./runState";

export type TraitContributor = {
  readonly cardInstanceId: CardInstanceId;
  readonly cardDefId: CardDefId;
  readonly cardName: string;
  readonly zone: Zone | "board";
};

export type TraitCount = {
  readonly traitId: string;
  readonly name: string;
  readonly category: TraitCategory;
  readonly description: string;
  readonly count: number;
  readonly activeThreshold?: TraitThreshold;
  readonly nextThreshold?: TraitThreshold;
  readonly cards: readonly TraitContributor[];
  readonly partnerTraitIds: readonly string[];
  readonly tags: readonly string[];
};

export type TraitSummary = {
  readonly activeTraits: readonly TraitCount[];
  readonly nearTraits: readonly TraitCount[];
  readonly allTraitCounts: readonly TraitCount[];
};

type ActiveCardEntry = {
  readonly card: CardInstance;
  readonly zone: Zone | "board";
};

const thresholdCounts = (trait: TraitDefinition): readonly number[] =>
  [...trait.thresholds].map((threshold) => threshold.count).sort((a, b) => a - b);

const activeThresholdForCount = (
  trait: TraitDefinition,
  count: number
): TraitThreshold | undefined =>
  [...trait.thresholds]
    .sort((a, b) => a.count - b.count)
    .reduce<TraitThreshold | undefined>(
      (active, threshold) => (count >= threshold.count ? threshold : active),
      undefined
    );

const nextThresholdForCount = (
  trait: TraitDefinition,
  count: number
): TraitThreshold | undefined =>
  [...trait.thresholds]
    .sort((a, b) => a.count - b.count)
    .find((threshold) => threshold.count > count);

const traitSortKey = (trait: TraitCount): string =>
  `${trait.category}:${trait.name}:${trait.traitId}`;

const sortTraitCounts = (traits: readonly TraitCount[]): readonly TraitCount[] =>
  [...traits].sort((a, b) => traitSortKey(a).localeCompare(traitSortKey(b)));

const copyContributor = (contributor: TraitContributor): TraitContributor => ({
  ...contributor
});

const uniqueActiveCardsForRun = (run: RunState): readonly ActiveCardEntry[] => {
  const entries: ActiveCardEntry[] = [];
  const seenInstanceIds = new Set<CardInstanceId>();

  const addCard = (card: CardInstance, zone: Zone | "board"): void => {
    if (seenInstanceIds.has(card.instanceId)) {
      return;
    }
    seenInstanceIds.add(card.instanceId);
    entries.push({ card, zone });
  };

  for (const card of run.activeCards) {
    addCard(card, "board");
  }

  for (const placement of run.board.placements) {
    if (seenInstanceIds.has(placement.cardInstanceId)) {
      continue;
    }
    addCard(
      {
        instanceId: placement.cardInstanceId,
        defId: placement.defId,
        ownerId: placement.ownerId,
        zone: "board",
        modifiers: [],
        upgradeLevel: 0
      },
      "board"
    );
  }

  for (const card of run.sourceRow.cards) {
    addCard(card, "sourceRow");
  }

  for (const card of run.spellrail.cards) {
    addCard(card, "spellrail");
  }

  return entries.sort((a, b) => a.card.instanceId.localeCompare(b.card.instanceId));
};

const contributorForCard = (
  card: CardInstance,
  def: CardDefinition,
  zone: Zone | "board"
): TraitContributor => ({
  cardInstanceId: card.instanceId,
  cardDefId: def.id,
  cardName: def.name,
  zone
});

const isNearTrait = (trait: TraitCount): boolean => {
  if (trait.count <= 0) {
    return false;
  }

  if (!trait.activeThreshold) {
    return true;
  }

  return (
    trait.nextThreshold !== undefined && trait.count + 1 === trait.nextThreshold.count
  );
};

export const buildRunTraitSummary = (
  run: RunState,
  catalog: ContentCatalog
): TraitSummary => {
  const contributorMap = new Map<string, TraitContributor[]>();

  for (const entry of uniqueActiveCardsForRun(run)) {
    const def = catalog.cardsById.get(entry.card.defId);
    if (!def) {
      continue;
    }

    for (const traitId of def.traits ?? []) {
      if (!catalog.traitsById.has(traitId)) {
        continue;
      }
      const contributors = contributorMap.get(traitId) ?? [];
      contributors.push(contributorForCard(entry.card, def, entry.zone));
      contributorMap.set(traitId, contributors);
    }
  }

  const allTraitCounts = sortTraitCounts(
    [...contributorMap.entries()].map(([traitId, contributors]): TraitCount => {
      const trait = catalog.traitsById.get(traitId);
      if (!trait) {
        throw new Error(`Unknown trait in active summary: ${traitId}`);
      }
      const count = contributors.length;
      const activeThreshold = activeThresholdForCount(trait, count);
      const nextThreshold = nextThresholdForCount(trait, count);

      return {
        traitId,
        name: trait.name,
        category: trait.category,
        description: trait.description,
        count,
        ...(activeThreshold ? { activeThreshold } : {}),
        ...(nextThreshold ? { nextThreshold } : {}),
        cards: contributors.map(copyContributor),
        partnerTraitIds: [...trait.partnerTraitIds],
        tags: [...trait.tags]
      };
    })
  );

  return {
    activeTraits: sortTraitCounts(
      allTraitCounts.filter((trait) => trait.activeThreshold !== undefined)
    ),
    nearTraits: sortTraitCounts(allTraitCounts.filter(isNearTrait)),
    allTraitCounts
  };
};

const tierForCount = (count: number, thresholds: readonly number[]): number =>
  thresholds.reduce(
    (tier, threshold, index) => (count >= threshold ? index + 1 : tier),
    0
  );

export const calculateTeamups = (
  catalog: ContentCatalog,
  board: BoardState
): readonly ActiveTeamup[] => {
  const counts = new Map<string, { count: number; sources: CardInstanceId[] }>();

  for (const placement of board.placements) {
    const def = catalog.cardsById.get(placement.defId);
    if (!def) {
      continue;
    }

    for (const traitId of def.traits ?? []) {
      const trait = catalog.traitsById.get(traitId);
      if (!trait) {
        continue;
      }

      const entry = counts.get(traitId) ?? { count: 0, sources: [] };
      entry.count += 1;
      entry.sources.push(placement.cardInstanceId);
      counts.set(traitId, entry);
    }
  }

  const result: ActiveTeamup[] = [];
  for (const [traitId, entry] of counts) {
    const trait = catalog.traitsById.get(traitId);
    if (!trait) {
      continue;
    }
    const tier = tierForCount(entry.count, thresholdCounts(trait));
    if (tier > 0) {
      result.push({
        teamupId: traitId,
        count: entry.count,
        tier,
        sourceInstanceIds: entry.sources
      });
    }
  }

  return result.sort((a, b) => a.teamupId.localeCompare(b.teamupId));
};
