import { describe, expect, it } from "vitest";

import { loadContentCatalog, sampleCatalog } from "@packbound/content";
import {
  asCardDefId,
  asCardInstanceId,
  asPackId,
  asPlayerId,
  type CombatEvent,
  type PackId
} from "@packbound/shared";

import {
  buildRewardOfferExplanations,
  createCardInstance,
  createRunFromStarterKit,
  markCombatReady,
  prepareEncounterForRound,
  recordCombatResult,
  type CombatResultLike,
  type RewardChoice,
  type RewardOfferExplanation,
  type RunState
} from "../index";

const combatStarted: CombatEvent = { type: "CombatStarted", timeMs: 0 };

const combatResult = (): CombatResultLike => ({
  winner: "playerA",
  damageToPlayerA: 0,
  damageToPlayerB: 3,
  events: [combatStarted],
  warnings: [],
  seed: "reward-offer-combat",
  rulesVersion: "sim-test"
});

const createRewardRun = (
  starterKitId = "ember_scrappers",
  seed = `reward-offers:${starterKitId}`
): RunState =>
  recordCombatResult(
    markCombatReady(
      prepareEncounterForRound(
        createRunFromStarterKit({
          seed,
          catalog: sampleCatalog,
          starterKitId,
          playerId: asPlayerId("reward-offer-player")
        }),
        sampleCatalog
      ),
      sampleCatalog
    ),
    combatResult()
  );

const storedChoice = (run: RunState, packId: PackId, index: number): RewardChoice => {
  const pack = sampleCatalog.packsById.get(packId);
  if (!pack) {
    throw new Error(`Missing test pack ${packId}`);
  }

  return {
    id: `stored-choice:${index}:${pack.id}`,
    type: "pack",
    round: run.currentRound,
    packId: pack.id,
    label: pack.name,
    cost: pack.cost,
    affordable: run.playerGold >= pack.cost,
    goldAfterPurchase: run.playerGold - pack.cost
  };
};

const withStoredChoices = (
  run: RunState,
  packIds: readonly string[],
  playerGold = run.playerGold
): RunState => {
  const withGold: RunState = { ...run, playerGold };
  return {
    ...withGold,
    currentRewardChoices: packIds.map((packId, index) =>
      storedChoice(withGold, asPackId(packId), index)
    )
  };
};

const addPoolCards = (run: RunState, defId: string, count: number): RunState => ({
  ...run,
  pool: [
    ...run.pool,
    ...Array.from({ length: count }, (_, index) =>
      createCardInstance({
        ownerId: run.playerId,
        defId: asCardDefId(defId),
        zone: "pool",
        instanceId: asCardInstanceId(`${run.runId}:reward-offer:${defId}:${index}`)
      })
    )
  ]
});

const explanationForPack = (
  explanations: readonly RewardOfferExplanation[],
  packId: string
): RewardOfferExplanation => {
  const explanation = explanations.find(
    (candidate) => candidate.packId === asPackId(packId)
  );
  if (!explanation) {
    throw new Error(`Expected explanation for ${packId}`);
  }
  return explanation;
};

const reasonText = (explanation: RewardOfferExplanation): string =>
  explanation.reasons.map((reason) => reason.text).join(" ");

