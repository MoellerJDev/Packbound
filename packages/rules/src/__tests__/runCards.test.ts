import { describe, expect, it } from "vitest";

import {
  asCardDefId,
  asCardInstanceId,
  asPlayerId,
  type BoardPlacement,
  type CardInstance
} from "@packbound/shared";

import {
  createRun,
  findRunCard,
  isCardActiveInRun,
  ownedRunCards,
  uniqueActiveCardEntriesForRun,
  type RunState
} from "../index";

const ownerId = asPlayerId("run-cards-player");
const boardCardInstanceId = asCardInstanceId("run-cards:board:cinder-scout");

const boardPlacement: BoardPlacement = {
  cardInstanceId: boardCardInstanceId,
  defId: asCardDefId("cinder_scout"),
  ownerId,
  position: { row: 0, col: 0, layer: "ground" }
};

const activeBoardCard = (upgradeLevel = 1): CardInstance => ({
  instanceId: boardCardInstanceId,
  defId: asCardDefId("cinder_scout"),
  ownerId,
  zone: "board",
  modifiers: [],
  upgradeLevel
});

const createBoardRun = (activeCards: readonly CardInstance[] = []): RunState =>
  createRun({
    seed: "run-cards",
    playerId: ownerId,
    starterKit: {
      id: "run-cards-kit",
      name: "Run Cards Kit",
      board: { placements: [boardPlacement] },
      activeCards
    }
  });

describe("run card helpers", () => {
  it("synthesizes board fallback cards for active lookups", () => {
    const run = { ...createBoardRun(), activeCards: [] };

    expect(uniqueActiveCardEntriesForRun(run)).toEqual([
      {
        zone: "board",
        card: {
          instanceId: boardCardInstanceId,
          defId: asCardDefId("cinder_scout"),
          ownerId,
          zone: "board",
          modifiers: [],
          upgradeLevel: 0
        }
      }
    ]);
    expect(findRunCard(run, boardCardInstanceId)?.upgradeLevel).toBe(0);
    expect(isCardActiveInRun(run, boardCardInstanceId)).toBe(true);
  });

  it("prefers active card data over board fallback data", () => {
    const run = createBoardRun([activeBoardCard(2)]);

    expect(uniqueActiveCardEntriesForRun(run)).toEqual([
      {
        zone: "board",
        card: {
          instanceId: boardCardInstanceId,
          defId: asCardDefId("cinder_scout"),
          ownerId,
          zone: "board",
          modifiers: [],
          upgradeLevel: 2
        }
      }
    ]);
    expect(findRunCard(run, boardCardInstanceId)?.upgradeLevel).toBe(2);
  });

  it("keeps owned card lists deduped without inventing board fallback cards", () => {
    const run = { ...createBoardRun(), activeCards: [] };

    expect(ownedRunCards(run)).toEqual([]);
  });
});
