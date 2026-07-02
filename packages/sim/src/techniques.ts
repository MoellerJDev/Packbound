import { COMBAT_TICK_MS, type AbilityDefinition } from "@packbound/shared";

import { applyEffect } from "./effects";
import { emit } from "./state";
import { targetsForAbility } from "./targeting";
import type {
  AbilitySource,
  MutableCombatState,
  MutableSideState,
  ResolveAbilities,
  TechniqueRuntime
} from "./types";

export const queueTechniques = (state: MutableCombatState): void => {
  for (const side of [state.sides.playerA, state.sides.playerB]) {
    for (const technique of side.techniques) {
      emit(state, {
        type: "TechniqueQueued",
        timeMs: 0,
        cardInstanceId: technique.card.instanceId
      });
    }
  }
};

export const tickCombatCharge = (state: MutableCombatState): void => {
  for (const side of [state.sides.playerA, state.sides.playerB]) {
    const gain = side.combatChargePerSecond * (COMBAT_TICK_MS / 1000);
    if (gain <= 0) {
      continue;
    }
    const roundedGain = Number(gain.toFixed(4));
    side.combatCharge = Number((side.combatCharge + roundedGain).toFixed(4));
    emit(state, {
      type: "CombatChargeGained",
      timeMs: state.timeMs,
      playerId: side.playerId,
      amount: roundedGain
    });
  }
};

const techniqueTriggerReady = (
  side: MutableSideState,
  technique: TechniqueRuntime
): boolean => {
  const trigger = technique.def.technique.trigger;

  if (side.combatCharge < technique.def.technique.combatChargeCost) {
    return false;
  }

  switch (trigger.type) {
    case "AfterSeconds":
      return side.combatCharge >= technique.def.technique.combatChargeCost;
    case "WhenCombatChargeAtLeast":
      return side.combatCharge >= trigger.amount;
    case "WhenFirstAllyBelowHealthPercent": {
      if (side.firstAllyBelowHealthTriggered) {
        return false;
      }
      return side.units.some(
        (unit) => unit.currentHealth / unit.maxHealth <= trigger.percent / 100
      );
    }
    default:
      return false;
  }
};

const techniqueDelayReady = (technique: TechniqueRuntime, timeMs: number): boolean => {
  const trigger = technique.def.technique.trigger;
  return trigger.type !== "AfterSeconds" || timeMs >= trigger.seconds * 1000;
};

export const resolveTechniques = (
  state: MutableCombatState,
  resolveAbilities: ResolveAbilities
): void => {
  for (const side of [state.sides.playerA, state.sides.playerB]) {
    for (const technique of side.techniques) {
      if (
        technique.used ||
        !techniqueDelayReady(technique, state.timeMs) ||
        !techniqueTriggerReady(side, technique)
      ) {
        continue;
      }

      technique.used = true;
      side.combatCharge = Number(
        (side.combatCharge - technique.def.technique.combatChargeCost).toFixed(4)
      );

      const source: AbilitySource = {
        sideState: side,
        cardInstanceId: technique.card.instanceId,
        def: technique.def
      };
      const ability: AbilityDefinition = {
        id: `${technique.def.id}:technique`,
        trigger: technique.def.technique.trigger,
        condition: { type: "Always" },
        target: technique.def.technique.target,
        effect: technique.def.technique.effect
      };
      const targets = targetsForAbility(state, source, ability);

      emit(state, {
        type: "TechniqueUsed",
        timeMs: state.timeMs,
        cardInstanceId: technique.card.instanceId,
        targets: targets.map((target) => target.unitId)
      });

      applyEffect(
        state,
        source,
        ability,
        technique.def.technique.effect,
        0,
        resolveAbilities
      );
      side.ashes.push({ ...technique.card, zone: "ashes" });

      if (technique.def.technique.trigger.type === "WhenFirstAllyBelowHealthPercent") {
        side.firstAllyBelowHealthTriggered = true;
      }
    }
  }
};