describe("reward offer explanations", () => {
  it("is deterministic and JSON-serializable", () => {
    const run = withStoredChoices(createRewardRun(), [
      "ember_foundry_pack",
      "source_pack",
      "cloudspire_pack"
    ]);
    const first = buildRewardOfferExplanations(run, sampleCatalog);
    const second = buildRewardOfferExplanations(run, sampleCatalog);

    expect(second).toEqual(first);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
  });

  it("explains affordable costs and gold after purchase", () => {
    const run = withStoredChoices(createRewardRun(), ["ember_foundry_pack"]);
    const explanation = explanationForPack(
      buildRewardOfferExplanations(run, sampleCatalog),
      "ember_foundry_pack"
    );

    expect(explanation).toMatchObject({
      cost: 4,
      affordable: true,
      goldBefore: run.playerGold,
      goldAfterPurchase: run.playerGold - 4
    });
    expect(explanation.reasons).toContainEqual(
      expect.objectContaining({
        kind: "affordability",
        severity: "neutral",
        text: `Costs 4 gold; you will have ${run.playerGold - 4} left.`
      })
    );
  });

  it("shows a warning reason for unaffordable offers", () => {
    const run = withStoredChoices(createRewardRun(), ["ember_foundry_pack"], 2);
    const explanation = explanationForPack(
      buildRewardOfferExplanations(run, sampleCatalog),
      "ember_foundry_pack"
    );

    expect(explanation.affordable).toBe(false);
    expect(explanation.headline).toContain("need 2 more gold");
    expect(explanation.reasons).toContainEqual(
      expect.objectContaining({
        kind: "affordability",
        severity: "warning",
        text: "Need 4 gold; you have 2."
      })
    );
  });

  it("mentions Source and fixing relevance for Source Pack", () => {
    const run = withStoredChoices(createRewardRun(), [
      "source_pack",
      "ember_foundry_pack"
    ]);
    const explanation = explanationForPack(
      buildRewardOfferExplanations(run, sampleCatalog),
      "source_pack"
    );

    expect(explanation.reasons).toContainEqual(
      expect.objectContaining({ kind: "sourceFixing" })
    );
    expect(reasonText(explanation)).toMatch(/Aspect access and board Charge|fixing/i);
    expect(reasonText(explanation)).toMatch(/Cheaper fixing option|Cheapest offer/);
  });

  it("mentions matching trait direction and archetype bias", () => {
    const run = withStoredChoices(createRewardRun(), ["ember_foundry_pack"]);
    const explanation = explanationForPack(
      buildRewardOfferExplanations(run, sampleCatalog),
      "ember_foundry_pack"
    );

    expect(explanation.reasons).toContainEqual(
      expect.objectContaining({ kind: "traitMatch" })
    );
    expect(explanation.reasons).toContainEqual(
      expect.objectContaining({ kind: "archetypeBias" })
    );
    expect(reasonText(explanation)).toMatch(/Ember|Scrapper/);
  });

  it("references partial Unit or Echo duplicate progress when the pack can contain that card", () => {
    const run = withStoredChoices(
      addPoolCards(createRewardRun(), "ember_scraprunner", 2),
      ["ember_foundry_pack"]
    );
    const explanation = explanationForPack(
      buildRewardOfferExplanations(run, sampleCatalog),
      "ember_foundry_pack"
    );

    expect(explanation.reasons).toContainEqual(
      expect.objectContaining({ kind: "upgradeProgress" })
    );
    expect(reasonText(explanation)).toContain("Ember Scraprunner");
    expect(reasonText(explanation)).toContain("2 / 3 pool copies");
    expect(reasonText(explanation)).toContain("active copies that must return to pool");
  });

  it("does not frame duplicate Relics as upgrade hits", () => {
    const run = withStoredChoices(
      addPoolCards(createRewardRun("rotbloom_recall"), "due_marker_relic", 2),
      ["rotbloom_pack"]
    );
    const explanation = explanationForPack(
      buildRewardOfferExplanations(run, sampleCatalog),
      "rotbloom_pack"
    );

    expect(reasonText(explanation)).toContain(
      "Duplicate Relics are not upgradeable yet."
    );
    expect(reasonText(explanation)).not.toMatch(/Due Marker.*toward an upgrade/);
  });

  it("handles no current reward choices safely", () => {
    const run = createRunFromStarterKit({
      seed: "reward-offers:no-reward",
      catalog: sampleCatalog,
      starterKitId: "ember_scrappers",
      playerId: asPlayerId("reward-offer-player")
    });

    expect(buildRewardOfferExplanations(run, sampleCatalog)).toEqual([]);
  });

  it("handles missing optional card design metadata", () => {
    const catalogWithoutOneDesign = loadContentCatalog({
      cards: sampleCatalog.cards.map((card) => {
        if (card.id !== asCardDefId("ember_scraprunner")) {
          return card;
        }
        return Object.fromEntries(
          Object.entries(card).filter(([key]) => key !== "design")
        );
      }),
      packs: sampleCatalog.packs,
      traits: sampleCatalog.traits,
      encounters: sampleCatalog.encounters,
      starterKits: sampleCatalog.starterKits
    });
    const run = withStoredChoices(createRewardRun(), ["ember_foundry_pack"]);

    expect(() =>
      buildRewardOfferExplanations(run, catalogWithoutOneDesign)
    ).not.toThrow();
  });

  it("keeps a missing stored pack choice safe and visible", () => {
    const run = {
      ...createRewardRun(),
      currentRewardChoices: [
        {
          id: "stored-choice:missing",
          type: "pack" as const,
          round: 1,
          packId: asPackId("missing_pack"),
          label: "Missing Pack",
          cost: 5,
          affordable: true,
          goldAfterPurchase: 1
        }
      ]
    };
    const explanation = buildRewardOfferExplanations(run, sampleCatalog)[0];

    expect(explanation).toMatchObject({
      packName: "Missing Pack",
      cost: 5,
      affordable: true
    });
    expect(explanation?.reasons).toContainEqual(
      expect.objectContaining({ kind: "warning" })
    );
  });
});
