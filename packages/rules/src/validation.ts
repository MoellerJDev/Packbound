import type { ContentCatalog } from "@packbound/content";
import {
  ASPECTS,
  chargeCostTotal,
  isBoardPositionInBounds,
  positionKey,
  type Aspect,
  type BoardPlacement,
  type BoardState,
  type CardDefinition,
  type CardInstance,
  type CardInstanceId,
  type SourceCardDefinition,
  type SourceRowState,
  type SpellrailState,
  type ValidationError,
  type ValidationResult,
  type ValidationWarning
} from "@packbound/shared";

export type PlanningState = {
  readonly catalog: ContentCatalog;
  readonly board: BoardState;
  readonly sourceRow: SourceRowState;
  readonly spellrail: SpellrailState;
  readonly boardChargeSurcharges?: readonly PlanningBoardChargeSurcharge[];
};

export type PlanningBoardChargeSurcharge = {
  readonly amount: number;
  readonly label: string;
  readonly cardInstanceId?: CardInstanceId;
};

type MutableValidation = {
  readonly errors: ValidationError[];
  readonly warnings: ValidationWarning[];
};

const getDefinition = (
  catalog: ContentCatalog,
  card: CardInstance | BoardPlacement
): CardDefinition | undefined => catalog.cardsById.get(card.defId);

const getAspectRequirement = (
  card: CardDefinition
): Readonly<Partial<Record<Aspect, number>>> => card.cost?.aspect ?? {};

const sourceDefinitionForInstance = (
  catalog: ContentCatalog,
  source: CardInstance
): SourceCardDefinition | undefined => {
  const def = getDefinition(catalog, source);
  if (!def || def.cardType !== "Source") {
    return undefined;
  }
  return def;
};

const addError = (mutable: MutableValidation, error: ValidationError): void => {
  mutable.errors.push(error);
};

const validateSourceRow = (
  state: PlanningState,
  mutable: MutableValidation
): {
  readonly boardChargeCapacity: number;
  readonly aspectAccess: Readonly<Record<Aspect, number>>;
} => {
  if (state.sourceRow.cards.length > state.sourceRow.maxSlots) {
    addError(mutable, {
      code: "SOURCE_ROW_LIMIT_EXCEEDED",
      message: `Source Row has ${state.sourceRow.cards.length} cards but only ${state.sourceRow.maxSlots} slots.`
    });
  }

  const access: Record<Aspect, number> = {
    Ember: 0,
    Shade: 0,
    Bloom: 0,
    Tide: 0,
    Gleam: 0
  };
  let boardChargeCapacity = 0;

  for (const source of state.sourceRow.cards) {
    const def = sourceDefinitionForInstance(state.catalog, source);
    if (!def) {
      addError(mutable, {
        code: "INVALID_SOURCE_ROW_CARD",
        message: `${source.defId} is not a Source and cannot be installed in the Source Row.`,
        cardInstanceId: source.instanceId
      });
      continue;
    }

    boardChargeCapacity += def.source.boardChargeCapacity;
    for (const aspect of def.source.aspectAccess) {
      access[aspect] += 1;
    }
  }

  return { boardChargeCapacity, aspectAccess: access };
};

const validatePlacementLayer = (
  placement: BoardPlacement,
  def: CardDefinition,
  mutable: MutableValidation
): void => {
  const layer = placement.position.layer;
  const valid =
    ((def.cardType === "Unit" || def.cardType === "Echo") && layer === "ground") ||
    ((def.cardType === "Relic" || def.cardType === "Field") && layer === "support");

  if (!valid) {
    addError(mutable, {
      code: "ILLEGAL_BOARD_LAYER",
      message: `${def.name} cannot be placed on the ${layer} layer.`,
      cardInstanceId: placement.cardInstanceId,
      position: placement.position
    });
  }
};

const validateAspectAccess = (
  cards: readonly {
    readonly instance: CardInstance | BoardPlacement;
    readonly def: CardDefinition;
  }[],
  aspectAccess: Readonly<Record<Aspect, number>>,
  mutable: MutableValidation
): void => {
  for (const { instance, def } of cards) {
    const requirement = getAspectRequirement(def);

    for (const aspect of ASPECTS) {
      const required = requirement[aspect] ?? 0;
      if (required > aspectAccess[aspect]) {
        const cardInstanceId =
          "cardInstanceId" in instance ? instance.cardInstanceId : instance.instanceId;
        addError(mutable, {
          code: "MISSING_ASPECT_ACCESS",
          message: `${def.name} requires ${required} ${aspect} access, but the Source Row provides ${aspectAccess[aspect]}.`,
          cardInstanceId,
          ...("position" in instance ? { position: instance.position } : {})
        });
      }
    }
  }
};

