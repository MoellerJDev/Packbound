import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import {
  asCardDefId,
  asCardInstanceId,
  asPackId,
  asPlayerId,
  type CardInstance,
  type PackOpenResult
} from "@packbound/shared";

import {
  buildLoadoutResourceSummary,
  buildPostPackLoadoutSuggestions,
  createRunFromStarterKit,
  createCardInstance,
  getLatestOpenedPackCardInstanceIds,
  getLegalLoadoutActions,
  getRunNextActionMessage,
  openPack,
  validateRunLoadout,
  type RunState
} from "../index";

const createStarterRun = (
  starterKitId = "ember_scrappers",
  seed = `clarity:${starterKitId}`
): RunState =>
  createRunFromStarterKit({
    seed,
    catalog: sampleCatalog,
    starterKitId,
    playerId: asPlayerId(`clarity:${starterKitId}`)
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
    instanceId: asCardInstanceId(`${run.runId}:clarity-pack:${suffix}`),
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

describe("run clarity helpers", () => {
  it("summarizes Source Row resources deterministically", () => {
    const run = createStarterRun("rotbloom_recall");
    const summary = buildLoadoutResourceSummary(run, sampleCatalog);

    expect(summary.boardChargeUsed).toBe(2);
    expect(summary.boardChargeCapacity).toBe(7);
    expect(summary.boardChargeText).toBe("2 / 7");
    expect(summary.aspectAccess).toMatchObject({ Shade: 1, Bloom: 1 });
    expect(summary.aspectAccessText).toBe("Shade 1, Bloom 1");
    expect(summary.combatChargePerSecond).toBe(0.55);
    expect(summary.combatChargePerSecondText).toBe("0.55");
    expect(summary.sourceSlotsText).toBe("2 / 4");
    expect(buildLoadoutResourceSummary(run, sampleCatalog)).toEqual(summary);
    expect(JSON.parse(JSON.stringify(summary))).toEqual(summary);
  });

  it("returns phase-aware next-action guidance", () => {
    const planningRun = createStarterRun();
    const planningValidation = validateRunLoadout(planningRun, sampleCatalog);
    const illegalRun = {
      ...planningRun,
      sourceRow: { ...planningRun.sourceRow, cards: [] }
    };
    const illegalValidation = validateRunLoadout(illegalRun, sampleCatalog);

    expect(getRunNextActionMessage(planningRun, planningValidation)).toBe(
      "Next: tune your board, Sources, Spellrail, and Commander, then ready combat."
    );
    expect(getRunNextActionMessage(illegalRun, illegalValidation)).toBe(
      "Fix loadout errors before combat."
    );
    expect(
      getRunNextActionMessage(
        { ...planningRun, phase: "combatReady" },
        planningValidation
      )
    ).toBe("Next: review the combat preview, then record combat to lock in the result.");
    expect(
      getRunNextActionMessage({ ...planningRun, phase: "reward" }, planningValidation)
    ).toBe("Next: claim both rewards: open one pack and choose one Commander upgrade.");
    expect(
      getRunNextActionMessage(
        { ...planningRun, phase: "combatResolved" },
        planningValidation
      )
    ).toBe("Next: advance to start the next planning round.");
    expect(
      getRunNextActionMessage(
        { ...planningRun, status: "won", phase: "complete" },
        planningValidation
      )
    ).toBe("Run complete. Reset to start again.");
  });

  it("returns latest opened pack card IDs as serializable data", () => {
    const run = createStarterRun();
    const firstOpenedPack = openPack({
      catalog: sampleCatalog,
      packId: asPackId("ember_foundry_pack"),
      seed: "clarity:first-pack",
      ownerId: run.playerId
    });
    const latestOpenedPack = openPack({
      catalog: sampleCatalog,
      packId: asPackId("rotbloom_pack"),
      seed: "clarity:latest-pack",
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
    const latestPack = openedPack(run, "ember_foundry_pack", "clarity:reward-pack", [
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
    const olderPack = openedPack(run, "source_pack", "clarity:older-pack", [olderCard]);
    const latestCard = packCard(run, "sparkfall", "latest-sparkfall");
    const latestPack = openedPack(run, "ember_foundry_pack", "clarity:latest-pack", [
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
    const latestPack = openedPack(run, "ember_foundry_pack", "clarity:mixed-pack", [
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

  it("returns low-priority unavailable suggestions for latest-pack cards without forward edits", () => {
    const run = createStarterRun();
    const sourceRowFullRun = {
      ...run,
      sourceRow: { ...run.sourceRow, maxSlots: run.sourceRow.cards.length }
    };
    const latestPack = openedPack(
      sourceRowFullRun,
      "source_pack",
      "clarity:full-source-row",
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
      headline: "Inspect for blocked reason",
      priority: "low",
      unavailableReason: "No forward loadout edit is available from this state."
    });
    expect(summary.suggestions[0]?.action).toBeUndefined();
  });

  it("never suggests an action outside existing legal loadout actions", () => {
    const run = createStarterRun();
    const latestPack = openedPack(run, "ember_foundry_pack", "clarity:legal-actions", [
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
