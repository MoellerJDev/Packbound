import { describe, expect, it } from "vitest";

import {
  loadContentCatalog,
  sampleCards,
  sampleCatalog,
  samplePacks,
  sampleTraitDefinitions
} from "@packbound/content";
import {
  buildCombatantSetupForRun,
  createCardInstance,
  createRunFromStarterKit,
  placeCardOnBoard,
  upgradeCardGroup
} from "@packbound/rules";
import {
  asCardInstanceId,
  asCardDefId,
  asPlayerId,
  asUnitInstanceId,
  type BoardPlacement,
  type BoardState,
  type CardDefinition,
  type CardInstance,
  type CardInstanceId,
  type CombatEvent,
  type PlayerId,
  type SourceRowState,
  type SpellrailState
} from "@packbound/shared";

import {
  resolveCombat,
  summarizeCombatOutcome,
  type CombatantSetup,
  type ResolveCombatInput
} from "../index";

const playerA = asPlayerId("player-a");
const playerB = asPlayerId("player-b");

const testCards: readonly CardDefinition[] = [
  {
    id: asCardDefId("test_phase_probe"),
    name: "Test Phase Probe",
    set: "test_lab",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Tide"],
    cost: { generic: 1 },
    tags: ["Adept"],
    keywords: [],
    abilities: [],
    stats: { attack: 0, health: 1, attackSpeed: 1, range: 1 }
  },
  {
    id: asCardDefId("test_entry_charge_probe"),
    name: "Test Entry Charge Probe",
    set: "test_lab",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Tide"],
    cost: { generic: 1 },
    tags: ["Adept"],
    keywords: [],
    abilities: [
      {
        id: "entry-charge-marker",
        trigger: { type: "OnEntry" },
        condition: { type: "Always" },
        target: { type: "Self" },
        effect: { type: "GainCombatCharge", amount: 7 }
      }
    ],
    stats: { attack: 0, health: 1, attackSpeed: 1, range: 1 }
  },
  {
    id: asCardDefId("test_durable_decoy"),
    name: "Test Durable Decoy",
    set: "test_lab",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Gleam"],
    cost: { generic: 1 },
    tags: ["Warden"],
    keywords: [],
    abilities: [],
    stats: { attack: 0, health: 10, attackSpeed: 1, range: 1 }
  },
  {
    id: asCardDefId("test_barrier_wall"),
    name: "Test Barrier Wall",
    set: "test_lab",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Gleam"],
    cost: { generic: 1 },
    tags: ["Warden"],
    keywords: ["Barrier"],
    abilities: [],
    stats: { attack: 0, health: 5, attackSpeed: 1, range: 1 }
  },
  {
    id: asCardDefId("test_quick_attacker"),
    name: "Test Quick Attacker",
    set: "test_lab",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Ember"],
    cost: { generic: 1 },
    tags: ["Scrapper"],
    keywords: ["Quickstart"],
    abilities: [],
    stats: { attack: 1, health: 5, attackSpeed: 5, range: 1 }
  },
  {
    id: asCardDefId("test_guard_target"),
    name: "Test Guard Target",
    set: "test_lab",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Gleam"],
    cost: { generic: 1 },
    tags: ["Warden"],
    keywords: ["Guard"],
    abilities: [],
    stats: { attack: 0, health: 5, attackSpeed: 1, range: 1 }
  },
  {
    id: asCardDefId("test_plain_target"),
    name: "Test Plain Target",
    set: "test_lab",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Bloom"],
    cost: { generic: 1 },
    tags: ["Beast"],
    keywords: [],
    abilities: [],
    stats: { attack: 0, health: 5, attackSpeed: 1, range: 1 }
  },
  {
    id: asCardDefId("test_endless_wall"),
    name: "Test Endless Wall",
    set: "test_lab",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Bloom"],
    cost: { generic: 1 },
    tags: ["Beast"],
    keywords: [],
    abilities: [],
    stats: { attack: 0, health: 99, attackSpeed: 1, range: 1 }
  },
  {
    id: asCardDefId("test_executioner"),
    name: "Test Executioner",
    set: "test_lab",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Ember"],
    cost: { generic: 1 },
    tags: ["Scrapper"],
    keywords: ["Quickstart"],
    abilities: [],
    stats: { attack: 99, health: 99, attackSpeed: 1, range: 1 }
  },
  {
    id: asCardDefId("test_recaller"),
    name: "Test Recaller",
    set: "test_lab",
    rarity: "uncommon",
    cardType: "Unit",
    aspects: ["Shade"],
    cost: { generic: 1 },
    tags: ["Husk"],
    keywords: [],
    abilities: [
      {
        id: "test-recall-one",
        trigger: { type: "OnEntry" },
        condition: { type: "AshesHasCard" },
        target: { type: "CardInAshes", maxChargeCost: 2 },
        effect: {
          type: "Recall",
          maxChargeCost: 2,
          healthOverride: 1,
          placement: "FirstOpen"
        }
      }
    ],
    stats: { attack: 0, health: 3, attackSpeed: 1, range: 1 }
  },
  {
    id: asCardDefId("test_phase_now"),
    name: "Test Phase Now",
    set: "test_lab",
    rarity: "common",
    cardType: "Technique",
    aspects: ["Tide"],
    cost: { generic: 1 },
    tags: ["Technique", "Phase"],
    keywords: [],
    abilities: [],
    technique: {
      combatChargeCost: 0,
      trigger: { type: "WhenCombatChargeAtLeast", amount: 0 },
      target: { type: "LowestHealthAlliedUnit" },
      effect: {
        type: "Phase",
        delayMs: 500,
        clearNegativeStatuses: true,
        retriggerEntryEffects: false,
        returnPreference: "originalTile"
      }
    }
  },
  {
    id: asCardDefId("test_phase_now_retrigger"),
    name: "Test Phase Now Retrigger",
    set: "test_lab",
    rarity: "common",
    cardType: "Technique",
    aspects: ["Tide"],
    cost: { generic: 1 },
    tags: ["Technique", "Phase"],
    keywords: [],
    abilities: [],
    technique: {
      combatChargeCost: 0,
      trigger: { type: "WhenCombatChargeAtLeast", amount: 0 },
      target: { type: "LowestHealthAlliedUnit" },
      effect: {
        type: "Phase",
        delayMs: 500,
        clearNegativeStatuses: true,
        retriggerEntryEffects: true,
        returnPreference: "originalTile"
      }
    }
  },
  {
    id: asCardDefId("test_copy_probe"),
    name: "Test Copy Probe",
    set: "test_lab",
    rarity: "common",
    cardType: "Technique",
    aspects: ["Tide"],
    cost: { generic: 1 },
    tags: ["Technique"],
    keywords: [],
    abilities: [],
    technique: {
      combatChargeCost: 0,
      trigger: { type: "WhenCombatChargeAtLeast", amount: 0 },
      target: { type: "Self" },
      effect: { type: "CopyTechnique" }
    }
  }
];

