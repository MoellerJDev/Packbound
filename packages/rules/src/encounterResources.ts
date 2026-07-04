import type { ContentCatalog } from "@packbound/content";
import type { CardInstanceId } from "@packbound/shared";

import type { RunState } from "./runState";

export type EncounterCombatChargeProfile = {
  readonly combatChargePerSecond: number;
  readonly startingCombatCharge: number;
  readonly sourceCount: number;
  readonly sourceCardInstanceIds: readonly CardInstanceId[];
  readonly sourceLabels: readonly string[];
  readonly ignoredCardInstanceIds: readonly CardInstanceId[];
  readonly explanation: string;
};

const formatNumber = (value: number): string => `${Number(value.toFixed(4))}`;

const plural = (count: number, singular: string, pluralForm = `${singular}s`): string =>
  count === 1 ? singular : pluralForm;

export const buildEncounterCombatChargeProfileForRun = (
  run: RunState,
  catalog: ContentCatalog
): EncounterCombatChargeProfile => {
  let combatChargePerSecond = 0;
  const sourceCardInstanceIds: CardInstanceId[] = [];
  const sourceLabels: string[] = [];
  const ignoredCardInstanceIds: CardInstanceId[] = [];

  for (const card of run.sourceRow.cards) {
    const def = catalog.cardsById.get(card.defId);
    if (def?.cardType !== "Source") {
      ignoredCardInstanceIds.push(card.instanceId);
      continue;
    }

    combatChargePerSecond += def.source.combatChargePerSecond;
    sourceCardInstanceIds.push(card.instanceId);
    sourceLabels.push(
      `${def.name} (${formatNumber(def.source.combatChargePerSecond)} Combat Charge/sec)`
    );
  }

  const roundedCombatChargePerSecond = Number(combatChargePerSecond.toFixed(4));
  const startingCombatCharge =
    roundedCombatChargePerSecond > 0 ? Math.ceil(roundedCombatChargePerSecond) : 0;
  const ignoredText =
    ignoredCardInstanceIds.length > 0
      ? ` Ignored ${ignoredCardInstanceIds.length} non-Source ${plural(
          ignoredCardInstanceIds.length,
          "card"
        )} in Source Row.`
      : "";
  const explanation =
    sourceCardInstanceIds.length > 0
      ? `${sourceCardInstanceIds.length} ${plural(
          sourceCardInstanceIds.length,
          "Source"
        )} ${
          sourceCardInstanceIds.length === 1 ? "contributes" : "contribute"
        } ${formatNumber(
          roundedCombatChargePerSecond
        )} Combat Charge/sec, rounded up to ${startingCombatCharge} starting Combat Charge.${ignoredText}`
      : `No valid Sources in Source Row; starting Combat Charge is 0.${ignoredText}`;

  return {
    combatChargePerSecond: roundedCombatChargePerSecond,
    startingCombatCharge,
    sourceCount: sourceCardInstanceIds.length,
    sourceCardInstanceIds,
    sourceLabels,
    ignoredCardInstanceIds,
    explanation
  };
};
