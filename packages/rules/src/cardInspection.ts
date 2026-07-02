import type { ContentCatalog } from "@packbound/content";
import {
  chargeCostTotal,
  type AbilityDefinition,
  type AbilityEffect,
  type Aspect,
  type BoardPlacement,
  type BoardPosition,
  type CardDefinition,
  type CardDesignMetadata,
  type CardInstance,
  type CardInstanceId,
  type CardType,
  type Keyword,
  type TargetSelector,
  type Trigger,
  type Zone
} from "@packbound/shared";

import {
  canAddCardToSourceRow,
  canAddCardToSpellrail,
  canPlaceCardOnBoard,
  getDefaultBoardPositionForCard,
  getLegalLoadoutActions,
  type LoadoutAction
} from "./loadout";
import type { RunState } from "./runState";

export type CardInspectionAction = {
  readonly type: "placeOnBoard" | "addToSourceRow" | "addToSpellrail" | "returnToPool";
  readonly label: string;
  readonly reason?: string;
};

export type CardInspection = {
  readonly cardInstanceId?: CardInstanceId;
  readonly defId: CardDefinition["id"];
  readonly name: string;
  readonly cardType: CardType;
  readonly zone?: Zone | "encounter";
  readonly aspects: readonly Aspect[];
  readonly aspectText: string;
  readonly costText: string;
  readonly statsText?: string;
  readonly sourceText?: string;
  readonly techniqueText?: string;
  readonly keywords: readonly Keyword[];
  readonly rulesText?: string;
  readonly abilityText: readonly string[];
  readonly design?: CardDesignMetadata;
  readonly designText?: string;
  readonly tags: readonly string[];
  readonly traitIds: readonly string[];
  readonly traitNames: readonly string[];
  readonly legalActions: readonly CardInspectionAction[];
  readonly blockedReasons: readonly string[];
};

export type InspectRunCardInput = {
  readonly catalog: ContentCatalog;
  readonly run: RunState;
  readonly cardInstanceId: CardInstanceId;
};

export type InspectEncounterCardInput = {
  readonly catalog: ContentCatalog;
  readonly placement?: BoardPlacement;
  readonly card?: CardInstance;
  readonly defId?: CardDefinition["id"];
};

const unique = (values: readonly string[]): readonly string[] =>
  [...new Set(values)].filter((value) => value.length > 0);

const activeCardFromPlacement = (placement: BoardPlacement): CardInstance => ({
  instanceId: placement.cardInstanceId,
  defId: placement.defId,
  ownerId: placement.ownerId,
  zone: "board",
  modifiers: [],
  upgradeLevel: 0
});

const findRunCard = (
  run: RunState,
  cardInstanceId: CardInstanceId
): CardInstance | undefined => {
  const placement = run.board.placements.find(
    (candidate) => candidate.cardInstanceId === cardInstanceId
  );
  if (placement) {
    return (
      run.activeCards.find((card) => card.instanceId === cardInstanceId) ??
      activeCardFromPlacement(placement)
    );
  }

  return [
    ...run.pool,
    ...run.sourceRow.cards,
    ...run.spellrail.cards,
    ...run.ashes,
    ...run.void
  ].find((card) => card.instanceId === cardInstanceId);
};

export const formatAspects = (aspects: readonly Aspect[]): string =>
  aspects.length > 0 ? aspects.join(", ") : "None";

export const formatChargeCost = (def: CardDefinition): string => {
  if (!def.cost) {
    return "No board Charge cost";
  }

  const parts: string[] = [];
  if (def.cost.generic > 0) {
    parts.push(`${def.cost.generic} generic`);
  }
  for (const [aspect, amount] of Object.entries(def.cost.aspect ?? {}).sort()) {
    if (amount > 0) {
      parts.push(`${amount} ${aspect}`);
    }
  }

  const total = chargeCostTotal(def.cost);
  return `${total} Charge${parts.length > 0 ? ` (${parts.join(", ")})` : ""}`;
};

