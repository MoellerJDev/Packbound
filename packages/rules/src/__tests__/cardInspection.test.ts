import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import { asCardDefId, asPlayerId, type CardInstance } from "@packbound/shared";

import {
  createCardInstance,
  createRunFromStarterKit,
  inspectEncounterCard,
  inspectRunCard,
  placeCardOnBoard,
  removeCardFromBoard,
  type RunState
} from "../index";

const createStarterRun = (
  starterKitId = "ember_scrappers",
  seed = `inspection:${starterKitId}`
): RunState =>
  createRunFromStarterKit({
    seed,
    catalog: sampleCatalog,
    starterKitId,
    playerId: asPlayerId(`inspection:${starterKitId}`)
  });

const requirePoolCard = (run: RunState, defId: string): CardInstance => {
  const card = run.pool.find((candidate) => candidate.defId === asCardDefId(defId));
  if (!card) {
    throw new Error(`Expected ${defId} in pool`);
  }
  return card;
};

const requireInspection = (run: RunState, card: CardInstance) => {
  const inspection = inspectRunCard({
    catalog: sampleCatalog,
    run,
    cardInstanceId: card.instanceId
  });
  if (!inspection) {
    throw new Error(`Expected inspection for ${card.instanceId}`);
  }
  return inspection;
};

const withPoolCard = (run: RunState, defId: string, suffix = defId): RunState => ({
  ...run,
  pool: [
    ...run.pool,
    createCardInstance({
      ownerId: run.playerId,
      defId: asCardDefId(defId),
      zone: "pool",
      instanceId: `${run.runId}:inspection:${suffix}` as CardInstance["instanceId"]
    })
  ]
});

