import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import {
  asCardDefId,
  asCardInstanceId,
  asPlayerId,
  type BoardPlacement,
  type BoardState,
  type CardDefinition,
  type CardInstance
} from "@packbound/shared";

import {
  addCardToSourceRow,
  buildRunTraitSummary,
  calculateTeamups,
  createCardInstance,
  createRunFromStarterKit,
  removeCardFromSourceRow,
  type RunState,
  type TraitSummary
} from "../index";

const createStarterRun = (starterKitId = "ember_scrappers"): RunState =>
  createRunFromStarterKit({
    seed: `trait-summary:${starterKitId}`,
    catalog: sampleCatalog,
    starterKitId,
    playerId: asPlayerId("trait-player")
  });

const traitCount = (summary: TraitSummary, traitId: string): number =>
  summary.allTraitCounts.find((trait) => trait.traitId === traitId)?.count ?? 0;

const activeTraitIds = (summary: TraitSummary): readonly string[] =>
  summary.activeTraits.map((trait) => trait.traitId);

const nearTraitIds = (summary: TraitSummary): readonly string[] =>
  summary.nearTraits.map((trait) => trait.traitId);

const poolCard = (run: RunState, defId: string, suffix = defId): CardInstance =>
  createCardInstance({
    ownerId: run.playerId,
    defId: asCardDefId(defId),
    zone: "pool",
    instanceId: asCardInstanceId(`${run.runId}:trait-test:${suffix}`)
  });

const withPoolCard = (run: RunState, card: CardInstance): RunState => ({
  ...run,
  pool: [...run.pool, card]
});

const teamupPlacement = (
  defId: string,
  index: number,
  layer: BoardPlacement["position"]["layer"] = "ground"
): BoardPlacement => ({
  cardInstanceId: asCardInstanceId(`teamup-board:${defId}:${index}`),
  defId: asCardDefId(defId),
  ownerId: asPlayerId("teamup-player"),
  position: { row: index, col: 2, layer }
});

const teamupBoard = (...placements: readonly BoardPlacement[]): BoardState => ({
  placements
});

describe("run trait summaries", () => {
  it("is deterministic and JSON-serializable", () => {
    const run = createStarterRun("cloudspire_phase");
    const first = buildRunTraitSummary(run, sampleCatalog);
    const second = buildRunTraitSummary(run, sampleCatalog);

    expect(second).toEqual(first);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
  });

  it.each([
    {
      starterKitId: "ember_scrappers",
      expectedCounts: {
        ember: 3,
        scrapper: 1,
        source_greed: 1,
        echo_fodder: 1
      },
      expectedActive: ["ember"],
      expectedNear: ["ember", "scrapper", "source_greed", "echo_fodder"]
    },
    {
      starterKitId: "rotbloom_recall",
      expectedCounts: {
        shade: 2,
        bloom: 1,
        source_greed: 2,
        ashes: 1,
        recall: 1,
        husk: 1
      },
      expectedActive: ["shade", "source_greed"],
      expectedNear: ["bloom", "ashes", "recall", "husk"]
    },
    {
      starterKitId: "cloudspire_phase",
      expectedCounts: {
        tide: 3,
        gleam: 2,
        phase: 2,
        source_greed: 2,
        barrier: 1,
        warden: 1
      },
      expectedActive: ["tide", "gleam", "phase", "source_greed"],
      expectedNear: ["tide", "barrier", "warden"]
    }
  ])("summarizes starter traits for $starterKitId", (fixture) => {
    const summary = buildRunTraitSummary(
      createStarterRun(fixture.starterKitId),
      sampleCatalog
    );

    for (const [traitId, count] of Object.entries(fixture.expectedCounts)) {
      expect(traitCount(summary, traitId), `${fixture.starterKitId}:${traitId}`).toBe(
        count
      );
    }

    for (const traitId of fixture.expectedActive) {
      expect(activeTraitIds(summary), `${fixture.starterKitId}:${traitId}`).toContain(
        traitId
      );
    }

    for (const traitId of fixture.expectedNear) {
      expect(nearTraitIds(summary), `${fixture.starterKitId}:${traitId}`).toContain(
        traitId
      );
    }
  });

  it("updates when active Source Row cards are added or removed", () => {
    const baseRun = createStarterRun("ember_scrappers");
    const source = poolCard(baseRun, "bloom_source", "bloom-source");
    const withSource = withPoolCard(baseRun, source);
    const added = addCardToSourceRow(withSource, source.instanceId);
    const removed = removeCardFromSourceRow(added, source.instanceId);

    expect(traitCount(buildRunTraitSummary(baseRun, sampleCatalog), "source_greed")).toBe(
      1
    );
    expect(traitCount(buildRunTraitSummary(added, sampleCatalog), "source_greed")).toBe(
      2
    );
    expect(traitCount(buildRunTraitSummary(added, sampleCatalog), "bloom")).toBe(1);
    expect(traitCount(buildRunTraitSummary(removed, sampleCatalog), "source_greed")).toBe(
      1
    );
  });

  it("does not count pool, Ashes, or Void cards as active traits", () => {
    const run = createStarterRun("rotbloom_recall");
    const summary = buildRunTraitSummary(run, sampleCatalog);

    expect(run.pool.some((card) => card.defId === asCardDefId("ash_ledger_relic"))).toBe(
      true
    );
    expect(
      run.ashes.some((card) => card.defId === asCardDefId("ember_scraprunner"))
    ).toBe(true);
    expect(traitCount(summary, "relic_engine")).toBe(0);
    expect(traitCount(summary, "ember")).toBe(0);
  });

  it("deduplicates card instances that appear in more than one active source", () => {
    const run = createStarterRun("ember_scrappers");
    const duplicateActive = {
      ...run,
      activeCards: [...run.activeCards, ...run.activeCards]
    };

    expect(traitCount(buildRunTraitSummary(run, sampleCatalog), "ember")).toBe(3);
    expect(
      traitCount(buildRunTraitSummary(duplicateActive, sampleCatalog), "ember")
    ).toBe(3);
  });

  it("keeps contributor card instance metadata for UI display", () => {
    const run = createStarterRun("cloudspire_phase");
    const summary = buildRunTraitSummary(run, sampleCatalog);
    const phase = summary.allTraitCounts.find((trait) => trait.traitId === "phase");

    expect(phase?.cards.map((card) => card.cardName)).toEqual([
      "Cloudgate Adept",
      "Phase Step"
    ]);
    expect(phase?.cards.every((card) => card.cardInstanceId.length > 0)).toBe(true);
  });
});