const formatStats = (def: CardDefinition): string | undefined =>
  def.cardType === "Unit" || def.cardType === "Echo"
    ? `${def.stats.attack} ATK / ${def.stats.health} HP / ${def.stats.attackSpeed} speed / ${def.stats.range} range`
    : undefined;

const formatSource = (def: CardDefinition): string | undefined =>
  def.cardType === "Source"
    ? `+${def.source.boardChargeCapacity} board Charge, ${formatAspects(
        def.source.aspectAccess
      )} access, ${def.source.combatChargePerSecond} combat Charge/sec`
    : undefined;

const formatNumber = (value: number): string => `${Number(value.toFixed(4))}`;

const formatTrigger = (trigger: Trigger): string => {
  switch (trigger.type) {
    case "AfterSeconds":
      return `After ${formatNumber(trigger.seconds)}s`;
    case "WhenCombatChargeAtLeast":
      return `When combat Charge reaches ${trigger.amount}`;
    case "WhenFirstAllyBelowHealthPercent":
      return `When the first ally drops below ${trigger.percent}% health`;
    case "OnCombatStart":
      return "At combat start";
    case "OnCombatEnd":
      return "At combat end";
    case "OnEntry":
      return "On entry";
    case "OnLeaveBoard":
      return "When leaving board";
    case "OnDestroyed":
      return "When destroyed";
    case "OnOffered":
      return "When Offered";
    case "OnAllyDestroyed":
      return "When another ally is destroyed";
    case "OnEnemyDestroyed":
      return "When an enemy is destroyed";
    case "OnSummoned":
      return "When summoned";
    case "OnTechniqueUsed":
      return "When a Technique is used";
    case "OnTakeDamage":
      return "When taking damage";
    case "OnDealDamage":
      return "When dealing damage";
    case "OnAttack":
      return "On attack";
    case "OnKill":
      return "On kill";
    case "OnCombatChargeGained":
      return "When combat Charge is gained";
    case "WhenFirstAllyDestroyed":
      return "When your first ally is destroyed each combat";
    case "WhenFirstEnemyDestroyed":
      return "When the first enemy is destroyed each combat";
    case "WhenFirstEnemyUsesTechnique":
      return "When the first enemy uses a Technique";
  }
};

const formatTarget = (target: TargetSelector): string => {
  switch (target.type) {
    case "Self":
      return "itself";
    case "Source":
      return "the source";
    case "NearestEnemy":
      return "the nearest enemy";
    case "LowestHealthAlliedUnit":
      return "the lowest-health ally";
    case "LowestHealthEnemy":
      return "the lowest-health enemy";
    case "HighestAttackEnemy":
      return "the highest-attack enemy";
    case "RandomEnemy":
      return "a random enemy";
    case "AdjacentAllied":
      return "an adjacent ally";
    case "AdjacentEnemy":
      return "an adjacent enemy";
    case "SameRowEnemy":
      return "same-row enemies";
    case "SameColumnEnemy":
      return "same-column enemies";
    case "AllAllied":
      return "all allies";
    case "AllEnemies":
      return "all enemies";
    case "AlliedUnitWithTag":
      return `an allied ${target.tag}`;
    case "EnemyUnitWithTag":
      return `an enemy ${target.tag}`;
    case "EmptyAdjacentTile":
      return "an empty adjacent tile";
    case "EmptyBacklineTile":
      return "an empty backline tile";
    case "CardInAshes":
      return target.maxChargeCost
        ? `a card in Ashes costing ${target.maxChargeCost} or less`
        : "a card in Ashes";
    case "CardInVoid":
      return "a card in Void";
  }
};

const formatPlacement = (
  placement: Extract<
    AbilityEffect,
    { readonly type: "SummonEcho" | "SummonUnit" }
  >["placement"]
): string => {
  switch (placement) {
    case "AdjacentToSource":
      return "an open adjacent tile";
    case "Backline":
      return "the backline";
    case "FirstOpen":
      return "the first open tile";
  }
};

const costLimitText = (maxChargeCost: number | undefined): string =>
  maxChargeCost === undefined ? "" : ` costing ${maxChargeCost} or less`;