const testCatalog = loadContentCatalog({
  cards: [...sampleCards, ...testCards],
  packs: samplePacks,
  traits: sampleTraitDefinitions
});

const instance = (
  playerId: PlayerId,
  defId: string,
  zone: "sourceRow" | "spellrail" | "ashes",
  suffix: string = zone
): CardInstance =>
  createCardInstance({
    ownerId: playerId,
    defId: asCardDefId(defId),
    zone,
    instanceId: asCardInstanceId(`${playerId}:${defId}:${suffix}`)
  });

const modifiedBoardInstance = (
  playerId: PlayerId,
  defId: string,
  instanceId: CardInstanceId
): CardInstance => ({
  instanceId,
  defId: asCardDefId(defId),
  ownerId: playerId,
  zone: "board",
  modifiers: [
    {
      id: `test-modifier:${defId}`,
      type: "StatModifier",
      sourceId: "test-source",
      stackingRule: "stack",
      metadata: { attack: 1, note: "preserve-through-combat" }
    }
  ],
  upgradeLevel: 3,
  createdBy: asCardInstanceId(`${instanceId}:created-by`),
  isEcho: false
});

const sourceRow = (playerId: PlayerId, ...defIds: string[]): SourceRowState => ({
  maxSlots: 4,
  cards: defIds.map((defId) => instance(playerId, defId, "sourceRow"))
});

