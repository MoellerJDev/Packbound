import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import {
  asCardDefId,
  asCardInstanceId,
  asPlayerId,
  type CardInstance
} from "@packbound/shared";

import {
  addCardToSourceRow,
  addCardToSpellrail,
  buildCombatantSetupForRun,
  createCardInstance,
  createRunFromStarterKit,
  placeCardOnBoard,
  removeCardFromBoard,
  removeCardFromSourceRow,
  removeCardFromSpellrail,
  validateRunLoadout,
  type RunState
} from "../index";

const createStarterRun = (seed = "starter-seed"): RunState =>
  createRunFromStarterKit({
    seed,
    catalog: sampleCatalog,
    starterKitId: "ember_scrappers",
    playerId: asPlayerId("test-player")
  });

const requirePoolCard = (run: RunState, defId: string): CardInstance => {
  const card = run.pool.find((candidate) => candidate.defId === asCardDefId(defId));
  if (!card) {
    throw new Error(`Expected ${defId} in pool`);
  }
  return card;
};

const poolCard = (run: RunState, defId: string, suffix: string = defId): CardInstance =>
  createCardInstance({
    ownerId: run.playerId,
    defId: asCardDefId(defId),
    zone: "pool",
    instanceId: asCardInstanceId(`${run.runId}:test-pool:${suffix}`)
  });

const withPoolCard = (run: RunState, card: CardInstance): RunState => ({
  ...run,
  pool: [...run.pool, card]
});

const allStarterInstanceIds = (run: RunState): readonly string[] => [
  ...run.pool.map((card) => card.instanceId),
  ...run.board.placements.map((placement) => placement.cardInstanceId),
  ...run.sourceRow.cards.map((card) => card.instanceId),
  ...run.spellrail.cards.map((card) => card.instanceId),
  ...run.ashes.map((card) => card.instanceId),
  ...run.void.map((card) => card.instanceId)
];

describe("starter kit run creation", () => {
  it("creates deterministic runs from the same starter kit and seed", () => {
    const first = createStarterRun("same-starter-seed");
    const second = createStarterRun("same-starter-seed");

    expect(second).toEqual(first);
    expect(first.starterKitId).toBe("ember_scrappers");
  });

  it("rewrites starter ownership and instance ids deterministically", () => {
    const run = createStarterRun("owner-seed");
    const ids = allStarterInstanceIds(run);

    expect(run.playerId).toBe(asPlayerId("test-player"));
    expect(new Set(ids).size).toBe(ids.length);
    expect(
      ids.every((id) => id.startsWith(`${run.runId}:starter:ember_scrappers:`))
    ).toBe(true);
    expect(
      run.board.placements.every((placement) => placement.ownerId === run.playerId)
    ).toBe(true);
    expect(run.sourceRow.cards.every((card) => card.ownerId === run.playerId)).toBe(true);
    expect(JSON.parse(JSON.stringify(run))).toEqual(run);
  });

  it("builds player combat setup from RunState", () => {
    const run = createStarterRun("combat-setup-seed");
    const setup = buildCombatantSetupForRun(run);

    expect(setup).toEqual({
      playerId: run.playerId,
      board: run.board,
      sourceRow: run.sourceRow,
      spellrail: run.spellrail
    });
    expect(JSON.parse(JSON.stringify(setup))).toEqual(setup);
  });

  it("throws for unknown starter kit ids", () => {
    expect(() =>
      createRunFromStarterKit({
        seed: "missing-kit-seed",
        catalog: sampleCatalog,
        starterKitId: "missing-kit"
      })
    ).toThrow(/Unknown starter kit/);
  });
});

