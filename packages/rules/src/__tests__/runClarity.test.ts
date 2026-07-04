import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import { asPackId, asPlayerId } from "@packbound/shared";

import {
  buildLoadoutResourceSummary,
  createRunFromStarterKit,
  getLatestOpenedPackCardInstanceIds,
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
});