const emptySourceRow = (): SourceRowState => ({
  maxSlots: 4,
  cards: []
});

const spellrail = (playerId: PlayerId, ...defIds: string[]): SpellrailState => ({
  maxSlots: 4,
  cards: defIds.map((defId) => instance(playerId, defId, "spellrail"))
});

const emptySpellrail = (): SpellrailState => ({
  maxSlots: 4,
  cards: []
});

const placement = (
  ownerId: PlayerId,
  sideSeed: string,
  defId: string,
  row: number,
  col: number,
  index = `${row}-${col}`
): BoardPlacement => ({
  cardInstanceId: asCardInstanceId(`${sideSeed}:${defId}:${index}`),
  defId: asCardDefId(defId),
  ownerId,
  position: { row, col, layer: "ground" }
});

const board = (...placements: BoardPlacement[]): BoardState => ({
  placements
});

const unitBoard = (
  playerId: PlayerId,
  sideSeed: string,
  ...defIds: string[]
): BoardState =>
  board(
    ...defIds.map((defId, index) =>
      placement(playerId, sideSeed, defId, 0, index, String(index))
    )
  );

const relicBoard = (playerId: PlayerId): BoardState => ({
  placements: [
    {
      cardInstanceId: asCardInstanceId("a:signal_nest"),
      defId: asCardDefId("signal_nest"),
      ownerId: playerId,
      position: { row: 1, col: 1, layer: "support" }
    }
  ]
});

const fullBoardWithRecaller = (ownerId: PlayerId): BoardState => {
  const placements: BoardPlacement[] = [
    placement(ownerId, "full", "test_recaller", 0, 0, "recaller")
  ];

  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 7; col += 1) {
      if (row === 0 && col === 0) {
        continue;
      }
      placements.push(
        placement(ownerId, "full", "test_durable_decoy", row, col, `${row}-${col}`)
      );
    }
  }

  return board(...placements);
};

const combatant = (
  playerId: PlayerId,
  combatBoard: BoardState,
  sources: SourceRowState = emptySourceRow(),
  rail: SpellrailState = emptySpellrail(),
  startingAshes: readonly CardInstance[] = [],
  activeCards: readonly CardInstance[] = []
): CombatantSetup => ({
  playerId,
  board: combatBoard,
  ...(activeCards.length > 0 ? { activeCards } : {}),
  sourceRow: sources,
  spellrail: rail,
  startingAshes
});

const resolve = (input: Omit<ResolveCombatInput, "catalog" | "seed">) =>
  resolveCombat({
    catalog: testCatalog,
    seed: "invariant-seed",
    ...input
  });

const unitId = (side: "playerA" | "playerB", cardInstanceId: CardInstanceId) =>
  asUnitInstanceId(`${side}:${cardInstanceId}`);

