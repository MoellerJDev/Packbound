import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import {
  applyRunAction,
  createCardInstance,
  createRunFromStarterKit,
  type PendingPackOffer,
  type RunState
} from "@packbound/rules";
import {
  asCardDefId,
  asCardInstanceId,
  asPackId,
  asPlayerId,
  type CardInstance
} from "@packbound/shared";

import { buildPackOfferCardViews } from "./packOfferCardView";

const playerId = asPlayerId("pack-offer-view-player");

const createBaseRun = (): RunState =>
  applyRunAction(
    createRunFromStarterKit({
      seed: "pack-offer-view-test",
      catalog: sampleCatalog,
      starterKitId: "ember_scrappers",
      playerId,
      maxRounds: 3
    }),
    sampleCatalog,
    { type: "prepareEncounter" }
  );

const offerCard = (defId: string, index = 0): CardInstance =>
  createCardInstance({
    defId: asCardDefId(defId),
    ownerId: playerId,
    zone: "pack",
    instanceId: asCardInstanceId(`offer:${defId}:${index}`)
  });

const createOffer = (cards: readonly CardInstance[]): PendingPackOffer => ({
  id: "pack-offer-view-test",
  round: 1,
  choiceId: "reward:cloudspire_pack",
  packId: asPackId("cloudspire_pack"),
  packName: "Cloudspire Pack",
  cost: 3,
  goldBefore: 10,
  goldAfter: 7,
  openedPackSeed: "pack-offer-view-seed",
  revealCount: cards.length,
  pickLimit: Math.min(2, cards.length),
  cards,
  slots: cards.map((card, index) => ({
    slotIndex: index,
    slotType: "rarity",
    requestedRarity: "common",
    actualRarity: "common",
    cardDefId: card.defId,
    cardInstanceId: card.instanceId
  })),
  generatedCardDefIds: cards.map((card) => card.defId),
  generatedCardInstanceIds: cards.map((card) => card.instanceId)
});

const firstView = (views: ReturnType<typeof buildPackOfferCardViews>) => {
  const view = views[0];
  if (!view) {
    throw new Error("Expected a Pack Offer card view.");
  }
  return view;
};

const buildSingleView = (run: RunState, defId: string) => {
  const card = offerCard(defId);
  return firstView(
    buildPackOfferCardViews({
      catalog: sampleCatalog,
      run,
      offer: createOffer([card])
    })
  );
};

describe("pack offer card view", () => {
  it("shows Unit compact stats and rules text", () => {
    const view = buildSingleView(createBaseRun(), "mistwing_scout");

    expect(view).toMatchObject({
      name: "Mistwing Scout",
      cardType: "Unit",
      costText: expect.stringContaining("Charge"),
      statsText: expect.stringContaining("ATK"),
      fitTone: "warning"
    });
    expect(view.metaText).toContain("Unit");
    expect(view.effectText).toContain("Airborne");
  });

  it("explains Source fit with Board Charge Aspect access and Combat Charge/sec", () => {
    const view = buildSingleView(createBaseRun(), "cracked_prism");

    expect(view).toMatchObject({
      name: "Cracked Prism",
      cardType: "Source",
      fitTone: "positive"
    });
    expect(view.costText).toBe("No board Charge cost");
    expect(view.fitText).toContain("Board Charge");
    expect(view.fitText).toContain("access");
    expect(view.fitText).toContain("Combat Charge/sec");
  });

  it("explains Technique fit through Spellrail slots", () => {
    const view = buildSingleView(createBaseRun(), "sparkfall");

    expect(view).toMatchObject({
      name: "Sparkfall",
      cardType: "Technique",
      fitTone: "positive"
    });
    expect(view.effectText).toContain("combat Charge");
    expect(view.fitText).toContain("Spellrail");
    expect(view.fitText).toContain("Techniques use Spellrail slots");
  });

  it("warns when a board card is Board Charge blocked", () => {
    const runWithoutSources = {
      ...createBaseRun(),
      sourceRow: { cards: [], maxSlots: 2 }
    } satisfies RunState;
    const view = buildSingleView(runWithoutSources, "sparkcatch_apprentice");

    expect(view).toMatchObject({
      name: "Sparkcatch Apprentice",
      cardType: "Unit",
      fitTone: "warning"
    });
    expect(view.fitText).toContain("Likely blocked");
    expect(view.fitText).toContain("Board");
    expect(view.fitText).toContain("Source");
  });

  it("falls back when a card definition is missing", () => {
    const missingCard = offerCard("missing_pack_offer_card");
    const view = firstView(
      buildPackOfferCardViews({
        catalog: sampleCatalog,
        run: createBaseRun(),
        offer: createOffer([missingCard])
      })
    );

    expect(view).toMatchObject({
      defId: asCardDefId("missing_pack_offer_card"),
      name: "missing_pack_offer_card",
      cardType: "Unknown",
      fitTone: "warning"
    });
    expect(view.fitText).toContain("definition is missing");
  });
});