const formatEffect = (
  effect: AbilityEffect,
  target: TargetSelector,
  catalog: ContentCatalog
): string => {
  const targetText = formatTarget(target);
  switch (effect.type) {
    case "DealDamage":
      return `Deal ${effect.amount} damage to ${targetText}.`;
    case "Heal":
      return `Heal ${targetText} for ${effect.amount}.`;
    case "ModifyStats": {
      const stats = [
        effect.attack ? `${effect.attack > 0 ? "+" : ""}${effect.attack} attack` : "",
        effect.health ? `${effect.health > 0 ? "+" : ""}${effect.health} health` : "",
        effect.attackSpeed
          ? `${effect.attackSpeed > 0 ? "+" : ""}${effect.attackSpeed} attack speed`
          : ""
      ].filter((part) => part.length > 0);
      return stats.length > 0
        ? `Give ${targetText} ${stats.join(", ")}.`
        : `Modify ${targetText}.`;
    }
    case "ApplyStatus":
      return `Apply ${effect.status} to ${targetText}.`;
    case "RemoveStatus":
      return `Remove ${effect.status} from ${targetText}.`;
    case "GrantKeyword":
      return `Grant ${effect.keyword} to ${targetText}.`;
    case "RemoveKeyword":
      return `Remove ${effect.keyword} from ${targetText}.`;
    case "SummonEcho":
    case "SummonUnit":
      return `Summon ${catalog.cardsById.get(effect.cardDefId)?.name ?? effect.cardDefId} to ${formatPlacement(effect.placement)}.`;
    case "Offer":
      return `Offer ${targetText}.`;
    case "Destroy":
      return `Destroy ${targetText}.`;
    case "Phase":
      return `Phase ${targetText} for ${effect.delayMs}ms.`;
    case "Recall":
      return `Recall a Unit from Ashes${costLimitText(effect.maxChargeCost)}.`;
    case "GainCombatCharge":
      return `Gain ${effect.amount} combat Charge.`;
    case "DrainCombatCharge":
      return `Drain ${effect.amount} combat Charge.`;
    case "SendToVoid":
    case "ReturnFromVoid":
    case "MoveUnit":
    case "Attach":
    case "Detach":
    case "CopyTechnique":
    case "InterruptTechnique":
    case "MillToAshes":
      return `${effect.type}.`;
  }
};

const formatAbility = (ability: AbilityDefinition, catalog: ContentCatalog): string =>
  `${formatTrigger(ability.trigger)}: ${formatEffect(
    ability.effect,
    ability.target,
    catalog
  )}`;

const formatTechnique = (
  def: CardDefinition,
  catalog: ContentCatalog
): string | undefined =>
  def.cardType === "Technique"
    ? `${def.technique.combatChargeCost} combat Charge, ${formatTrigger(
        def.technique.trigger
      )}: ${formatEffect(def.technique.effect, def.technique.target, catalog)}`
    : undefined;

const formatDesign = (design: CardDesignMetadata | undefined): string | undefined =>
  design
    ? `${design.role}; archetypes: ${design.archetypes.join(", ") || "none"}; complexity ${design.complexity}; mechanics: ${design.mechanicTags.join(", ") || "none"}`
    : undefined;

const actionFromLoadoutAction = (action: LoadoutAction): CardInspectionAction => ({
  type: action.type,
  label: action.label
});

const checkReason = (
  label: string,
  check: { readonly ok: true } | { readonly ok: false; readonly reason: string }
): string | undefined => (check.ok ? undefined : `${label}: ${check.reason}`);

const fallbackPosition = (def: CardDefinition): BoardPosition => ({
  row: 0,
  col: 0,
  layer: def.cardType === "Relic" || def.cardType === "Field" ? "support" : "ground"
});