describe("card inspection helpers", () => {
  it("inspects a Unit with stats, keywords, type, cost, and design metadata", () => {
    const run = createStarterRun();
    const boardCard = run.activeCards[0];
    if (!boardCard) {
      throw new Error("Expected active starter card");
    }
    const inspection = requireInspection(run, boardCard);

    expect(inspection.name).toBe("Ember Scraprunner");
    expect(inspection.cardType).toBe("Unit");
    expect(inspection.costText).toContain("Charge");
    expect(inspection.statsText).toContain("ATK");
    expect(inspection.keywords).toContain("Quickstart");
    expect(inspection.rulesText).toContain("Quickstart");
    expect(inspection.design?.archetypes).toContain("ember_scrappers");
    expect(inspection.designText).toContain("enabler");
  });

  it("inspects a Source with board Charge, Aspect access, and combat Charge", () => {
    const run = createStarterRun();
    const source = run.sourceRow.cards[0];
    if (!source) {
      throw new Error("Expected starter Source");
    }
    const inspection = requireInspection(run, source);

    expect(inspection.cardType).toBe("Source");
    expect(inspection.sourceText).toContain("+3 board Charge");
    expect(inspection.sourceText).toContain("Ember access");
    expect(inspection.sourceText).toContain("0.35 combat Charge/sec");
  });

  it("inspects a Technique with Technique cost, trigger, and effect summary", () => {
    const run = createStarterRun();
    const technique = run.spellrail.cards[0];
    if (!technique) {
      throw new Error("Expected starter Technique");
    }
    const inspection = requireInspection(run, technique);

    expect(inspection.cardType).toBe("Technique");
    expect(inspection.techniqueText).toContain("1 combat Charge");
    expect(inspection.techniqueText).toContain("after 1s");
    expect(inspection.techniqueText).toContain("deal 2 damage");
    expect(inspection.techniqueText).toContain("nearest enemy");
  });

  it("includes legal actions for usable pool cards", () => {
    const run = createRunFromStarterKit({
      seed: "inspection:rotbloom-actions",
      catalog: sampleCatalog,
      starterKitId: "rotbloom_recall",
      playerId: asPlayerId("inspection:rotbloom-actions")
    });
    const card = requirePoolCard(run, "sporeback_beast");
    const inspection = requireInspection(run, card);

    expect(inspection.legalActions.map((action) => action.type)).toContain(
      "placeOnBoard"
    );
    expect(inspection.blockedReasons.join("\n")).toContain("not a Source");
    expect(inspection.blockedReasons.join("\n")).toContain("not a Technique");
  });

  it("returns blocked reasons for high-cost or missing-Aspect cards", () => {
    const chargeRun = withPoolCard(
      createStarterRun("ember_scrappers"),
      "sporeback_beast"
    );
    const chargeCard = requirePoolCard(chargeRun, "sporeback_beast");
    const chargeInspection = requireInspection(chargeRun, chargeCard);

    expect(chargeInspection.legalActions).toEqual([]);
    expect(chargeInspection.blockedReasons.join("\n")).toContain("Board uses");

    const activeCard = chargeRun.activeCards[0];
    if (!activeCard) {
      throw new Error("Expected active starter card");
    }
    const aspectRun = withPoolCard(
      removeCardFromBoard(chargeRun, activeCard.instanceId),
      "rootbrace_guardian"
    );
    const aspectCard = requirePoolCard(aspectRun, "rootbrace_guardian");
    const aspectInspection = requireInspection(aspectRun, aspectCard);

    expect(aspectInspection.legalActions).toEqual([]);
    expect(aspectInspection.blockedReasons.join("\n")).toContain(
      "requires 1 Bloom access"
    );
  });

  it("shows return-to-pool action for active board cards", () => {
    const run = createStarterRun();
    const activeCard = run.activeCards[0];
    if (!activeCard) {
      throw new Error("Expected active starter card");
    }
    const inspection = requireInspection(run, activeCard);

    expect(inspection.legalActions).toContainEqual({
      type: "returnToPool",
      label: "Return to Pool",
      reason: "Card is already active and can be returned to the pool."
    });
    expect(inspection.blockedReasons).toEqual([]);
  });

  it("inspects encounter cards without a run-owned card instance", () => {
    const encounter = sampleCatalog.encountersById.get("early_ember_pressure");
    const placement = encounter?.loadout.board.placements[0];
    if (!placement) {
      throw new Error("Expected encounter placement");
    }

    const inspection = inspectEncounterCard({ catalog: sampleCatalog, placement });

    expect(inspection?.name).toBe("Ember Scraprunner");
    expect(inspection?.zone).toBe("encounter");
    expect(inspection?.legalActions).toEqual([]);
    expect(inspection?.statsText).toContain("ATK");
  });

  it("is deterministic and JSON-serializable", () => {
    const run = createStarterRun();
    const card = requirePoolCard(run, "signal_nest");
    const first = requireInspection(run, card);
    const second = requireInspection(run, card);

    expect(second).toEqual(first);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
  });

  it("surfaces blocked editing reasons outside planning", () => {
    const run = createStarterRun();
    const activeCard = run.activeCards[0];
    if (!activeCard) {
      throw new Error("Expected active starter card");
    }
    const combatReadyRun = { ...run, phase: "combatReady" as const };
    const inspection = requireInspection(combatReadyRun, activeCard);

    expect(inspection.legalActions).toEqual([]);
    expect(inspection.blockedReasons).toContain(
      "Return to Pool: Loadout can only be edited during planning."
    );
  });

  it("keeps existing placement behavior compatible with inspection", () => {
    const baseRun = createStarterRun();
    const activeCard = baseRun.activeCards[0];
    if (!activeCard) {
      throw new Error("Expected active starter card");
    }
    const run = removeCardFromBoard(baseRun, activeCard.instanceId);
    const signalNest = requirePoolCard(run, "signal_nest");
    const placed = placeCardOnBoard(run, signalNest.instanceId, {
      row: 0,
      col: 0,
      layer: "support"
    });
    const inspection = requireInspection(placed, {
      ...signalNest,
      zone: "board"
    });

    expect(inspection.legalActions.map((action) => action.type)).toContain(
      "returnToPool"
    );
  });
});
