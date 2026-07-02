import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import {
  asCardDefId,
  asCardInstanceId,
  asPlayerId,
  type CardInstance,
  type CardInstanceId,
  type PlayerId
} from "@packbound/shared";

import {
  MAX_CARD_UPGRADE_LEVEL,
  UPGRADE_COPIES_REQUIRED,
  canUpgradeCardGroup,
  createCardInstance,
  createRunFromStarterKit,
  describeUpgradeProgressGroup,
  getUpgradeProgressForCard,
  getUpgradeProgressGroups,
  getUpgradeableCardGroups,
  placeCardOnBoard,
  upgradeCardGroup,
  type RunState
} from "../index";

const createStarterRun = (seed = "upgrade-seed"): RunState =>
  createRunFromStarterKit({
    seed,
    catalog: sampleCatalog,
    starterKitId: "ember_scrappers",
    playerId: asPlayerId("upgrade-player")
  });

const poolCard = (
  run: RunState,
  defId: string,
  suffix: string,
  upgradeLevel = 0,
  ownerId: PlayerId = run.playerId
): CardInstance =>
  createCardInstance({
    ownerId,
    defId: asCardDefId(defId),
    zone: "pool",
    upgradeLevel,
    instanceId: asCardInstanceId(`${run.runId}:upgrade:${suffix}`)
  });

const withPoolCards = (run: RunState, ...cards: readonly CardInstance[]): RunState => ({
  ...run,
  pool: [...run.pool, ...cards]
});

const instanceIds = (cards: readonly CardInstance[]): readonly CardInstanceId[] =>
  cards.map((card) => card.instanceId);

const cinderDuplicates = (
  run: RunState,
  suffixes: readonly string[],
  upgradeLevel = 0
): readonly CardInstance[] =>
  suffixes.map((suffix) => poolCard(run, "cinder_scout", suffix, upgradeLevel));

