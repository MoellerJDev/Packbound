import type { ContentCatalog } from "@packbound/content";
import {
  ASPECTS,
  chargeCostTotal,
  type Aspect,
  type CardInstanceId,
  type ValidationResult
} from "@packbound/shared";

import { getRunPhase, type RunState } from "./runState";

export type LoadoutResourceSummary = {
  readonly boardChargeUsed: number;
  readonly boardChargeCapacity: number;
  readonly boardChargeText: string;
  readonly aspectAccess: Readonly<Record<Aspect, number>>;
  readonly aspectAccessText: string;
  readonly combatChargePerSecond: number;
  readonly combatChargePerSecondText: string;
  readonly sourceSlotsUsed: number;
  readonly sourceSlotsMax: number;
  readonly sourceSlotsText: string;
};

const emptyAspectAccess = (): Record<Aspect, number> => ({
  Ember: 0,
  Shade: 0,
  Bloom: 0,
  Tide: 0,
  Gleam: 0
});

const formatNumber = (value: number): string => `${Number(value.toFixed(4))}`;

const formatAspectAccess = (access: Readonly<Record<Aspect, number>>): string => {
  const parts = ASPECTS.filter((aspect) => access[aspect] > 0).map(
    (aspect) => `${aspect} ${access[aspect]}`
  );
  return parts.length > 0 ? parts.join(", ") : "None";
};

const commanderEffectiveRebindTax = (run: RunState): number =>
  Math.max(0, (run.commander?.rebindTax ?? 0) - (run.commander?.rebindTaxDiscount ?? 0));

export const buildLoadoutResourceSummary = (
  run: RunState,
  catalog: ContentCatalog
): LoadoutResourceSummary => {
  const aspectAccess = emptyAspectAccess();
  let boardChargeCapacity = 0;
  let combatChargePerSecond = 0;

  for (const source of run.sourceRow.cards) {
    const def = catalog.cardsById.get(source.defId);
    if (def?.cardType !== "Source") {
      continue;
    }

    boardChargeCapacity += def.source.boardChargeCapacity;
    combatChargePerSecond += def.source.combatChargePerSecond;
    for (const aspect of def.source.aspectAccess) {
      aspectAccess[aspect] += 1;
    }
  }

  const boardChargeUsed = run.board.placements.reduce((sum, placement) => {
    const def = catalog.cardsById.get(placement.defId);
    return sum + (def ? chargeCostTotal(def.cost) : 0);
  }, 0);
  const commanderRebindTaxUsed =
    run.commander?.card.zone === "board" ? commanderEffectiveRebindTax(run) : 0;
  const totalBoardChargeUsed = boardChargeUsed + commanderRebindTaxUsed;
  const roundedCombatChargePerSecond = Number(combatChargePerSecond.toFixed(4));

  return {
    boardChargeUsed: totalBoardChargeUsed,
    boardChargeCapacity,
    boardChargeText: `${totalBoardChargeUsed} / ${boardChargeCapacity}`,
    aspectAccess,
    aspectAccessText: formatAspectAccess(aspectAccess),
    combatChargePerSecond: roundedCombatChargePerSecond,
    combatChargePerSecondText: formatNumber(roundedCombatChargePerSecond),
    sourceSlotsUsed: run.sourceRow.cards.length,
    sourceSlotsMax: run.sourceRow.maxSlots,
    sourceSlotsText: `${run.sourceRow.cards.length} / ${run.sourceRow.maxSlots}`
  };
};

export const getRunNextActionMessage = (
  run: RunState,
  validation: ValidationResult,
  canApplyRewardNow = run.status === "active" && run.phase === "reward"
): string => {
  const phase = getRunPhase(run);

  if (phase === "complete" || run.status !== "active") {
    return "Run complete. Reset to start again.";
  }

  switch (phase) {
    case "planning":
      return validation.ok
        ? "Next: adjust your loadout or ready combat."
        : "Fix loadout errors before combat.";
    case "combatReady":
      return "Next: review the preview, then record combat.";
    case "reward": {
      if (!canApplyRewardNow) {
        return "Next: rewards will appear after combat.";
      }

      const packRewardClaimed = run.rewardHistory.some(
        (entry) => entry.type === "pack" && entry.round === run.currentRound
      );
      const commanderUpgradeClaimed =
        !run.commander ||
        run.commander.upgradeHistory.some((entry) => entry.round === run.currentRound);

      if (!packRewardClaimed && !commanderUpgradeClaimed) {
        return "Next: open one reward pack and choose one Commander upgrade.";
      }
      if (!packRewardClaimed) {
        return "Next: open one reward pack.";
      }
      if (!commanderUpgradeClaimed) {
        return "Next: choose one Commander upgrade.";
      }
      return "Next: reward choices are complete.";
    }
    case "combatResolved":
      return "Next: advance to the next round.";
  }
};

export const getLatestOpenedPackCardInstanceIds = (
  run: RunState
): readonly CardInstanceId[] =>
  run.openedPacks.at(-1)?.cards.map((card) => card.instanceId) ?? [];