describe("board teamup activation", () => {
  it("activates board-only trait thresholds deterministically", () => {
    const teamups = calculateTeamups(
      sampleCatalog,
      teamupBoard(
        teamupPlacement("ember_scraprunner", 0),
        teamupPlacement("cinder_scout", 1)
      )
    );

    expect(teamups.map((teamup) => teamup.teamupId)).toEqual(["ember", "scrapper"]);
    expect(teamups).toMatchObject([
      {
        teamupId: "ember",
        count: 2,
        tier: 1,
        sourceInstanceIds: [
          asCardInstanceId("teamup-board:ember_scraprunner:0"),
          asCardInstanceId("teamup-board:cinder_scout:1")
        ]
      },
      {
        teamupId: "scrapper",
        count: 2,
        tier: 1,
        sourceInstanceIds: [
          asCardInstanceId("teamup-board:ember_scraprunner:0"),
          asCardInstanceId("teamup-board:cinder_scout:1")
        ]
      }
    ]);
    expect(JSON.parse(JSON.stringify(teamups))).toEqual(teamups);
  });

  it("counts support placements and higher thresholds without requiring run zones", () => {
    const teamups = calculateTeamups(
      sampleCatalog,
      teamupBoard(
        teamupPlacement("ember_scraprunner", 0),
        teamupPlacement("cinder_scout", 1),
        teamupPlacement("sparkcatch_apprentice", 2),
        teamupPlacement("signal_nest", 3, "support")
      )
    );

    expect(teamups.find((teamup) => teamup.teamupId === "ember")).toMatchObject({
      count: 4,
      tier: 2
    });
    expect(teamups.find((teamup) => teamup.teamupId === "echo_fodder")).toMatchObject({
      count: 3,
      tier: 2
    });
  });

  it("ignores unknown card definitions and traits that are not in the catalog", () => {
    const cinderScout = sampleCatalog.cardsById.get(asCardDefId("cinder_scout"));
    if (!cinderScout) {
      throw new Error("Expected cinder_scout in sample catalog");
    }
    const missingTraitCard: CardDefinition = {
      ...cinderScout,
      id: asCardDefId("test_missing_trait_card"),
      traits: ["test_missing_trait"]
    };
    const catalogWithMissingTrait = {
      ...sampleCatalog,
      cards: [...sampleCatalog.cards, missingTraitCard],
      cardsById: new Map([
        ...sampleCatalog.cardsById,
        [missingTraitCard.id, missingTraitCard] as const
      ])
    };

    expect(
      calculateTeamups(
        catalogWithMissingTrait,
        teamupBoard(
          teamupPlacement("test_missing_trait_card", 0),
          teamupPlacement("test_unknown_card", 1)
        )
      )
    ).toEqual([]);
  });
});