describe("duplicate card upgrades", () => {
  it("does not expose a group with fewer than 3 matching pool copies", () => {
    const baseRun = createStarterRun();
    const run = withPoolCards(baseRun, ...cinderDuplicates(baseRun, ["a", "b"]));
    const check = canUpgradeCardGroup(run, sampleCatalog, asCardDefId("cinder_scout"), 0);

    expect(getUpgradeableCardGroups(run, sampleCatalog)).toEqual([]);
    expect(check).toMatchObject({
      eligible: false,
      availableCopies: 2,
      requiredCopies: UPGRADE_COPIES_REQUIRED
    });
    expect(check.blockedReason).toContain("Need 3 matching pool copies");
    expect(() =>
      upgradeCardGroup(run, sampleCatalog, asCardDefId("cinder_scout"), 0)
    ).toThrow(/Need 3 matching pool copies/);
  });

  it("reports partial duplicate progress without exposing an upgrade action", () => {
    const baseRun = createStarterRun("partial-progress");
    const run = withPoolCards(baseRun, ...cinderDuplicates(baseRun, ["a", "b"]));
    const group = getUpgradeProgressGroups(run, sampleCatalog).find(
      (candidate) => candidate.defId === asCardDefId("cinder_scout")
    );

    expect(group).toMatchObject({
      defId: asCardDefId("cinder_scout"),
      name: "Cinder Scout",
      cardType: "Unit",
      upgradeLevel: 0,
      nextUpgradeLevel: 1,
      poolCopies: 2,
      activeCopies: 0,
      otherCopies: 0,
      totalCopies: 2,
      eligible: true,
      canUpgrade: false,
      progressText: "2 / 3 pool copies at Lv 0"
    });
    expect(group?.blockedReason).toBe("Need 3 matching pool copies; found 2.");
    expect(group ? describeUpgradeProgressGroup(group) : "").toBe(
      "Cinder Scout: 2 / 3 pool copies at Lv 0. Need 3 matching pool copies; found 2."
    );
    expect(getUpgradeableCardGroups(run, sampleCatalog)).toEqual([]);
  });

  it("shows active copies separately because only pool copies count", () => {
    const baseRun = createStarterRun("active-progress");
    const activeCopy = poolCard(baseRun, "cinder_scout", "active");
    const withActiveCopy = placeCardOnBoard(
      withPoolCards(baseRun, activeCopy),
      activeCopy.instanceId,
      { row: 0, col: 0, layer: "ground" }
    );
    const run = withPoolCards(
      withActiveCopy,
      poolCard(withActiveCopy, "cinder_scout", "pool-a"),
      poolCard(withActiveCopy, "cinder_scout", "pool-b")
    );
    const group = getUpgradeProgressGroups(run, sampleCatalog).find(
      (candidate) => candidate.defId === asCardDefId("cinder_scout")
    );

    expect(group).toMatchObject({
      poolCopies: 2,
      activeCopies: 1,
      otherCopies: 0,
      totalCopies: 3,
      eligible: true,
      canUpgrade: false,
      progressText: "2 / 3 pool copies at Lv 0 (2 pool + 1 active copy)"
    });
    expect(group?.blockedReason).toBe("Return active copies to pool to upgrade.");
    expect(group?.activeCardInstanceIds).toEqual([activeCopy.instanceId]);
    expect(getUpgradeableCardGroups(run, sampleCatalog)).toEqual([]);
  });

  it("reports non-upgradeable duplicate card types with a specific reason", () => {
    const baseRun = createStarterRun("relic-progress");
    const run = withPoolCards(
      baseRun,
      poolCard(baseRun, "due_marker_relic", "a"),
      poolCard(baseRun, "due_marker_relic", "b")
    );
    const group = getUpgradeProgressGroups(run, sampleCatalog).find(
      (candidate) => candidate.defId === asCardDefId("due_marker_relic")
    );

    expect(group).toMatchObject({
      name: "Due Marker",
      cardType: "Relic",
      poolCopies: 2,
      totalCopies: 2,
      eligible: false,
      canUpgrade: false,
      blockedReason: "Relics are not upgradeable yet."
    });
    expect(group ? describeUpgradeProgressGroup(group) : "").toBe(
      "Due Marker: duplicate Relic. Relics are not upgradeable yet."
    );
    expect(getUpgradeableCardGroups(run, sampleCatalog)).toEqual([]);
  });

  it("combines 3 same-definition same-level Unit copies deterministically", () => {
    const baseRun = createStarterRun("deterministic-upgrade");
    const copies = cinderDuplicates(baseRun, ["z", "a", "m"]);
    const run = withPoolCards(baseRun, ...copies);
    const before = JSON.parse(JSON.stringify(run)) as RunState;
    const groups = getUpgradeableCardGroups(run, sampleCatalog);
    const group = groups[0];
    if (!group) {
      throw new Error("Expected a cinder scout upgrade group");
    }

    const upgraded = upgradeCardGroup(run, sampleCatalog, asCardDefId("cinder_scout"), 0);
    const sortedIds = [...instanceIds(copies)].sort();
    const preservedId = sortedIds[0];
    const consumedIds = sortedIds.slice(1);
    const preservedCard = upgraded.pool.find((card) => card.instanceId === preservedId);

    expect(run).toEqual(before);
    expect(group).toMatchObject({
      defId: asCardDefId("cinder_scout"),
      name: "Cinder Scout",
      cardType: "Unit",
      upgradeLevel: 0,
      nextUpgradeLevel: 1,
      availableCopies: 3,
      eligible: true
    });
    expect(group.cardInstanceIds).toEqual(sortedIds);
    expect(preservedCard).toMatchObject({
      instanceId: preservedId,
      defId: asCardDefId("cinder_scout"),
      zone: "pool",
      upgradeLevel: 1
    });
    for (const consumedId of consumedIds) {
      expect(upgraded.pool.map((card) => card.instanceId)).not.toContain(consumedId);
    }
    expect(
      upgraded.pool.filter((card) => card.defId === asCardDefId("cinder_scout"))
    ).toHaveLength(1);
  });

  it("upgrades level 1 copies to level 2 and blocks max-level groups", () => {
    const baseRun = createStarterRun("max-upgrade");
    const levelOneRun = withPoolCards(
      baseRun,
      ...cinderDuplicates(baseRun, ["a", "b", "c"], 1)
    );
    const upgraded = upgradeCardGroup(
      levelOneRun,
      sampleCatalog,
      asCardDefId("cinder_scout"),
      1
    );
    const levelTwoCard = upgraded.pool.find(
      (card) =>
        card.defId === asCardDefId("cinder_scout") &&
        card.upgradeLevel === MAX_CARD_UPGRADE_LEVEL
    );

    expect(levelTwoCard).toBeDefined();

    const maxRun = withPoolCards(
      baseRun,
      ...cinderDuplicates(baseRun, ["x", "y", "z"], MAX_CARD_UPGRADE_LEVEL)
    );
    const check = canUpgradeCardGroup(
      maxRun,
      sampleCatalog,
      asCardDefId("cinder_scout"),
      MAX_CARD_UPGRADE_LEVEL
    );

    expect(getUpgradeableCardGroups(maxRun, sampleCatalog)).toEqual([]);
    expect(check).toMatchObject({
      eligible: false,
      availableCopies: 3,
      nextUpgradeLevel: MAX_CARD_UPGRADE_LEVEL
    });
    expect(check.blockedReason).toContain("max upgrade level");

    const progressGroup = getUpgradeProgressGroups(maxRun, sampleCatalog).find(
      (candidate) => candidate.defId === asCardDefId("cinder_scout")
    );
    expect(progressGroup).toMatchObject({
      poolCopies: 3,
      totalCopies: 3,
      eligible: false,
      canUpgrade: false,
      blockedReason: "Max upgrade level reached."
    });
  });

  it("does not expose non-Unit or non-Echo card groups", () => {
    const baseRun = createStarterRun("non-unit");
    const run = withPoolCards(
      baseRun,
      poolCard(baseRun, "bloom_source", "a"),
      poolCard(baseRun, "bloom_source", "b"),
      poolCard(baseRun, "bloom_source", "c")
    );
    const check = canUpgradeCardGroup(run, sampleCatalog, asCardDefId("bloom_source"), 0);

    expect(getUpgradeableCardGroups(run, sampleCatalog)).toEqual([]);
    expect(check).toMatchObject({
      cardType: "Source",
      eligible: false,
      availableCopies: 3
    });
    expect(check.blockedReason).toContain("Only Unit and Echo");
  });

  it("counts only matching owner, level, definition, and pool zone copies", () => {
    const baseRun = createStarterRun("matching-copies");
    const activeCopy = poolCard(baseRun, "cinder_scout", "active");
    const withActiveCopy = placeCardOnBoard(
      withPoolCards(baseRun, activeCopy),
      activeCopy.instanceId,
      { row: 0, col: 0, layer: "ground" }
    );
    const run = withPoolCards(
      withActiveCopy,
      poolCard(withActiveCopy, "cinder_scout", "pool-a"),
      poolCard(withActiveCopy, "cinder_scout", "pool-b"),
      poolCard(withActiveCopy, "cinder_scout", "foreign", 0, asPlayerId("other-player")),
      poolCard(withActiveCopy, "cinder_scout", "level-one", 1),
      poolCard(withActiveCopy, "sparkcatch_apprentice", "different-def")
    );
    const check = canUpgradeCardGroup(run, sampleCatalog, asCardDefId("cinder_scout"), 0);

    expect(check).toMatchObject({ eligible: false, availableCopies: 2 });
    expect(check.cardInstanceIds).toEqual([
      poolCard(withActiveCopy, "cinder_scout", "pool-a").instanceId,
      poolCard(withActiveCopy, "cinder_scout", "pool-b").instanceId
    ]);
    expect(getUpgradeableCardGroups(run, sampleCatalog)).toEqual([]);
  });

  it("counts the same card instance once if it appears in more than one zone", () => {
    const baseRun = createStarterRun("dedupe-progress");
    const card = poolCard(baseRun, "cinder_scout", "same-card");
    const run: RunState = {
      ...withPoolCards(baseRun, card),
      sourceRow: {
        ...baseRun.sourceRow,
        cards: [...baseRun.sourceRow.cards, { ...card, zone: "sourceRow" }]
      }
    };
    const progress = getUpgradeProgressForCard(run, sampleCatalog, card.instanceId);

    expect(progress).toMatchObject({
      poolCopies: 1,
      activeCopies: 0,
      otherCopies: 0,
      totalCopies: 1,
      progressText: "1 / 3 pool copies at Lv 0"
    });
  });

  it("upgrades Echo copies and remains JSON-serializable", () => {
    const baseRun = createStarterRun("echo-upgrade");
    const run = withPoolCards(
      baseRun,
      poolCard(baseRun, "coal_wisp_echo", "a"),
      poolCard(baseRun, "coal_wisp_echo", "b"),
      poolCard(baseRun, "coal_wisp_echo", "c")
    );
    const group = getUpgradeableCardGroups(run, sampleCatalog)[0];
    const upgraded = upgradeCardGroup(
      run,
      sampleCatalog,
      asCardDefId("coal_wisp_echo"),
      0
    );

    expect(group).toMatchObject({ cardType: "Echo", eligible: true });
    expect(JSON.parse(JSON.stringify(group))).toEqual(group);
    expect(JSON.parse(JSON.stringify(upgraded))).toEqual(upgraded);
    expect(
      upgraded.pool.find((card) => card.defId === asCardDefId("coal_wisp_echo"))
        ?.upgradeLevel
    ).toBe(1);
  });
});
