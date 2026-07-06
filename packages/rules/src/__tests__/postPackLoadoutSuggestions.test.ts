import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import {
  BOARD_COLS,
  BOARD_ROWS,
  asCardDefId,
  asCardInstanceId,
  asPackId,
  asPlayerId,
  type BoardPlacement,
  type CardInstance,
  type PackOpenResult
} from "@packbound/shared";

import {
  buildPostPackLoadoutSuggestions,
  createCardInstance,
  createRunFromStarterKit,
  getLatestOpenedPackCardInstanceIds,
  getLegalLoadoutActions,
  openPack,
  type RunState
} from "../index";

const createStarterRun = (
  starterKitId = "ember_scrappers",
  seed = `post-pack:${starterKitId}`
): RunState =>
  createRunFromStarterKit({
    seed,
    catalog: sampleCatalog,
    starterKitId,
    playerId: asPlayerId(`post-pack:${starterKitId}`)
  });

const packCard = (run: RunState, defId: string, suffix = defId): CardInstance => {
  const definition = sampleCatalog.cardsById.get(asCardDefId(defId));
  if (!definition) {
    throw new Error(`Expected sample card definition for ${defId}`);
  }

  return createCardInstance({
    ownerId: run.playerId,
    defId: definition.id,
    zone: "pool",
    instanceId: asCardInstanceId(`${run.runId}:post-pack:${suffix}`),
    isEcho: definition.cardType === "Echo"
  });
};

const openedPack = (
  run: RunState,
  packId: string,
  seed: string,
  cards: readonly CardInstance[]
): PackOpenResult => ({
  packId: asPackId(packId),
  seed,
  cards,
  slots: cards.map((card, slotIndex) => {
    const definition = sampleCatalog.cardsById.get(card.defId);
    if (!definition) {
      throw new Error(`Expected sample card definition for ${card.defId}`);
    }

    return {
      slotIndex,
      slotType: "rarity",
      actualRarity: definition.rarity,
      cardDefId: card.defId,
      cardInstanceId: card.instanceId
    };
  })
});

const withOpenedPack = (
  run: RunState,
  pack: PackOpenResult,
  extraPoolCards: readonly CardInstance[] = []
): RunState => ({
  ...run,
  pool: [...run.pool, ...extraPoolCards, ...pack.cards],
  openedPacks: [...run.openedPacks, pack]
});

const runWithFullGroundLayer = (run: RunState): RunState => {
  const activeCards: CardInstance[] = [];
  const placements: BoardPlacement[] = [];

  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      const card = packCard(run, "cinder_scout", `full-ground-${row}-${col}`);
      activeCards.push({ ...card, zone: "board" });
      placements.push({
        cardInstanceId: card.instanceId,
        defId: card.defId,
        ownerId: run.playerId,
        position: { row, col, layer: "ground" }
      });
    }
  }

  return {
    ...run,
    activeCards,
    board: { placements }
  };
};

