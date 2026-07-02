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
    expect(inspection.upgradeLevel).toBe(0);
    expect(inspection.upgradeText).toContain("Combine 3 matching pool copies");
    expect(inspection.upgradeBonusText).toContain("Each upgrade level adds +1 ATK");
    expect(inspection.keywords).toContain("Quickstart");
    expect(inspection.rulesText).toContain("Quickstart");
    expect(inspection.traitIds).toEqual(["ember", "scrapper", "echo_fodder"]);
    expect(inspection.traitNames).toEqual(["Ember", "Scrapper", "Echo Fodder"]);
    expect(inspection.design?.archetypes).toContain("ember_scrappers");
    expect(inspection.designText).toContain("enabler");
  });

  it("includes pool duplicate upgrade progress for inspected cards", () => {
    const baseRun = createStarterRun();
    const runWithoutCinders: RunState = {
      ...baseRun,
      pool: baseRun.pool.filter((card) => card.defId !== asCardDefId("cinder_scout"))
    };
    const run = withPoolCard(
      withPoolCard(runWithoutCinders, "cinder_scout", "cinder-a"),
      "cinder_scout",
      "cinder-b"
    );
    const cinder = requirePoolCard(run, "cinder_scout");
    const inspection = requireInspection(run, cinder);

    expect(inspection.upgradeProgressText).toBe("Level 0: 2 / 3 pool copies.");
    expect(inspection.upgradeProgressDetails).toContain("Cannot upgrade now.");
    expect(inspection.upgradeProgressDetails).toContain(
      "Blocked: Need 3 matching pool copies; found 2."
    );
  });

  it("explains active copies do not count toward inspected upgrade progress", () => {
    const baseRun = createStarterRun("ember_scrappers", "inspection:active-upgrade");
    const runWithoutCinders: RunState = {
      ...baseRun,
      pool: baseRun.pool.filter((card) => card.defId !== asCardDefId("cinder_scout"))
    };
    const activeSeedRun = withPoolCard(
      runWithoutCinders,
      "cinder_scout",
      "cinder-active"
    );
    const activeCinder = requirePoolCard(activeSeedRun, "cinder_scout");
    const activeRun = placeCardOnBoard(activeSeedRun, activeCinder.instanceId, {
      row: 0,
      col: 0,
      layer: "ground"
    });
    const run = withPoolCard(
      withPoolCard(activeRun, "cinder_scout", "cinder-pool-a"),
      "cinder_scout",
      "cinder-pool-b"
    );
    const inspection = requireInspection(run, activeCinder);

    expect(inspection.upgradeProgressText).toBe("Level 0: 2 / 3 pool copies.");
    expect(inspection.upgradeProgressDetails).toContain(
      "1 active copy does not count toward pool-copy upgrades."
    );
    expect(inspection.upgradeProgressDetails).toContain(
      "Blocked: Return active copies to pool to upgrade."
    );
  });

  it("explains non-upgradeable duplicate card types during inspection", () => {
    const run = withPoolCard(
      withPoolCard(createStarterRun("rotbloom_recall"), "due_marker_relic", "due-a"),
      "due_marker_relic",
      "due-b"
    );
    const dueMarker = requirePoolCard(run, "due_marker_relic");
    const inspection = requireInspection(run, dueMarker);

    expect(inspection.upgradeText).toBe("Level 0. Relics are not upgradeable yet.");
    expect(inspection.upgradeProgressText).toBe("Level 0: 2 owned copies.");
    expect(inspection.upgradeProgressDetails).toContain(
      "Blocked: Relics are not upgradeable yet."
    );
  });

  it("shows upgraded Unit stats and upgrade bonus text", () => {
    const baseRun = createStarterRun("ember_scrappers", "inspection:upgraded-unit");
    const activeCard = baseRun.activeCards[0];
    if (!activeCard) {
      throw new Error("Expected active starter card");
    }
    const run: RunState = {
      ...baseRun,
      activeCards: baseRun.activeCards.map((card) =>
        card.instanceId === activeCard.instanceId ? { ...card, upgradeLevel: 1 } : card
      )
    };
    const inspection = requireInspection(run, { ...activeCard, upgradeLevel: 1 });

    expect(inspection.upgradeLevel).toBe(1);
    expect(inspection.upgradeText).toContain("Level 1");
    expect(inspection.upgradeBonusText).toBe("Current bonus: +1 ATK / +1 HP.");
    expect(inspection.statsText).toBe("3 ATK / 2 HP / 1.3 speed / 1 range");
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
    expect(inspection.techniqueText).toBe(
      "1 combat Charge, After 1s: Deal 2 damage to the nearest enemy."
    );
  });

  it("formats Recall ability and Technique text cleanly", () => {
    const run = createStarterRun("rotbloom_recall");
    const ledger = requirePoolCard(run, "ash_ledger_relic");
    const ledgerInspection = requireInspection(run, ledger);
    const shadeBinderRun = withPoolCard(run, "shade_binder", "shade-binder");
    const shadeBinder = requirePoolCard(shadeBinderRun, "shade_binder");
    const shadeBinderInspection = requireInspection(shadeBinderRun, shadeBinder);

    expect(ledgerInspection.abilityText).toContain(
      "When another ally is destroyed: Recall a Unit from Ashes costing 2 or less."
    );
    expect(shadeBinderInspection.techniqueText).toBe(
      "1 combat Charge, After 1.5s: Recall a Unit from Ashes costing 2 or less."
    );
  });

  it("formats Offer ability text cleanly", () => {
    const run = withPoolCard(createStarterRun("rotbloom_recall"), "due_marker_relic");
    const dueMarker = requirePoolCard(run, "due_marker_relic");
    const inspection = requireInspection(run, dueMarker);

    expect(inspection.abilityText).toContain("At combat start: Offer an adjacent ally.");
  });

  it("formats destroyed-trigger ability text cleanly", () => {
    const emberRun = createStarterRun("ember_scrappers");
    const sparkcatch = requirePoolCard(emberRun, "sparkcatch_apprentice");
    const sparkcatchInspection = requireInspection(emberRun, sparkcatch);
    const cinderRun = withPoolCard(emberRun, "cinder_tally_relic", "cinder-tally");
    const cinderTally = requirePoolCard(cinderRun, "cinder_tally_relic");
    const cinderInspection = requireInspection(cinderRun, cinderTally);
    const brokerRun = withPoolCard(
      createStarterRun("rotbloom_recall"),
      "last_word_broker",
      "last-word"
    );
    const broker = requirePoolCard(brokerRun, "last_word_broker");
    const brokerInspection = requireInspection(brokerRun, broker);

    expect(sparkcatchInspection.abilityText).toContain(
      "When another ally is destroyed: Deal 1 damage to the nearest enemy."
    );
    expect(cinderInspection.abilityText).toContain(
      "When your first ally is destroyed each combat: Deal 1 damage to the nearest enemy."
    );
    expect(brokerInspection.abilityText).toContain(
      "When the first enemy is destroyed each combat: Deal 1 damage to the lowest-health enemy."
    );
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