const legalActionInfo = (
  run: RunState | undefined,
  catalog: ContentCatalog,
  card: CardInstance | undefined,
  def: CardDefinition
): {
  readonly legalActions: readonly CardInspectionAction[];
  readonly blockedReasons: readonly string[];
} => {
  if (!run || !card) {
    return { legalActions: [], blockedReasons: [] };
  }

  const active =
    run.board.placements.some(
      (placement) => placement.cardInstanceId === card.instanceId
    ) ||
    run.sourceRow.cards.some((candidate) => candidate.instanceId === card.instanceId) ||
    run.spellrail.cards.some((candidate) => candidate.instanceId === card.instanceId);

  if (active) {
    if (run.status !== "active" || run.phase !== "planning") {
      return {
        legalActions: [],
        blockedReasons: ["Return to Pool: Loadout can only be edited during planning."]
      };
    }
    return {
      legalActions: [
        {
          type: "returnToPool",
          label: "Return to Pool",
          reason: "Card is already active and can be returned to the pool."
        }
      ],
      blockedReasons: []
    };
  }

  const legalActions = getLegalLoadoutActions(run, catalog, card.instanceId).map(
    actionFromLoadoutAction
  );
  const defaultPosition =
    getDefaultBoardPositionForCard(run, catalog, card.instanceId) ??
    fallbackPosition(def);
  const blockedReasons = unique([
    checkReason(
      "Place on Board",
      canPlaceCardOnBoard(run, catalog, card.instanceId, defaultPosition)
    ) ?? "",
    checkReason(
      "Add to Source Row",
      canAddCardToSourceRow(run, catalog, card.instanceId)
    ) ?? "",
    checkReason(
      "Add to Spellrail",
      canAddCardToSpellrail(run, catalog, card.instanceId)
    ) ?? ""
  ]);

  return { legalActions, blockedReasons };
};

const inspectDefinition = (
  catalog: ContentCatalog,
  def: CardDefinition,
  options: {
    readonly card?: CardInstance;
    readonly run?: RunState;
    readonly zone?: Zone | "encounter";
  } = {}
): CardInspection => {
  const actionInfo = legalActionInfo(options.run, catalog, options.card, def);
  const statsText = formatStats(def);
  const sourceText = formatSource(def);
  const techniqueText = formatTechnique(def, catalog);
  const designText = formatDesign(def.design);
  const traitIds = def.traits ?? [];
  const traitNames = traitIds.map(
    (traitId) => catalog.traitsById.get(traitId)?.name ?? traitId
  );

  return {
    ...(options.card ? { cardInstanceId: options.card.instanceId } : {}),
    defId: def.id,
    name: def.name,
    cardType: def.cardType,
    ...(options.zone ? { zone: options.zone } : {}),
    aspects: def.aspects,
    aspectText: formatAspects(def.aspects),
    costText: formatChargeCost(def),
    ...(statsText ? { statsText } : {}),
    ...(sourceText ? { sourceText } : {}),
    ...(techniqueText ? { techniqueText } : {}),
    keywords: def.keywords,
    ...(def.rulesText ? { rulesText: def.rulesText } : {}),
    abilityText: def.abilities.map((ability) => formatAbility(ability, catalog)),
    ...(def.design ? { design: def.design } : {}),
    ...(designText ? { designText } : {}),
    tags: def.tags,
    traitIds,
    traitNames,
    legalActions: actionInfo.legalActions,
    blockedReasons: actionInfo.blockedReasons
  };
};

export const inspectRunCard = ({
  catalog,
  run,
  cardInstanceId
}: InspectRunCardInput): CardInspection | undefined => {
  const card = findRunCard(run, cardInstanceId);
  if (!card) {
    return undefined;
  }
  const def = catalog.cardsById.get(card.defId);
  if (!def) {
    return undefined;
  }

  return inspectDefinition(catalog, def, {
    card,
    run,
    zone: card.zone
  });
};

export const inspectEncounterCard = ({
  catalog,
  placement,
  card,
  defId
}: InspectEncounterCardInput): CardInspection | undefined => {
  const encounterCard =
    card ?? (placement ? activeCardFromPlacement(placement) : undefined);
  const resolvedDefId = defId ?? encounterCard?.defId ?? placement?.defId;
  if (!resolvedDefId) {
    return undefined;
  }
  const def = catalog.cardsById.get(resolvedDefId);
  if (!def) {
    return undefined;
  }

  return inspectDefinition(catalog, def, {
    ...(encounterCard ? { card: encounterCard } : {}),
    zone: "encounter"
  });
};
