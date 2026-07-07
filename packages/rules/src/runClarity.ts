import type { ContentCatalog } from "@packbound/content";
import {
  ASPECTS,
  chargeCostTotal,
  type Aspect,
  type CombatEvent,
  type ValidationResult
} from "@packbound/shared";

import { hasCommanderRewardForRound } from "./commander";
import { getRunPhase, type RunState } from "./runState";

export {
  buildPostPackLoadoutSuggestions,
  getLatestOpenedPackCardInstanceIds
} from "./postPackLoadoutSuggestions";
export type {
  PostPackLoadoutSuggestion,
  PostPackLoadoutSuggestionPriority,
  PostPackLoadoutSuggestionSummary
} from "./postPackLoadoutSuggestions";

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

export type BattlefieldLayerEntry = {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
};

export type BattlefieldLayerSectionView = {
  readonly title: string;
  readonly statusText: string;
  readonly entries: readonly BattlefieldLayerEntry[];
};

export type BattlefieldLayersView = {
  readonly ashes: BattlefieldLayerSectionView;
  readonly wallsAndEdges: BattlefieldLayerSectionView;
};

export type BuildBattlefieldLayersViewInput = {
  readonly run: RunState;
  readonly catalog: ContentCatalog;
  readonly lastCombatEvents?: readonly CombatEvent[];
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

const combatSideLabel = (
  event: Extract<CombatEvent, { readonly type: "UnitDestroyed" }>
) => (event.side === "playerA" ? "Your side" : "Enemy side");

export const buildBattlefieldLayersView = ({
  catalog,
  lastCombatEvents = [],
  run
}: BuildBattlefieldLayersViewInput): BattlefieldLayersView => {
  const persistentAshEntries = run.ashes.map((card, index) => ({
    id: `persistent-ashes:${card.instanceId}:${index}`,
    label: catalog.cardsById.get(card.defId)?.name ?? card.defId,
    detail: "Persistent Ashes"
  }));
  const destroyedEvents = lastCombatEvents.filter(
    (event): event is Extract<CombatEvent, { readonly type: "UnitDestroyed" }> =>
      event.type === "UnitDestroyed"
  );
  const lastCombatAshEntries =
    persistentAshEntries.length > 0
      ? []
      : destroyedEvents.map((event, index) => ({
          id: `last-combat-ashes:${event.cardInstanceId}:${index}`,
          label: catalog.cardsById.get(event.defId)?.name ?? event.defId,
          detail: `Last combat Ashes: ${combatSideLabel(event)}`
        }));
  const ashEntries =
    persistentAshEntries.length > 0 ? persistentAshEntries : lastCombatAshEntries;

  return {
    ashes: {
      title: "Ashes",
      statusText:
        persistentAshEntries.length > 0
          ? "Persistent Ashes tracked by the run."
          : lastCombatAshEntries.length > 0
            ? "Last combat Ashes from destroyed units."
            : "No Ashes yet.",
      entries: ashEntries
    },
    wallsAndEdges: {
      title: "Walls / Edges",
      statusText: "No walls or edge terrain yet.",
      entries: []
    }
  };
};

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
        ? "Next: tune your board, Sources, Spellrail, and Commander, then ready combat."
        : "Fix loadout errors before combat.";
    case "combatReady":
      return "Next: review the combat preview, then record combat to lock in the result.";
    case "reward": {
      if (!canApplyRewardNow) {
        return "Next: rewards will appear after combat.";
      }

      if (run.pendingPackOffer) {
        return `Next: pick ${run.pendingPackOffer.pickLimit} from ${run.pendingPackOffer.packName}.`;
      }

      const packRewardClaimed = run.rewardHistory.some(
        (entry) => entry.type === "pack" && entry.round === run.currentRound
      );
      const commanderRewardClaimed = hasCommanderRewardForRound(run);

      if (!packRewardClaimed && !commanderRewardClaimed) {
        return "Next: claim both rewards: open one pack and unlock one Commander doctrine.";
      }
      if (!packRewardClaimed) {
        return "Next: open one reward pack.";
      }
      if (!commanderRewardClaimed) {
        return "Next: unlock one Commander doctrine.";
      }
      return "Next: reward choices are complete.";
    }
    case "combatResolved":
      return "Next: advance to start the next planning round.";
  }
};
