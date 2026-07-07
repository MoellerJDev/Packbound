import type { CombatResult } from "@packbound/sim";

export type CombatForecastTone = "favored" | "close" | "danger";

export type CombatForecastView = {
  readonly label: "Favored" | "Close fight" | "Danger";
  readonly tone: CombatForecastTone;
  readonly summaryText: string;
  readonly pressureText: string;
  readonly shapeText: string;
  readonly warningsText: string;
};

const battleShapeText = (eventCount: number): string => {
  if (eventCount >= 80) {
    return "Long exchange";
  }

  if (eventCount >= 30) {
    return "Developing fight";
  }

  return "Quick clash";
};

const pressureText = (incomingDamage: number): string => {
  if (incomingDamage >= 2) {
    return "High pressure";
  }

  if (incomingDamage === 1) {
    return "Some pressure";
  }

  return "Low pressure";
};

export const buildCombatForecastView = (combat: CombatResult): CombatForecastView => {
  if (combat.winner === "playerB" || combat.damageToPlayerA >= 2) {
    return {
      label: "Danger",
      tone: "danger",
      summaryText: "Enemy pressure looks high. Tune the board before committing.",
      pressureText: pressureText(combat.damageToPlayerA),
      shapeText: battleShapeText(combat.events.length),
      warningsText: combat.warnings.length > 0 ? "Check setup" : "No setup warnings"
    };
  }

  if (combat.winner === "draw" || combat.damageToPlayerA === combat.damageToPlayerB) {
    return {
      label: "Close fight",
      tone: "close",
      summaryText: "The exchange looks close. Small loadout edits may matter.",
      pressureText: pressureText(combat.damageToPlayerA),
      shapeText: battleShapeText(combat.events.length),
      warningsText: combat.warnings.length > 0 ? "Check setup" : "No setup warnings"
    };
  }

  return {
    label: "Favored",
    tone: "favored",
    summaryText: "Your board looks favored if the fight starts from here.",
    pressureText: pressureText(combat.damageToPlayerA),
    shapeText: battleShapeText(combat.events.length),
    warningsText: combat.warnings.length > 0 ? "Check setup" : "No setup warnings"
  };
};
