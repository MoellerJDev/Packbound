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

const formatTrigger = (trigger: Trigger): string => {
  switch (trigger.type) {
    case "AfterSeconds":
      return `after ${trigger.seconds}s`;
    case "WhenCombatChargeAtLeast":
      return `when combat Charge reaches ${trigger.amount}`;
    case "WhenFirstAllyBelowHealthPercent":
      return `when first ally drops below ${trigger.percent}% health`;
    case "OnCombatStart":
      return "at combat start";
    case "OnCombatEnd":
      return "at combat end";
    case "OnEntry":
      return "on entry";
    case "OnLeaveBoard":
      return "on leaving board";
    case "OnDestroyed":
      return "when destroyed";
    case "OnOffered":
      return "when Offered";
    case "OnAllyDestroyed":
      return "when an ally is destroyed";
    case "OnEnemyDestroyed":
      return "when an enemy is destroyed";
    case "OnSummoned":
      return "when summoned";
    case "OnTechniqueUsed":
      return "when a Technique is used";
    case "OnTakeDamage":
      return "when taking damage";
    case "OnDealDamage":
      return "when dealing damage";
    case "OnAttack":
      return "on attack";
    case "OnKill":
      return "on kill";
    case "OnCombatChargeGained":
      return "when combat Charge is gained";
    case "WhenFirstAllyDestroyed":
      return "when the first ally is destroyed";
    case "WhenFirstEnemyDestroyed":
      return "when the first enemy is destroyed";
    case "WhenFirstEnemyUsesTechnique":
      return "when the first enemy uses a Technique";
  }
};

const formatTarget = (target: TargetSelector): string => {
  switch (target.type) {
    case "Self":
      return "self";
    case "Source":
      return "source";
    case "NearestEnemy":
      return "nearest enemy";
    case "LowestHealthAlliedUnit":
      return "lowest-health ally";
    case "LowestHealthEnemy":
      return "lowest-health enemy";
    case "HighestAttackEnemy":
      return "highest-attack enemy";
    case "RandomEnemy":
      return "random enemy";
    case "AdjacentAllied":
      return "adjacent allies";
    case "AdjacentEnemy":
      return "adjacent enemy";
    case "SameRowEnemy":
      return "same-row enemy";
    case "SameColumnEnemy":
      return "same-column enemy";
    case "AllAllied":
      return "all allies";
    case "AllEnemies":
      return "all enemies";
    case "AlliedUnitWithTag":
      return `allied ${target.tag}`;
    case "EnemyUnitWithTag":
      return `enemy ${target.tag}`;
    case "EmptyAdjacentTile":
      return "empty adjacent tile";
    case "EmptyBacklineTile":
      return "empty backline tile";
    case "CardInAshes":
      return target.maxChargeCost
        ? `card in Ashes costing ${target.maxChargeCost} or less`
        : "card in Ashes";
    case "CardInVoid":
      return "card in Void";
  }
};

const formatEffect = (effect: AbilityEffect, catalog: ContentCatalog): string => {
  switch (effect.type) {
    case "DealDamage":
      return `deal ${effect.amount} damage`;
    case "Heal":
      return `heal ${effect.amount}`;
    case "ModifyStats": {
      const stats = [
        effect.attack ? `${effect.attack > 0 ? "+" : ""}${effect.attack} attack` : "",
        effect.health ? `${effect.health > 0 ? "+" : ""}${effect.health} health` : "",
        effect.attackSpeed
          ? `${effect.attackSpeed > 0 ? "+" : ""}${effect.attackSpeed} attack speed`
          : ""
      ].filter((part) => part.length > 0);
      return stats.length > 0 ? `modify stats: ${stats.join(", ")}` : "modify stats";
    }
    case "ApplyStatus":
      return `apply ${effect.status}`;
    case "RemoveStatus":
      return `remove ${effect.status}`;
    case "GrantKeyword":
      return `grant ${effect.keyword}`;
    case "RemoveKeyword":
      return `remove ${effect.keyword}`;
    case "SummonEcho":
    case "SummonUnit":
      return `summon ${catalog.cardsById.get(effect.cardDefId)?.name ?? effect.cardDefId} (${effect.placement})`;
    case "Offer":
      return "Offer the target";
    case "Destroy":
      return "destroy the target";
    case "Phase":
      return `Phase for ${effect.delayMs}ms`;
    case "Recall":
      return `Recall a card${effect.maxChargeCost ? ` costing ${effect.maxChargeCost} or less` : ""}`;
    case "GainCombatCharge":
      return `gain ${effect.amount} combat Charge`;
    case "DrainCombatCharge":
      return `drain ${effect.amount} combat Charge`;
    case "SendToVoid":
    case "ReturnFromVoid":
    case "MoveUnit":
    case "Attach":
    case "Detach":
    case "CopyTechnique":
    case "InterruptTechnique":
    case "MillToAshes":
      return effect.type;
  }
};

const formatAbility = (ability: AbilityDefinition, catalog: ContentCatalog): string =>
  `${formatTrigger(ability.trigger)}: ${formatEffect(ability.effect, catalog)} on ${formatTarget(
    ability.target
  )}`;

const formatTechnique = (
  def: CardDefinition,
  catalog: ContentCatalog
): string | undefined =>
  def.cardType === "Technique"
    ? `${def.technique.combatChargeCost} combat Charge, ${formatTrigger(
        def.technique.trigger
      )}: ${formatEffect(def.technique.effect, catalog)} on ${formatTarget(
        def.technique.target
      )}`
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