describe("deterministic combat", () => {
  it("produces the same event log for the same input and seed", () => {
    const input = {
      catalog: sampleCatalog,
      seed: "combat-seed",
      playerA: combatant(
        playerA,
        unitBoard(playerA, "a", "ember_scraprunner"),
        sourceRow(playerA, "ember_source"),
        spellrail(playerA, "sparkfall")
      ),
      playerB: combatant(
        playerB,
        unitBoard(playerB, "b", "debt_bound_colossus"),
        sourceRow(playerB, "bloom_source"),
        emptySpellrail()
      )
    };

    const first = resolveCombat(input);
    const second = resolveCombat(input);

    expect(second.events).toEqual(first.events);
    expect(second.winner).toEqual(first.winner);
  });

  it("moves destroyed non-Echo units to Ashes", () => {
    const doomed = placement(playerA, "a", "ember_scraprunner", 0, 0, "doomed");
    const result = resolve({
      playerA: combatant(playerA, board(doomed)),
      playerB: combatant(playerB, unitBoard(playerB, "b", "debt_bound_colossus"))
    });
    const destroyed = result.events.find(
      (event): event is Extract<CombatEvent, { readonly type: "UnitDestroyed" }> =>
        event.type === "UnitDestroyed" && event.side === "playerA"
    );

    expect(result.finalState.ashes.playerA.map((card) => card.defId)).toContain(
      asCardDefId("ember_scraprunner")
    );
    expect(destroyed).toMatchObject({
      unitId: unitId("playerA", doomed.cardInstanceId),
      cardInstanceId: doomed.cardInstanceId,
      defId: asCardDefId("ember_scraprunner"),
      side: "playerA",
      ownerId: playerA,
      isEcho: false
    });
  });

  it("preserves destroyed non-Echo card instance data when moved to Ashes", () => {
    const doomed = placement(playerA, "a", "ember_scraprunner", 0, 0, "modified");
    const original = modifiedBoardInstance(
      playerA,
      "ember_scraprunner",
      doomed.cardInstanceId
    );

    const result = resolve({
      playerA: combatant(
        playerA,
        board(doomed),
        emptySourceRow(),
        emptySpellrail(),
        [],
        [original]
      ),
      playerB: combatant(playerB, unitBoard(playerB, "b", "test_executioner"))
    });

    expect(result.finalState.ashes.playerA[0]).toEqual({
      ...original,
      zone: "ashes"
    });
    expect(original.zone).toBe("board");
  });

  it("applies upgraded Unit stats from active card instances", () => {
    const upgradedPlacement = placement(playerA, "a", "cinder_scout", 0, 0, "up");
    const upgradedCard = createCardInstance({
      ownerId: playerA,
      defId: asCardDefId("cinder_scout"),
      zone: "board",
      instanceId: upgradedPlacement.cardInstanceId,
      upgradeLevel: 2
    });

    const result = resolve({
      playerA: combatant(
        playerA,
        board(upgradedPlacement),
        emptySourceRow(),
        emptySpellrail(),
        [],
        [upgradedCard]
      ),
      playerB: combatant(playerB, unitBoard(playerB, "b", "test_endless_wall")),
      maxDurationMs: 0
    });
    const unit = result.finalState.units.find(
      (candidate) => candidate.cardInstanceId === upgradedPlacement.cardInstanceId
    );

    expect(unit).toMatchObject({
      attack: 3,
      maxHealth: 4,
      currentHealth: 4
    });
    expect(upgradedCard).toMatchObject({ zone: "board", upgradeLevel: 2 });
  });

  it("uses level 0 stats when combat only has a board placement fallback", () => {
    const fallbackPlacement = placement(playerA, "a", "cinder_scout", 0, 0, "fallback");

    const result = resolve({
      playerA: combatant(playerA, board(fallbackPlacement)),
      playerB: combatant(playerB, unitBoard(playerB, "b", "test_endless_wall")),
      maxDurationMs: 0
    });
    const unit = result.finalState.units.find(
      (candidate) => candidate.cardInstanceId === fallbackPlacement.cardInstanceId
    );

    expect(unit).toMatchObject({
      attack: 1,
      maxHealth: 2,
      currentHealth: 2
    });
  });

  it("preserves destroyed upgraded non-Echo cards in Ashes", () => {
    const doomed = placement(playerA, "a", "ember_scraprunner", 0, 0, "upgraded");
    const upgradedCard = createCardInstance({
      ownerId: playerA,
      defId: asCardDefId("ember_scraprunner"),
      zone: "board",
      instanceId: doomed.cardInstanceId,
      upgradeLevel: 2
    });

    const result = resolve({
      playerA: combatant(
        playerA,
        board(doomed),
        emptySourceRow(),
        emptySpellrail(),
        [],
        [upgradedCard]
      ),
      playerB: combatant(playerB, unitBoard(playerB, "b", "test_executioner"))
    });

    expect(result.finalState.ashes.playerA).toContainEqual({
      ...upgradedCard,
      zone: "ashes"
    });
  });

  it("carries an upgraded pool card through board placement into combat stats", () => {
    const baseRun = createRunFromStarterKit({
      seed: "combat-upgrade-run",
      catalog: sampleCatalog,
      starterKitId: "ember_scrappers",
      playerId: playerA
    });
    const withCopies = {
      ...baseRun,
      pool: [
        ...baseRun.pool,
        createCardInstance({
          ownerId: playerA,
          defId: asCardDefId("cinder_scout"),
          zone: "pool",
          instanceId: asCardInstanceId("combat-upgrade-run:cinder:a")
        }),
        createCardInstance({
          ownerId: playerA,
          defId: asCardDefId("cinder_scout"),
          zone: "pool",
          instanceId: asCardInstanceId("combat-upgrade-run:cinder:b")
        }),
        createCardInstance({
          ownerId: playerA,
          defId: asCardDefId("cinder_scout"),
          zone: "pool",
          instanceId: asCardInstanceId("combat-upgrade-run:cinder:c")
        })
      ]
    };
    const upgradedRun = upgradeCardGroup(
      withCopies,
      sampleCatalog,
      asCardDefId("cinder_scout"),
      0
    );
    const upgradedCard = upgradedRun.pool.find(
      (card) => card.defId === asCardDefId("cinder_scout") && card.upgradeLevel === 1
    );
    if (!upgradedCard) {
      throw new Error("Expected upgraded Cinder Scout");
    }
    const placedRun = placeCardOnBoard(upgradedRun, upgradedCard.instanceId, {
      row: 0,
      col: 1,
      layer: "ground"
    });

    const result = resolve({
      playerA: buildCombatantSetupForRun(placedRun),
      playerB: combatant(playerB, unitBoard(playerB, "b", "test_endless_wall")),
      maxDurationMs: 0
    });
    const unit = result.finalState.units.find(
      (candidate) => candidate.cardInstanceId === upgradedCard.instanceId
    );

    expect(unit).toMatchObject({
      attack: 2,
      maxHealth: 3,
      currentHealth: 3
    });
  });

  it("destroyed Echoes do not enter Ashes", () => {
    const echo = placement(playerA, "a", "signal_wisp_echo", 0, 0, "echo");
    const input = {
      playerA: combatant(playerA, board(echo)),
      playerB: combatant(playerB, unitBoard(playerB, "b", "test_quick_attacker")),
      maxDurationMs: 500
    };
    const result = resolve(input);
    const summary = summarizeCombatOutcome(result);
    const destroyed = result.events.find(
      (event): event is Extract<CombatEvent, { readonly type: "UnitDestroyed" }> =>
        event.type === "UnitDestroyed" && event.side === "playerA"
    );

    expect(destroyed).toMatchObject({
      unitId: unitId("playerA", echo.cardInstanceId),
      cardInstanceId: echo.cardInstanceId,
      defId: asCardDefId("signal_wisp_echo"),
      side: "playerA",
      ownerId: playerA,
      isEcho: true
    });
    expect(result.finalState.ashes.playerA.map((card) => card.defId)).not.toContain(
      asCardDefId("signal_wisp_echo")
    );
    expect(summary.destroyedUnitDefIdsBySide.playerA).toContain(
      asCardDefId("signal_wisp_echo")
    );
    expect(JSON.parse(JSON.stringify(summary))).toEqual(summary);
    expect(summarizeCombatOutcome(resolve(input))).toEqual(summary);
  });

  it("summons Echoes from generic OnCombatStart abilities", () => {
    const result = resolve({
      playerA: combatant(playerA, relicBoard(playerA)),
      playerB: combatant(playerB, unitBoard(playerB, "b", "ember_scraprunner")),
      maxDurationMs: 2000
    });
    const summoned = result.events.find(
      (event): event is Extract<CombatEvent, { readonly type: "UnitSummoned" }> =>
        event.type === "UnitSummoned"
    );

    expect(summoned).toMatchObject({
      defId: asCardDefId("signal_wisp_echo"),
      side: "playerA",
      ownerId: playerA,
      isEcho: true
    });
    expect(result.finalState.ashes.playerA).toHaveLength(0);
  });

  it("Phase removes a unit from targetable combat and returns it", () => {
    const phaseTarget = placement(playerA, "a", "test_phase_probe", 0, 0, "phase");
    const decoy = placement(playerA, "a", "test_durable_decoy", 0, 1, "decoy");
    const phasedUnitId = unitId("playerA", phaseTarget.cardInstanceId);

    const result = resolve({
      playerA: combatant(
        playerA,
        board(phaseTarget, decoy),
        emptySourceRow(),
        spellrail(playerA, "test_phase_now")
      ),
      playerB: combatant(playerB, unitBoard(playerB, "b", "test_quick_attacker")),
      maxDurationMs: 800
    });

    const phaseOut = result.events.find((event) => event.type === "UnitPhasedOut");
    const phaseIn = result.events.find((event) => event.type === "UnitPhasedIn");
    const techniqueUsed = result.events.find(
      (event): event is Extract<CombatEvent, { readonly type: "TechniqueUsed" }> =>
        event.type === "TechniqueUsed"
    );
    expect(phaseOut).toMatchObject({
      unitId: phasedUnitId,
      cardInstanceId: phaseTarget.cardInstanceId,
      defId: asCardDefId("test_phase_probe"),
      side: "playerA",
      ownerId: playerA,
      isEcho: false
    });
    expect(phaseIn).toMatchObject({
      unitId: phasedUnitId,
      cardInstanceId: phaseTarget.cardInstanceId,
      defId: asCardDefId("test_phase_probe"),
      side: "playerA",
      ownerId: playerA,
      isEcho: false
    });
    expect(techniqueUsed).toMatchObject({
      defId: asCardDefId("test_phase_now"),
      side: "playerA",
      ownerId: playerA
    });

    const damageWhilePhased = result.events.filter(
      (event) =>
        event.type === "DamageDealt" &&
        event.targetId === phasedUnitId &&
        phaseOut &&
        phaseIn &&
        event.timeMs > phaseOut.timeMs &&
        event.timeMs < phaseIn.timeMs
    );
    expect(damageWhilePhased).toHaveLength(0);
  });

  it("Phase retriggers OnEntry only when configured", () => {
    const runCase = (techniqueId: string) =>
      resolve({
        playerA: combatant(
          playerA,
          board(
            placement(playerA, "a", "test_entry_charge_probe", 0, 0, "entry"),
            placement(playerA, "a", "test_durable_decoy", 0, 1, "decoy")
          ),
          emptySourceRow(),
          spellrail(playerA, techniqueId)
        ),
        playerB: combatant(playerB, unitBoard(playerB, "b", "test_quick_attacker")),
        maxDurationMs: 800
      });

    const withoutRetrigger = runCase("test_phase_now");
    const withRetrigger = runCase("test_phase_now_retrigger");

    const chargeMarkers = (events: typeof withRetrigger.events) =>
      events.filter(
        (event) =>
          event.type === "CombatChargeGained" &&
          event.playerId === playerA &&
          event.amount === 7
      );

    expect(chargeMarkers(withoutRetrigger.events)).toHaveLength(1);
    expect(chargeMarkers(withRetrigger.events)).toHaveLength(2);
  });

  it("Recall removes exactly one valid card from Ashes", () => {
    const ashes = [
      instance(playerA, "test_phase_probe", "ashes", "first"),
      instance(playerA, "test_phase_probe", "ashes", "second")
    ];

    const result = resolve({
      playerA: combatant(
        playerA,
        unitBoard(playerA, "a", "test_recaller"),
        emptySourceRow(),
        emptySpellrail(),
        ashes
      ),
      playerB: combatant(playerB, unitBoard(playerB, "b", "test_endless_wall")),
      maxDurationMs: 0
    });

    const recalled = result.events.filter(
      (event): event is Extract<CombatEvent, { readonly type: "UnitRecalled" }> =>
        event.type === "UnitRecalled"
    );
    expect(recalled).toHaveLength(1);
    expect(recalled[0]).toMatchObject({
      cardInstanceId: ashes[0]?.instanceId,
      defId: asCardDefId("test_phase_probe"),
      side: "playerA",
      ownerId: playerA,
      isEcho: false
    });
    expect(result.finalState.ashes.playerA).toHaveLength(1);
  });

  it("Recall fails gracefully when no valid tile exists", () => {
    const result = resolve({
      playerA: combatant(
        playerA,
        fullBoardWithRecaller(playerA),
        emptySourceRow(),
        emptySpellrail(),
        [instance(playerA, "test_phase_probe", "ashes", "trapped")]
      ),
      playerB: combatant(playerB, unitBoard(playerB, "b", "test_endless_wall")),
      maxDurationMs: 0
    });

    expect(result.events.filter((event) => event.type === "UnitRecalled")).toHaveLength(
      0
    );
    expect(result.warnings.map((warning) => warning.code)).toContain("NO_RECALL_TILE");
    expect(result.finalState.ashes.playerA).toHaveLength(1);
  });

  it("Barrier blocks exactly one damage instance", () => {
    const wall = placement(playerA, "a", "test_barrier_wall", 0, 0, "wall");
    const wallId = unitId("playerA", wall.cardInstanceId);

    const result = resolve({
      playerA: combatant(playerA, board(wall)),
      playerB: combatant(playerB, unitBoard(playerB, "b", "test_quick_attacker")),
      maxDurationMs: 500
    });

    const damageToWall = result.events.filter(
      (event): event is Extract<CombatEvent, { readonly type: "DamageDealt" }> =>
        event.type === "DamageDealt" && event.targetId === wallId
    );

    expect(damageToWall[0]).toMatchObject({ amount: 0 });
    expect(damageToWall[0]).toMatchObject({
      sourceDefId: asCardDefId("test_quick_attacker"),
      sourceSide: "playerB",
      targetCardInstanceId: wall.cardInstanceId,
      targetDefId: asCardDefId("test_barrier_wall"),
      targetSide: "playerA"
    });
    expect(damageToWall.slice(1).some((event) => event.amount > 0)).toBe(true);
    expect(
      result.events.filter(
        (event) =>
          event.type === "StatusRemoved" &&
          event.targetId === wallId &&
          event.status === "Barrier" &&
          event.reason === "consumed"
      )
    ).toHaveLength(1);
  });

  it("Guard affects targeting priority", () => {
    const guard = placement(playerB, "b", "test_guard_target", 0, 6, "guard");
    const nearerPlain = placement(playerB, "b", "test_plain_target", 0, 0, "plain");

    const result = resolve({
      playerA: combatant(playerA, unitBoard(playerA, "a", "test_quick_attacker")),
      playerB: combatant(playerB, board(nearerPlain, guard)),
      maxDurationMs: 200
    });

    const firstAttack = result.events.find((event) => event.type === "UnitAttacked");
    expect(firstAttack).toMatchObject({
      targetId: unitId("playerB", guard.cardInstanceId)
    });
  });

  it("max duration creates a draw and warning", () => {
    const result = resolve({
      playerA: combatant(playerA, unitBoard(playerA, "a", "test_endless_wall")),
      playerB: combatant(playerB, unitBoard(playerB, "b", "test_endless_wall")),
      maxDurationMs: 0
    });

    expect(result.winner).toBe("draw");
    expect(result.warnings.map((warning) => warning.code)).toContain(
      "MAX_DURATION_REACHED"
    );
  });

  it("schema-valid but unimplemented effects produce explicit simulator warnings", () => {
    const result = resolve({
      playerA: combatant(
        playerA,
        unitBoard(playerA, "a", "test_endless_wall"),
        emptySourceRow(),
        spellrail(playerA, "test_copy_probe")
      ),
      playerB: combatant(playerB, unitBoard(playerB, "b", "test_endless_wall")),
      maxDurationMs: 200
    });

    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: "UNIMPLEMENTED_EFFECT",
        message: expect.stringContaining("CopyTechnique")
      })
    );
  });
});