describe("run loadout movement", () => {
  it("places a pool card on board and removes it from pool", () => {
    const run = createStarterRun("place-seed");
    const card = requirePoolCard(run, "signal_nest");
    const placed = placeCardOnBoard(run, card.instanceId, {
      row: 1,
      col: 2,
      layer: "support"
    });

    expect(run.pool).toContain(card);
    expect(placed.pool.map((entry) => entry.instanceId)).not.toContain(card.instanceId);
    expect(placed.board.placements).toContainEqual({
      cardInstanceId: card.instanceId,
      defId: card.defId,
      ownerId: run.playerId,
      position: { row: 1, col: 2, layer: "support" }
    });
  });

  it("removing a board card returns it to pool", () => {
    const run = createStarterRun("remove-board-seed");
    const activeCardId = run.board.placements[0]?.cardInstanceId;
    if (!activeCardId) {
      throw new Error("Expected board card");
    }

    const removed = removeCardFromBoard(run, activeCardId);

    expect(removed.board.placements).toHaveLength(0);
    expect(removed.pool.map((card) => card.instanceId)).toContain(activeCardId);
    expect(removed.pool.find((card) => card.instanceId === activeCardId)?.zone).toBe(
      "pool"
    );
  });

  it("adding and removing a Source updates the Source Row", () => {
    const baseRun = createStarterRun("source-seed");
    const run = withPoolCard(baseRun, poolCard(baseRun, "bloom_source"));
    const source = requirePoolCard(run, "bloom_source");

    const added = addCardToSourceRow(run, source.instanceId);
    const removed = removeCardFromSourceRow(added, source.instanceId);

    expect(added.pool.map((card) => card.instanceId)).not.toContain(source.instanceId);
    expect(
      added.sourceRow.cards.find((card) => card.instanceId === source.instanceId)
    ).toMatchObject({ zone: "sourceRow" });
    expect(removed.sourceRow.cards.map((card) => card.instanceId)).not.toContain(
      source.instanceId
    );
    expect(
      removed.pool.find((card) => card.instanceId === source.instanceId)
    ).toMatchObject({ zone: "pool" });
  });

  it("adding and removing a Technique updates the Spellrail", () => {
    const baseRun = createStarterRun("technique-seed");
    const run = withPoolCard(baseRun, poolCard(baseRun, "phase_step"));
    const technique = requirePoolCard(run, "phase_step");

    const added = addCardToSpellrail(run, technique.instanceId);
    const removed = removeCardFromSpellrail(added, technique.instanceId);

    expect(added.pool.map((card) => card.instanceId)).not.toContain(technique.instanceId);
    expect(
      added.spellrail.cards.find((card) => card.instanceId === technique.instanceId)
    ).toMatchObject({ zone: "spellrail" });
    expect(removed.spellrail.cards.map((card) => card.instanceId)).not.toContain(
      technique.instanceId
    );
    expect(
      removed.pool.find((card) => card.instanceId === technique.instanceId)
    ).toMatchObject({ zone: "pool" });
  });

  it("invalid zone moves throw clear errors", () => {
    const run = createStarterRun("invalid-move-seed");
    const activeCardId = run.board.placements[0]?.cardInstanceId;
    if (!activeCardId) {
      throw new Error("Expected board card");
    }

    expect(() =>
      placeCardOnBoard(run, activeCardId, { row: 0, col: 0, layer: "ground" })
    ).toThrow(/not in the run pool/);
    expect(() => removeCardFromSpellrail(run, activeCardId)).toThrow(/Spellrail/);
  });
});

describe("run loadout validation", () => {
  it("accepts a legal starter kit loadout", () => {
    const run = createStarterRun("legal-seed");

    expect(validateRunLoadout(run, sampleCatalog).ok).toBe(true);
  });

  it("rejects illegal over-capacity loadouts", () => {
    const run = createStarterRun("over-capacity-seed");
    const signalNest = requirePoolCard(run, "signal_nest");
    const overloaded = placeCardOnBoard(run, signalNest.instanceId, {
      row: 1,
      col: 2,
      layer: "support"
    });

    expect(
      validateRunLoadout(overloaded, sampleCatalog).errors.map((error) => error.code)
    ).toContain("BOARD_CHARGE_EXCEEDED");
  });

  it("rejects loadouts with missing aspect access", () => {
    const run = createStarterRun("missing-aspect-seed");
    const boardCardId = run.board.placements[0]?.cardInstanceId;
    if (!boardCardId) {
      throw new Error("Expected board card");
    }
    const withoutBoard = removeCardFromBoard(run, boardCardId);
    const withBloomCard = withPoolCard(
      withoutBoard,
      poolCard(withoutBoard, "sporeback_beast")
    );
    const missingAspect = placeCardOnBoard(
      withBloomCard,
      requirePoolCard(withBloomCard, "sporeback_beast").instanceId,
      { row: 0, col: 2, layer: "ground" }
    );

    expect(
      validateRunLoadout(missingAspect, sampleCatalog).errors.map((error) => error.code)
    ).toContain("MISSING_ASPECT_ACCESS");
  });
});
