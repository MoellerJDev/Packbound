import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import { applyRunAction, createRunFromStarterKit, type RunState } from "@packbound/rules";
import { asCardInstanceId, asPlayerId, type CardInstance } from "@packbound/shared";

import { buildDefaultPixiLoadoutEditView } from "./defaultPixiLoadoutEditView";

const createBaseRun = (): RunState =>
  applyRunAction(
    createRunFromStarterKit({
      seed: "default-pixi-loadout-edit-test",
      catalog: sampleCatalog,
      starterKitId: "ember_scrappers",
      playerId: asPlayerId("default-pixi-loadout-edit-player"),
      maxRounds: 3
    }),
    sampleCatalog,
    { type: "prepareEncounter" }
  );

const cardName = (card: CardInstance): string =>
  sampleCatalog.cardsById.get(card.defId)?.name ?? card.defId;

const requirePoolCard = (run: RunState, name: string): CardInstance => {
  const card = run.pool.find((candidate) => cardName(candidate) === name);
  if (!card) {
    throw new Error(`Expected ${name} in pool.`);
  }
  return card;
};

const returnSourceToPool = (run: RunState): RunState => {
  const source = run.sourceRow.cards[0];
  if (!source) {
    throw new Error("Expected starter Source Row card.");
  }
  return applyRunAction(run, sampleCatalog, {
    type: "returnCardToPool",
    cardInstanceId: source.instanceId
  });
};

const returnSpellrailToPool = (run: RunState): RunState => {
  const technique = run.spellrail.cards[0];
  if (!technique) {
    throw new Error("Expected starter Spellrail card.");
  }
  return applyRunAction(run, sampleCatalog, {
    type: "returnCardToPool",
    cardInstanceId: technique.instanceId
  });
};

describe("default Pixi loadout edit view", () => {
  it("shows idle guidance when no Pool card is selected", () => {
    const view = buildDefaultPixiLoadoutEditView({
      catalog: sampleCatalog,
      run: createBaseRun(),
      selectedPoolCardId: undefined
    });

    expect(view).toEqual({
      mode: "idle",
      modeLabel: "Loadout",
      statusText: "Select a Pool card below to send it to Source Row or Spellrail.",
      actions: []
    });
  });

  it("ignores a selected id that is not currently in the pool", () => {
    const view = buildDefaultPixiLoadoutEditView({
      catalog: sampleCatalog,
      run: createBaseRun(),
      selectedPoolCardId: asCardInstanceId("missing-pool-card")
    });

    expect(view.mode).toBe("idle");
    expect(view.actions).toEqual([]);
  });

  it("returns a Source Row affordance for a selected Source card", () => {
    const run = returnSourceToPool(createBaseRun());
    const card = requirePoolCard(run, "Ember Source");
    const view = buildDefaultPixiLoadoutEditView({
      catalog: sampleCatalog,
      run,
      selectedPoolCardId: card.instanceId
    });

    expect(view).toMatchObject({
      mode: "selected",
      selectedCardInstanceId: card.instanceId,
      selectedCardName: "Ember Source",
      statusText: "Send Ember Source to Source Row or Spellrail."
    });
    expect(view.actions).toEqual([
      { type: "addToSourceRow", label: "Add to Source Row" }
    ]);
  });

  it("returns a Spellrail affordance for a selected Technique card", () => {
    const run = returnSpellrailToPool(createBaseRun());
    const card = requirePoolCard(run, "Sparkfall");
    const view = buildDefaultPixiLoadoutEditView({
      catalog: sampleCatalog,
      run,
      selectedPoolCardId: card.instanceId
    });

    expect(view).toMatchObject({
      mode: "selected",
      selectedCardInstanceId: card.instanceId,
      selectedCardName: "Sparkfall",
      statusText: "Send Sparkfall to Source Row or Spellrail."
    });
    expect(view.actions).toEqual([{ type: "addToSpellrail", label: "Add to Spellrail" }]);
  });

  it("shows no-zone-action copy for a selected Pool card without zone moves", () => {
    const run = createBaseRun();
    const card = requirePoolCard(run, "Sparkcatch Apprentice");
    const view = buildDefaultPixiLoadoutEditView({
      catalog: sampleCatalog,
      run,
      selectedPoolCardId: card.instanceId
    });

    expect(view).toMatchObject({
      mode: "selected",
      selectedCardName: "Sparkcatch Apprentice",
      statusText: "Sparkcatch Apprentice has no legal Source Row or Spellrail move.",
      actions: []
    });
  });
});