export const validatePlanningState = (state: PlanningState): ValidationResult => {
  const mutable: MutableValidation = { errors: [], warnings: [] };
  const sourceInfo = validateSourceRow(state, mutable);

  const occupied = new Map<string, BoardPlacement>();
  const activeCards: {
    readonly instance: BoardPlacement;
    readonly def: CardDefinition;
  }[] = [];

  for (const placement of state.board.placements) {
    const def = getDefinition(state.catalog, placement);
    if (!def) {
      addError(mutable, {
        code: "UNKNOWN_BOARD_CARD",
        message: `Unknown card definition: ${placement.defId}`,
        cardInstanceId: placement.cardInstanceId,
        position: placement.position
      });
      continue;
    }

    if (!isBoardPositionInBounds(placement.position)) {
      addError(mutable, {
        code: "BOARD_POSITION_OUT_OF_BOUNDS",
        message: `${def.name} is outside the ${4}x${7} planning board.`,
        cardInstanceId: placement.cardInstanceId,
        position: placement.position
      });
    }

    const key = positionKey(placement.position);
    const existing = occupied.get(key);
    if (existing) {
      addError(mutable, {
        code: "BOARD_SLOT_OCCUPIED",
        message: `${def.name} overlaps another active card at ${key}.`,
        cardInstanceId: placement.cardInstanceId,
        position: placement.position
      });
    } else {
      occupied.set(key, placement);
    }

    validatePlacementLayer(placement, def, mutable);
    activeCards.push({ instance: placement, def });
  }

  const baseBoardChargeUsed = activeCards.reduce(
    (sum, entry) => sum + chargeCostTotal(entry.def.cost),
    0
  );
  const boardChargeSurcharges = state.boardChargeSurcharges ?? [];
  const boardChargeSurchargeUsed = boardChargeSurcharges.reduce(
    (sum, surcharge) => sum + Math.max(0, surcharge.amount),
    0
  );
  const boardChargeUsed = baseBoardChargeUsed + boardChargeSurchargeUsed;
  if (boardChargeUsed > sourceInfo.boardChargeCapacity) {
    const commanderTax = boardChargeSurcharges.find(
      (surcharge) => surcharge.label === "Commander Rebind Tax" && surcharge.amount > 0
    );
    addError(mutable, {
      code: "BOARD_CHARGE_EXCEEDED",
      message: commanderTax
        ? `Commander Rebind Tax requires ${boardChargeUsed} total Board Charge, but the Source Row provides ${sourceInfo.boardChargeCapacity}.`
        : `Board uses ${boardChargeUsed} Charge, but the Source Row provides ${sourceInfo.boardChargeCapacity}.`,
      ...(commanderTax?.cardInstanceId
        ? { cardInstanceId: commanderTax.cardInstanceId }
        : {})
    });
  }

  if (state.spellrail.cards.length > state.spellrail.maxSlots) {
    addError(mutable, {
      code: "SPELLRAIL_LIMIT_EXCEEDED",
      message: `Spellrail has ${state.spellrail.cards.length} Techniques but only ${state.spellrail.maxSlots} slots.`
    });
  }

  const spellrailCards: {
    readonly instance: CardInstance;
    readonly def: CardDefinition;
  }[] = [];

  for (const card of state.spellrail.cards) {
    const def = getDefinition(state.catalog, card);
    if (!def) {
      addError(mutable, {
        code: "UNKNOWN_SPELLRAIL_CARD",
        message: `Unknown card definition: ${card.defId}`,
        cardInstanceId: card.instanceId
      });
      continue;
    }

    if (def.cardType !== "Technique") {
      addError(mutable, {
        code: "INVALID_SPELLRAIL_CARD",
        message: `${def.name} is not a Technique and cannot be queued on the Spellrail.`,
        cardInstanceId: card.instanceId
      });
      continue;
    }

    spellrailCards.push({ instance: card, def });
  }

  validateAspectAccess(
    [...activeCards, ...spellrailCards],
    sourceInfo.aspectAccess,
    mutable
  );

  return {
    ok: mutable.errors.length === 0,
    errors: mutable.errors,
    warnings: mutable.warnings
  };
};
