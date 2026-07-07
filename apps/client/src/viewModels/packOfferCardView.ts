import type { ContentCatalog } from "@packbound/content";
import {
  buildLoadoutResourceSummary,
  canAddCardToSourceRow,
  canAddCardToSpellrail,
  canPlaceCardOnBoard,
  cardInZone,
  getDefaultBoardPositionForCard,
  inspectEncounterCard,
  type PendingPackOffer,
  type RunState
} from "@packbound/rules";
import {
  asCardInstanceId,
  type CardDefId,
  type CardInstance,
  type CardInstanceId,
  type CardType
} from "@packbound/shared";

export type PackOfferFitTone = "positive" | "warning" | "neutral";

export type PackOfferCardView = {
  readonly cardInstanceId: CardInstanceId;
  readonly defId: CardDefId;
  readonly name: string;
  readonly cardType: CardType | "Unknown";
  readonly metaText: string;
  readonly costText: string;
  readonly statsText?: string;
  readonly effectText?: string;
  readonly fitText: string;
  readonly fitTone: PackOfferFitTone;
  readonly detailLines: readonly string[];
};

export type BuildPackOfferCardViewsInput = {
  readonly catalog: ContentCatalog;
  readonly offer: PendingPackOffer;
  readonly run: RunState;
};

const boardCardTypes: readonly CardType[] = ["Unit", "Echo", "Relic", "Field"];

const compactList = (values: readonly string[], fallback: string): string =>
  values.length > 0 ? values.slice(0, 3).join(", ") : fallback;

const offerCardAsPoolCard = (card: CardInstance): CardInstance =>
  cardInZone(card, "pool");

const runWithOfferCardInPool = (run: RunState, card: CardInstance): RunState => ({
  ...run,
  pool: [
    ...run.pool.filter((candidate) => candidate.instanceId !== card.instanceId),
    offerCardAsPoolCard(card)
  ]
});

const primaryEffectText = (
  inspection: NonNullable<ReturnType<typeof inspectEncounterCard>>
): string | undefined =>
  inspection.sourceText ??
  inspection.techniqueText ??
  inspection.rulesText ??
  inspection.abilityText[0];

const boardFitCopy = ({
  catalog,
  card,
  cardName,
  run
}: {
  readonly catalog: ContentCatalog;
  readonly card: CardInstance;
  readonly cardName: string;
  readonly run: RunState;
}): Pick<PackOfferCardView, "fitText" | "fitTone"> => {
  const projectedRun = runWithOfferCardInPool(run, card);
  const defaultPosition = getDefaultBoardPositionForCard(
    projectedRun,
    catalog,
    card.instanceId
  );
  if (!defaultPosition) {
    return {
      fitText: "Likely blocked: no open ground/support cell for this card right now.",
      fitTone: "warning"
    };
  }

  const check = canPlaceCardOnBoard(
    projectedRun,
    catalog,
    card.instanceId,
    defaultPosition
  );
  if (check.ok) {
    return {
      fitText: `If picked: ${cardName} looks placeable on the current Board.`,
      fitTone: "positive"
    };
  }

  if (check.reason.includes("Board uses") || check.reason.includes("Board Charge")) {
    return {
      fitText: `Likely blocked: ${check.reason} Add Source capacity or return a board card before using this pick.`,
      fitTone: "warning"
    };
  }

  if (check.reason.includes("requires") && check.reason.includes("access")) {
    return {
      fitText: `Likely blocked: ${check.reason} Add matching Source access before using this pick.`,
      fitTone: "warning"
    };
  }

  return {
    fitText: `Likely blocked: ${check.reason}`,
    fitTone: "warning"
  };
};

const sourceFitCopy = ({
  catalog,
  card,
  run
}: {
  readonly catalog: ContentCatalog;
  readonly card: CardInstance;
  readonly run: RunState;
}): Pick<PackOfferCardView, "fitText" | "fitTone"> => {
  const projectedRun = runWithOfferCardInPool(run, card);
  const check = canAddCardToSourceRow(projectedRun, catalog, card.instanceId);
  const resources = buildLoadoutResourceSummary(run, catalog);
  const def = catalog.cardsById.get(card.defId);

  if (check.ok && def?.cardType === "Source") {
    return {
      fitText: `If picked: add to Source Row for +${def.source.boardChargeCapacity} Board Charge, ${compactList(
        def.source.aspectAccess,
        "no Aspect"
      )} access, and +${def.source.combatChargePerSecond} Combat Charge/sec. Source slots ${resources.sourceSlotsText}.`,
      fitTone: "positive"
    };
  }

  return {
    fitText: `Likely blocked: ${check.ok ? "Source Row action is unavailable." : check.reason} Source slots ${resources.sourceSlotsText}.`,
    fitTone: "warning"
  };
};

