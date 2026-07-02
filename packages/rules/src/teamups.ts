import type { ContentCatalog } from "@packbound/content";
import {
  ASPECTS,
  type ActiveTeamup,
  type BoardState,
  type CardInstanceId
} from "@packbound/shared";

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
    if (
      !def ||
      (def.cardType !== "Unit" && def.cardType !== "Echo" && def.cardType !== "Relic")
    ) {
      continue;
    }

    for (const aspect of def.aspects) {
      const key = `aspect:${aspect}`;
      const entry = counts.get(key) ?? { count: 0, sources: [] };
      entry.count += 1;
      entry.sources.push(placement.cardInstanceId);
      counts.set(key, entry);
    }

    for (const tag of def.tags) {
      const key = `tag:${tag}`;
      const entry = counts.get(key) ?? { count: 0, sources: [] };
      entry.count += 1;
      entry.sources.push(placement.cardInstanceId);
      counts.set(key, entry);
    }
  }

  const result: ActiveTeamup[] = [];
  for (const [key, entry] of counts) {
    const isAspect = ASPECTS.some((aspect) => key === `aspect:${aspect}`);
    const tier = tierForCount(entry.count, isAspect ? [2, 4, 6] : [2, 3, 5]);
    if (tier > 0) {
      result.push({
        teamupId: key,
        count: entry.count,
        tier,
        sourceInstanceIds: entry.sources
      });
    }
  }

  return result.sort((a, b) => a.teamupId.localeCompare(b.teamupId));
};
