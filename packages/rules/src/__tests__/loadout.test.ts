import { describe, expect, it } from "vitest";

import {
  loadContentCatalog,
  sampleCards,
  sampleCatalog,
  samplePacks,
  sampleStarterKits
} from "@packbound/content";
import {
  asCardDefId,
  asCardInstanceId,
  asPlayerId,
  type CardDefinition,
  type CardInstance
} from "@packbound/shared";

import {
  addCardToSourceRow,
  addCardToSpellrail,
  buildCombatantSetupForRun,
  canAddCardToSourceRow,
  canAddCardToSpellrail,
  canPlaceCardOnBoard,
  createCardInstance,
  createRunFromStarterKit,
  getDefaultBoardPositionForCard,
  getLegalLoadoutActions,
  placeCardOnBoard,
  removeCardFromBoard,
  removeCardFromSourceRow,
  removeCardFromSpellrail,
  returnCardToPool,
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

const modifiedPoolCard = (
  run: RunState,
  defId: string,
  suffix: string
): CardInstance => ({
  ...poolCard(run, defId, suffix),
  modifiers: [
    {
      id: `test-modifier:${suffix}`,
      type: "StatModifier",
      sourceId: "test-source",
      stackingRule: "stack",
      metadata: { attack: 1, note: suffix }
    }
  ],
  upgradeLevel: 2,
  createdBy: asCardInstanceId(`${run.runId}:created-by:${suffix}`),
  isEcho: true
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

const gearCard: CardDefinition = {
  id: asCardDefId("test_hook_gear"),
  name: "Test Hook Gear",
  set: "ember_foundry",
  rarity: "common",
  cardType: "Gear",
  aspects: ["Ember"],
  cost: { generic: 1 },
  tags: ["Gear"],
  keywords: [],
  abilities: [],
  attachment: { legalCardTypes: ["Unit", "Echo"] }
};

const catalogWithUnsupportedGear = loadContentCatalog({
  cards: [...sampleCards, gearCard],
  packs: samplePacks,
  starterKits: sampleStarterKits
});

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
    expect(run.activeCards.map((card) => card.instanceId)).toEqual(
      run.board.placements.map((placement) => placement.cardInstanceId)
    );
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

  it.each(sampleStarterKits)("creates a legal combat setup for $id", (starterKit) => {
    const run = createRunFromStarterKit({
      seed: `legal-${starterKit.id}`,
      catalog: sampleCatalog,
      starterKitId: starterKit.id,
      playerId: asPlayerId("test-player")
    });
    const setup = buildCombatantSetupForRun(run);

    expect(validateRunLoadout(run, sampleCatalog).ok).toBe(true);
    expect(setup.board.placements.length, starterKit.id).toBeGreaterThan(0);
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
    expect(
      placed.activeCards.find((entry) => entry.instanceId === card.instanceId)
    ).toMatchObject({ defId: card.defId, zone: "board" });
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
    expect(removed.activeCards.map((card) => card.instanceId)).not.toContain(
      activeCardId
    );
  });

  it("preserves full card instance data through pool to board to pool", () => {
    const baseRun = createStarterRun("board-preserve-seed");
    const original = modifiedPoolCard(baseRun, "ember_scraprunner", "board");
    const run = withPoolCard(baseRun, original);

    const placed = placeCardOnBoard(run, original.instanceId, {
      row: 1,
      col: 1,
      layer: "ground"
    });
    const removed = removeCardFromBoard(placed, original.instanceId);

    expect(
      placed.activeCards.find((card) => card.instanceId === original.instanceId)
    ).toMatchObject({
      ...original,
      zone: "board"
    });
    expect(removed.pool.find((card) => card.instanceId === original.instanceId)).toEqual(
      original
    );
  });

  it("preserves full card instance data through pool to Source Row to pool", () => {
    const baseRun = createStarterRun("source-preserve-seed");
    const original = modifiedPoolCard(baseRun, "bloom_source", "source");
    const run = withPoolCard(baseRun, original);

    const added = addCardToSourceRow(run, original.instanceId);
    const removed = removeCardFromSourceRow(added, original.instanceId);

    expect(
      added.sourceRow.cards.find((card) => card.instanceId === original.instanceId)
    ).toMatchObject({
      ...original,
      zone: "sourceRow"
    });
    expect(removed.pool.find((card) => card.instanceId === original.instanceId)).toEqual(
      original
    );
  });

  it("preserves full card instance data through pool to Spellrail to pool", () => {
    const baseRun = createStarterRun("spell-preserve-seed");
    const original = modifiedPoolCard(baseRun, "phase_step", "spellrail");
    const run = withPoolCard(baseRun, original);

    const added = addCardToSpellrail(run, original.instanceId);
    const removed = removeCardFromSpellrail(added, original.instanceId);

    expect(
      added.spellrail.cards.find((card) => card.instanceId === original.instanceId)
    ).toMatchObject({
      ...original,
      zone: "spellrail"
    });
    expect(removed.pool.find((card) => card.instanceId === original.instanceId)).toEqual(
      original
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

describe("legal loadout actions", () => {
  it("returns a board placement action for a legal Unit", () => {
    const run = createRunFromStarterKit({
      seed: "unit-action-seed",
      catalog: sampleCatalog,
      starterKitId: "rotbloom_recall",
      playerId: asPlayerId("test-player")
    });
    const card = requirePoolCard(run, "sporeback_beast");
    const defaultPosition = getDefaultBoardPositionForCard(
      run,
      sampleCatalog,
      card.instanceId
    );

    expect(defaultPosition).toEqual({ row: 0, col: 0, layer: "ground" });
    expect(
      canPlaceCardOnBoard(run, sampleCatalog, card.instanceId, defaultPosition!)
    ).toEqual({ ok: true });
    expect(getLegalLoadoutActions(run, sampleCatalog, card.instanceId)).toContainEqual({
      type: "placeOnBoard",
      position: defaultPosition,
      label: "Place on Board"
    });
  });

  it("returns a board placement action for a legal Relic", () => {
    const baseRun = createStarterRun("relic-action-seed");
    const activeCardId = baseRun.board.placements[0]?.cardInstanceId;
    if (!activeCardId) {
      throw new Error("Expected board card");
    }
    const run = removeCardFromBoard(baseRun, activeCardId);
    const relic = requirePoolCard(run, "signal_nest");

    expect(getDefaultBoardPositionForCard(run, sampleCatalog, relic.instanceId)).toEqual({
      row: 0,
      col: 0,
      layer: "support"
    });
    expect(getLegalLoadoutActions(run, sampleCatalog, relic.instanceId)).toContainEqual({
      type: "placeOnBoard",
      position: { row: 0, col: 0, layer: "support" },
      label: "Place on Board"
    });
  });

  it("returns Source Row and Spellrail actions for legal cards", () => {
    const baseSourceRun = createStarterRun("source-action-seed");
    const sourceRun = withPoolCard(
      baseSourceRun,
      poolCard(baseSourceRun, "bloom_source", "source-action")
    );
    const source = requirePoolCard(sourceRun, "bloom_source");

    expect(canAddCardToSourceRow(sourceRun, sampleCatalog, source.instanceId)).toEqual({
      ok: true
    });
    expect(getLegalLoadoutActions(sourceRun, sampleCatalog, source.instanceId)).toEqual([
      { type: "addToSourceRow", label: "Add to Source Row" }
    ]);

    const baseSpellRun = createRunFromStarterKit({
      seed: "spell-action-seed",
      catalog: sampleCatalog,
      starterKitId: "cloudspire_phase",
      playerId: asPlayerId("test-player")
    });
    const spellRun = withPoolCard(
      baseSpellRun,
      poolCard(baseSpellRun, "phase_step", "spell-action")
    );
    const technique = requirePoolCard(spellRun, "phase_step");

    expect(canAddCardToSpellrail(spellRun, sampleCatalog, technique.instanceId)).toEqual({
      ok: true
    });
    expect(getLegalLoadoutActions(spellRun, sampleCatalog, technique.instanceId)).toEqual(
      [{ type: "addToSpellrail", label: "Add to Spellrail" }]
    );
  });

  it("returns a pool action for active loadout cards", () => {
    const run = createStarterRun("return-action-seed");
    const activeCardId = run.board.placements[0]?.cardInstanceId;
    if (!activeCardId) {
      throw new Error("Expected board card");
    }

    expect(getLegalLoadoutActions(run, sampleCatalog, activeCardId)).toEqual([
      { type: "returnToPool", label: "Return to Pool" }
    ]);
    expect(
      returnCardToPool(run, activeCardId).pool.map((card) => card.instanceId)
    ).toContain(activeCardId);
  });

  it("returns no legal action and clear reasons for unsupported card types", () => {
    const baseRun = createStarterRun("gear-action-seed");
    const gear = poolCard(baseRun, "test_hook_gear", "gear-action");
    const run = withPoolCard(baseRun, gear);
    const position = { row: 0, col: 0, layer: "support" } as const;

    expect(
      getLegalLoadoutActions(run, catalogWithUnsupportedGear, gear.instanceId)
    ).toEqual([]);
    expect(
      canPlaceCardOnBoard(run, catalogWithUnsupportedGear, gear.instanceId, position)
    ).toEqual({
      ok: false,
      reason: "Test Hook Gear cannot be placed on the board yet."
    });
    expect(
      JSON.parse(
        JSON.stringify(getLegalLoadoutActions(run, sampleCatalog, gear.instanceId))
      )
    ).toEqual(getLegalLoadoutActions(run, sampleCatalog, gear.instanceId));
  });
});