describe("post-pack loadout suggestions", () => {
  it("returns latest opened pack card IDs as serializable data", () => {
    const run = createStarterRun();
    const firstOpenedPack = openPack({
      catalog: sampleCatalog,
      packId: asPackId("ember_foundry_pack"),
      seed: "post-pack:first-pack",
      ownerId: run.playerId
    });
    const latestOpenedPack = openPack({
      catalog: sampleCatalog,
      packId: asPackId("rotbloom_pack"),
      seed: "post-pack:latest-pack",
      ownerId: run.playerId
    });
    const runWithPacks = {
      ...run,
      pool: [...run.pool, ...firstOpenedPack.cards, ...latestOpenedPack.cards],
      openedPacks: [firstOpenedPack, latestOpenedPack]
    };
    const ids = getLatestOpenedPackCardInstanceIds(runWithPacks);

    expect(ids).toEqual(latestOpenedPack.cards.map((card) => card.instanceId));
    expect(JSON.parse(JSON.stringify(ids))).toEqual(ids);
  });

  it("returns an empty post-pack suggestion summary before any pack is opened", () => {
    const run = createStarterRun();
    const summary = buildPostPackLoadoutSuggestions(run, sampleCatalog);

    expect(summary).toEqual({
      latestOpenedCardCount: 0,
      editableNow: true,
      suggestions: [],
      emptyText: "Open a reward pack to see suggested loadout edits."
    });
    expect(JSON.parse(JSON.stringify(summary))).toEqual(summary);
  });

  it("keeps post-pack suggestions locked until the next planning phase", () => {
    const run = createStarterRun();
    const latestPack = openedPack(run, "ember_foundry_pack", "post-pack:reward", [
      packCard(run, "ember_source")
    ]);
    const rewardRun = {
      ...withOpenedPack(run, latestPack),
      phase: "reward" as const
    };
    const summary = buildPostPackLoadoutSuggestions(rewardRun, sampleCatalog);

    expect(summary.latestPackName).toBe("Ember Foundry Pack");
    expect(summary.latestOpenedCardCount).toBe(1);
    expect(summary.editableNow).toBe(false);
    expect(summary.suggestions).toEqual([]);
    expect(summary.emptyText).toBe(
      "New cards are in your pool. Advance to the next planning round to edit your loadout."
    );
  });

  it("uses only latest opened pack cards for post-pack suggestions", () => {
    const run = createStarterRun();
    const olderCard = packCard(run, "cracked_prism", "older-cracked-prism");
    const olderPack = openedPack(run, "source_pack", "post-pack:older", [olderCard]);
    const latestCard = packCard(run, "sparkfall", "latest-sparkfall");
    const latestPack = openedPack(run, "ember_foundry_pack", "post-pack:latest", [
      latestCard
    ]);
    const runWithPacks = {
      ...run,
      pool: [...run.pool, olderCard, latestCard],
      openedPacks: [olderPack, latestPack]
    };
    const summary = buildPostPackLoadoutSuggestions(runWithPacks, sampleCatalog);

    expect(summary.suggestions.map((suggestion) => suggestion.cardInstanceId)).toEqual([
      latestCard.instanceId
    ]);
    expect(summary.suggestions[0]?.cardName).toBe("Sparkfall");
  });

  it("prioritizes legal Source, Technique, and board placement suggestions deterministically", () => {
    const run = createStarterRun();
    const latestPack = openedPack(run, "ember_foundry_pack", "post-pack:mixed", [
      packCard(run, "cinder_scout", "latest-cinder"),
      packCard(run, "sparkfall", "latest-sparkfall"),
      packCard(run, "ember_source", "latest-source"),
      packCard(run, "coal_wisp_echo", "latest-echo")
    ]);
    const planningRun = withOpenedPack(run, latestPack);
    const summary = buildPostPackLoadoutSuggestions(planningRun, sampleCatalog);
    const actionTypes = summary.suggestions.map((suggestion) => suggestion.action?.type);

    expect(summary.latestPackName).toBe("Ember Foundry Pack");
    expect(summary.editableNow).toBe(true);
    expect(actionTypes).toEqual([
      "addToSourceRow",
      "addToSpellrail",
      "placeOnBoard",
      "placeOnBoard"
    ]);
    expect(summary.suggestions.map((suggestion) => suggestion.priority)).toEqual([
      "high",
      "medium",
      "medium",
      "medium"
    ]);
    expect(summary.suggestions[0]?.reason).toContain("Board Charge");
    expect(buildPostPackLoadoutSuggestions(planningRun, sampleCatalog)).toEqual(summary);
    expect(JSON.parse(JSON.stringify(summary))).toEqual(summary);
  });

  it("groups duplicate latest-pack suggestions with the same recommendation", () => {
    const run = createStarterRun();
    const firstCopy = packCard(run, "cracked_prism", "first-cracked-prism");
    const secondCopy = packCard(run, "cracked_prism", "second-cracked-prism");
    const latestPack = openedPack(run, "source_pack", "post-pack:duplicate-sources", [
      firstCopy,
      secondCopy
    ]);
    const planningRun = withOpenedPack(run, latestPack);
    const summary = buildPostPackLoadoutSuggestions(planningRun, sampleCatalog);
    const suggestion = summary.suggestions[0];

    expect(summary.latestOpenedCardCount).toBe(2);
    expect(summary.suggestions).toHaveLength(1);
    expect(suggestion).toMatchObject({
      cardInstanceId: firstCopy.instanceId,
      groupedCardInstanceIds: [firstCopy.instanceId, secondCopy.instanceId],
      cardName: "Cracked Prism",
      displayName: "Cracked Prism x2",
      duplicateCount: 2,
      headline: "Add one to Source Row",
      priority: "high"
    });
    expect(suggestion?.reason).toBe(
      "2 copies opened. Adds Board Charge, Aspect access, and Combat Charge/sec from this Source."
    );
    expect(suggestion?.action).toEqual({
      type: "addToSourceRow",
      label: "Add to Source Row"
    });
    expect(
      getLegalLoadoutActions(planningRun, sampleCatalog, firstCopy.instanceId)
    ).toContainEqual(suggestion?.action);
    expect(buildPostPackLoadoutSuggestions(planningRun, sampleCatalog)).toEqual(summary);
    expect(JSON.parse(JSON.stringify(summary))).toEqual(summary);
  });

  it("keeps same-name suggestions separate when their action types differ", () => {
    const run = createStarterRun();
    const legalSource = packCard(run, "ember_source", "legal-source-copy");
    const staleSource = packCard(run, "ember_source", "stale-source-copy");
    const latestPack = openedPack(run, "source_pack", "post-pack:mixed-source-actions", [
      legalSource,
      staleSource
    ]);
    const planningRun = {
      ...run,
      pool: [...run.pool, legalSource],
      openedPacks: [latestPack]
    };
    const summary = buildPostPackLoadoutSuggestions(planningRun, sampleCatalog);

    expect(summary.latestOpenedCardCount).toBe(2);
    expect(summary.suggestions).toHaveLength(2);
    expect(summary.suggestions.map((suggestion) => suggestion.displayName)).toEqual([
      "Ember Source",
      "Ember Source"
    ]);
    expect(summary.suggestions.map((suggestion) => suggestion.duplicateCount)).toEqual([
      1, 1
    ]);
    expect(summary.suggestions.map((suggestion) => suggestion.action?.type)).toEqual([
      "addToSourceRow",
      undefined
    ]);
    expect(summary.suggestions[0]?.groupedCardInstanceIds).toEqual([
      legalSource.instanceId
    ]);
    expect(summary.suggestions[1]?.groupedCardInstanceIds).toEqual([
      staleSource.instanceId
    ]);
    expect(summary.suggestions[1]?.headline).toBe("No pool edit available");
  });

  it("explains Source Row capacity for unavailable Source suggestions", () => {
    const run = createStarterRun();
    const sourceRowFullRun = {
      ...run,
      sourceRow: { ...run.sourceRow, maxSlots: run.sourceRow.cards.length }
    };
    const latestPack = openedPack(
      sourceRowFullRun,
      "source_pack",
      "post-pack:full-source-row",
      [packCard(sourceRowFullRun, "ember_source", "blocked-source")]
    );
    const summary = buildPostPackLoadoutSuggestions(
      withOpenedPack(sourceRowFullRun, latestPack),
      sampleCatalog
    );

    expect(summary.suggestions).toHaveLength(1);
    expect(summary.suggestions[0]).toMatchObject({
      cardName: "Ember Source",
      cardType: "Source",
      headline: "Source Row full",
      priority: "low",
      reason: "Source Row is full. Return a Source to Pool before adding this one.",
      unavailableReason: "Source Row slots: 1 / 1."
    });
    expect(summary.suggestions[0]?.action).toBeUndefined();
  });

  it("explains Spellrail slots for unavailable Technique suggestions", () => {
    const run = createStarterRun();
    const spellrailFullRun = {
      ...run,
      spellrail: { ...run.spellrail, maxSlots: run.spellrail.cards.length }
    };
    const latestPack = openedPack(
      spellrailFullRun,
      "ember_foundry_pack",
      "post-pack:full-spellrail",
      [packCard(spellrailFullRun, "sparkfall", "blocked-technique")]
    );
    const summary = buildPostPackLoadoutSuggestions(
      withOpenedPack(spellrailFullRun, latestPack),
      sampleCatalog
    );

    expect(summary.suggestions).toHaveLength(1);
    expect(summary.suggestions[0]).toMatchObject({
      cardName: "Sparkfall",
      cardType: "Technique",
      headline: "Spellrail full",
      priority: "low",
      reason: "Spellrail is full. Return a Technique to Pool before adding this one.",
      unavailableReason: "Spellrail slots: 1 / 1."
    });
    expect(summary.suggestions[0]?.action).toBeUndefined();
  });

  it("explains Board Charge for unavailable board-card suggestions", () => {
    const run = createStarterRun();
    const latestPack = openedPack(run, "ember_foundry_pack", "post-pack:board-charge", [
      packCard(run, "cinder_tally_relic", "blocked-relic")
    ]);
    const summary = buildPostPackLoadoutSuggestions(
      withOpenedPack(run, latestPack),
      sampleCatalog
    );

    expect(summary.suggestions).toHaveLength(1);
    expect(summary.suggestions[0]).toMatchObject({
      cardName: "Cinder Tally",
      cardType: "Relic",
      headline: "Board Charge blocked",
      priority: "low",
      unavailableReason: "Board uses 4 Charge, but the Source Row provides 3."
    });
    expect(summary.suggestions[0]?.reason).toContain("Add Source capacity");
    expect(summary.suggestions[0]?.action).toBeUndefined();
  });

  it("explains occupied board layers for unavailable board-card suggestions", () => {
    const run = runWithFullGroundLayer(createStarterRun());
    const latestPack = openedPack(run, "ember_foundry_pack", "post-pack:full-ground", [
      packCard(run, "coal_wisp_echo", "blocked-echo")
    ]);
    const summary = buildPostPackLoadoutSuggestions(
      withOpenedPack(run, latestPack),
      sampleCatalog
    );

    expect(summary.suggestions).toHaveLength(1);
    expect(summary.suggestions[0]).toMatchObject({
      cardName: "Coal Wisp Echo",
      cardType: "Echo",
      headline: "No open ground cell",
      priority: "low",
      unavailableReason:
        "All ground cells are occupied or unavailable. Return a board card to Pool before placing this one."
    });
    expect(summary.suggestions[0]?.reason).toContain("Units/Echoes use ground");
    expect(summary.suggestions[0]?.action).toBeUndefined();
  });

  it("never suggests an action outside existing legal loadout actions", () => {
    const run = createStarterRun();
    const latestPack = openedPack(run, "ember_foundry_pack", "post-pack:legal-actions", [
      packCard(run, "ember_source", "legal-source"),
      packCard(run, "sparkfall", "legal-technique"),
      packCard(run, "cinder_scout", "legal-unit")
    ]);
    const planningRun = withOpenedPack(run, latestPack);
    const summary = buildPostPackLoadoutSuggestions(planningRun, sampleCatalog);

    for (const suggestion of summary.suggestions) {
      if (!suggestion.action) {
        continue;
      }
      expect(
        getLegalLoadoutActions(planningRun, sampleCatalog, suggestion.cardInstanceId)
      ).toContainEqual(suggestion.action);
    }
  });
});