const techniqueFitCopy = ({
  catalog,
  card,
  run
}: {
  readonly catalog: ContentCatalog;
  readonly card: CardInstance;
  readonly run: RunState;
}): Pick<PackOfferCardView, "fitText" | "fitTone"> => {
  const projectedRun = runWithOfferCardInPool(run, card);
  const check = canAddCardToSpellrail(projectedRun, catalog, card.instanceId);
  const spellrailSlotsText = `${run.spellrail.cards.length} / ${run.spellrail.maxSlots}`;

  if (check.ok) {
    return {
      fitText: `If picked: can add to Spellrail now. Techniques use Spellrail slots ${spellrailSlotsText}.`,
      fitTone: "positive"
    };
  }

  return {
    fitText: `Likely blocked: ${check.reason} Spellrail slots ${spellrailSlotsText}.`,
    fitTone: "warning"
  };
};

const fitCopyForCard = ({
  catalog,
  card,
  cardName,
  cardType,
  run
}: {
  readonly catalog: ContentCatalog;
  readonly card: CardInstance;
  readonly cardName: string;
  readonly cardType: CardType;
  readonly run: RunState;
}): Pick<PackOfferCardView, "fitText" | "fitTone"> => {
  if (cardType === "Source") {
    return sourceFitCopy({ catalog, card, run });
  }

  if (cardType === "Technique") {
    return techniqueFitCopy({ catalog, card, run });
  }

  if (boardCardTypes.includes(cardType)) {
    return boardFitCopy({ catalog, card, cardName, run });
  }

  return {
    fitText:
      "No immediate loadout action yet. Inspect after picking to see future-use context.",
    fitTone: "neutral"
  };
};

const missingCardView = (card: CardInstance): PackOfferCardView => ({
  cardInstanceId: card.instanceId,
  defId: card.defId,
  name: card.defId,
  cardType: "Unknown",
  metaText: "Unknown card definition",
  costText: "Cost unknown",
  fitText: "Cannot evaluate fit because this card definition is missing.",
  fitTone: "warning",
  detailLines: [`Missing definition: ${card.defId}`]
});

export const buildPackOfferCardViews = ({
  catalog,
  offer,
  run
}: BuildPackOfferCardViewsInput): readonly PackOfferCardView[] =>
  offer.cards.map((card) => {
    const inspection = inspectEncounterCard({ catalog, card });
    if (!inspection) {
      return missingCardView(card);
    }

    const traitOrTagText =
      inspection.traitNames.length > 0
        ? `Traits: ${compactList(inspection.traitNames, "None")}`
        : `Tags: ${compactList(inspection.tags, "None")}`;
    const effectText = primaryEffectText(inspection);
    const fit = fitCopyForCard({
      catalog,
      card,
      cardName: inspection.name,
      cardType: inspection.cardType,
      run
    });
    const detailLines = [
      inspection.sourceText ? `Source: ${inspection.sourceText}` : "",
      inspection.techniqueText ? `Technique: ${inspection.techniqueText}` : "",
      inspection.rulesText ? `Rules: ${inspection.rulesText}` : "",
      ...inspection.abilityText.map((line) => `Ability: ${line}`)
    ].filter((line) => line.length > 0);

    return {
      cardInstanceId: card.instanceId,
      defId: card.defId,
      name: inspection.name,
      cardType: inspection.cardType,
      metaText: `${inspection.cardType} | ${inspection.aspectText} | ${traitOrTagText}`,
      costText: inspection.costText,
      ...(inspection.statsText ? { statsText: inspection.statsText } : {}),
      ...(effectText ? { effectText } : {}),
      ...fit,
      detailLines:
        detailLines.length > 0
          ? detailLines
          : ["No extra rules text on this prototype card."]
    };
  });

export const emptyPackOfferCardView = (
  cardInstanceId: CardInstanceId = asCardInstanceId("missing-offer-card")
): PackOfferCardView => ({
  cardInstanceId,
  defId: "missing-card" as CardDefId,
  name: "Unknown card",
  cardType: "Unknown",
  metaText: "Unknown card definition",
  costText: "Cost unknown",
  fitText: "Cannot evaluate fit because this card is missing from the offer view.",
  fitTone: "warning",
  detailLines: ["Missing offer card view."]
});
