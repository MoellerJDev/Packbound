import type { AbilityDefinition, AbilityEffect } from "@packbound/shared";

import { applyDamage, destroyUnit } from "./damage";
import { phaseUnit, recallUnit, summonUnit } from "./placement";
import { addWarning, emit } from "./state";
import { applyStatus } from "./statuses";
import { targetsForAbility } from "./targeting";
import type { AbilitySource, MutableCombatState, ResolveAbilities } from "./types";

export const applyEffect = (
  state: MutableCombatState,
  source: AbilitySource,
  ability: AbilityDefinition,
  effect: AbilityEffect,
  depth: number,
  resolveAbilities: ResolveAbilities
): void => {
  const targets = targetsForAbility(state, source, ability);

  switch (effect.type) {
    case "DealDamage":
      for (const target of targets) {
        applyDamage(
          state,
          source.cardInstanceId,
          target,
          effect.amount,
          "techniqueDamage",
          depth,
          resolveAbilities
        );
      }
      return;
    case "Heal":
      for (const target of targets) {
        target.currentHealth = Math.min(
          target.maxHealth,
          target.currentHealth + effect.amount
        );
      }
      return;
    case "ModifyStats":
      for (const target of targets) {
        target.attack += effect.attack ?? 0;
        target.maxHealth += effect.health ?? 0;
        target.currentHealth += effect.health ?? 0;
        target.attackSpeed += effect.attackSpeed ?? 0;
      }
      return;
    case "ApplyStatus":
      for (const target of targets) {
        applyStatus(state, target, {
          type: effect.status,
          ...(effect.durationMs ? { remainingMs: effect.durationMs } : {}),
          ...(effect.stacks ? { stacks: effect.stacks } : {})
        });
      }
      return;
    case "RemoveStatus":
      for (const target of targets) {
        target.statuses = target.statuses.filter(
          (status) => status.type !== effect.status
        );
        emit(state, {
          type: "StatusRemoved",
          timeMs: state.timeMs,
          targetId: target.unitId,
          status: effect.status,
          reason: "cleansed"
        });
      }
      return;
    case "GrantKeyword":
      for (const target of targets) {
        if (!target.keywords.includes(effect.keyword)) {
          target.keywords.push(effect.keyword);
        }
      }
      return;
    case "RemoveKeyword":
      for (const target of targets) {
        target.keywords = target.keywords.filter((keyword) => keyword !== effect.keyword);
      }
      return;
    case "SummonEcho":
    case "SummonUnit":
      summonUnit(state, source, effect, depth, resolveAbilities);
      return;
    case "Offer":
    case "Destroy":
      for (const target of targets) {
        destroyUnit(
          state,
          target,
          effect.type === "Offer" ? "offered" : "effectDestroy",
          depth,
          resolveAbilities
        );
      }
      return;
    case "Phase":
      for (const target of targets.slice(0, 1)) {
        phaseUnit(state, source, target, effect);
      }
      return;
    case "Recall":
      recallUnit(state, source, effect, depth, resolveAbilities);
      return;
    case "GainCombatCharge":
      source.sideState.combatCharge += effect.amount;
      emit(state, {
        type: "CombatChargeGained",
        timeMs: state.timeMs,
        playerId: source.sideState.playerId,
        amount: effect.amount
      });
      return;
    case "DrainCombatCharge":
      source.sideState.combatCharge = Math.max(
        0,
        source.sideState.combatCharge - effect.amount
      );
      return;
    case "SendToVoid":
    case "ReturnFromVoid":
    case "MoveUnit":
    case "Attach":
    case "Detach":
    case "CopyTechnique":
    case "InterruptTechnique":
    case "MillToAshes":
      addWarning(
        state,
        "UNIMPLEMENTED_EFFECT",
        `${effect.type} is schema-ready but not implemented in the MVP simulator.`
      );
      return;
  }
};
