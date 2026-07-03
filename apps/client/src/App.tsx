import { type ReactNode, useMemo, useState } from "react";

import { sampleCatalog } from "@packbound/content";
import {
  applyRunAction,
  buildBoardGridSummary,
  buildEngagementPreview,
  COMBAT_MODEL_FACTS,
  buildLoadoutResourceSummary,
  buildRewardOfferExplanations,
  buildRunTraitSummary,
  buildCombatantSetupForEncounter,
  buildCombatantSetupForRun,
  canApplyReward,
  canEditLoadout,
  canRecordCombat,
  createRunFromStarterKit,
  describeUpgradeProgressGroup,
  getCurrentEncounter,
  getCurrentRewardChoices,
  getLatestOpenedPackCardInstanceIds,
  getLegalLoadoutActions,
  getUpgradeProgressGroups,
  getRunPhase,
  getRunNextActionMessage,
  inspectEncounterCard,
  inspectRunCard,
  validateRunLoadout,
  type BoardGridCardSummary,
  type BoardGridSummary,
  type CardInspection,
  type CombatResultLike,
  type EngagementPreview,
  type EngagementPreviewSide,
  type LoadoutAction,
  type RunState,
  type TraitCount,
  type TraitSummary,
  type UpgradeProgressGroup
} from "@packbound/rules";
import {
  asPlayerId,
  type BoardPosition,
  type CardDefId,
  type CardInstanceId
} from "@packbound/shared";
import {
  buildCombatDisplaySummary,
  resolveCombat,
  type CombatDisplaySummary,
  type CombatResult
} from "@packbound/sim";

import { applyDebugScenario, debugScenarioFromSearch } from "./debugScenarios";

const playerId = asPlayerId("debug-player");
const runSeed = "client-debug-run";
const activeDebugScenarioId = debugScenarioFromSearch(window.location.search);

const cardName = (defId: CardDefId): string =>
  sampleCatalog.cardsById.get(defId)?.name ?? defId;

const combatResultForAction = (result: CombatResultLike): CombatResultLike => ({
  winner: result.winner,
  damageToPlayerA: result.damageToPlayerA,
  damageToPlayerB: result.damageToPlayerB,
  events: result.events,
  warnings: result.warnings,
  ...(result.seed ? { seed: result.seed } : {}),
  ...(result.rulesVersion ? { rulesVersion: result.rulesVersion } : {})
});

const createDebugRun = (starterKitId: string): RunState =>
  applyDebugScenario(
    applyRunAction(
      createRunFromStarterKit({
        seed: `${runSeed}:${starterKitId}`,
        catalog: sampleCatalog,
        starterKitId,
        playerId,
        maxRounds: 3
      }),
      sampleCatalog,
      { type: "prepareEncounter" }
    ),
    activeDebugScenarioId
  );

const firstStarterKitId = sampleCatalog.starterKits[0]?.id ?? "ember_scrappers";

type RecordedCombatDebug = {
  readonly round: number;
  readonly encounterId: string;
  readonly result: CombatResult;
};

type SelectedCardRef =
  | { readonly type: "run"; readonly cardInstanceId: CardInstanceId }
  | { readonly type: "encounterBoard"; readonly cardInstanceId: CardInstanceId }
  | { readonly type: "encounterSource"; readonly cardInstanceId: CardInstanceId }
  | { readonly type: "encounterSpellrail"; readonly cardInstanceId: CardInstanceId };

type AllySelectedCardRef = Extract<SelectedCardRef, { readonly type: "run" }>;
type EnemySelectedCardRef = Exclude<SelectedCardRef, AllySelectedCardRef>;
type BoardSelectedCardRef = Extract<
  SelectedCardRef,
  { readonly type: "run" | "encounterBoard" }
>;

const timeLabel = (timeMs?: number): string =>
  timeMs === undefined ? "--" : `${(timeMs / 1000).toFixed(1)}s`;

const optionalList = (values: readonly string[]): string =>
  values.length > 0 ? values.join(", ") : "None";

const UpgradeBadge = ({ level }: { readonly level: number }) =>
  level > 0 ? <span className="level-badge">Lv {level}</span> : null;

const upgradeProgressBadgeText = (
  group: UpgradeProgressGroup | undefined,
  cardInstanceId: CardInstanceId,
  zone: "pool" | "active"
): string | undefined => {
  if (!group) {
    return undefined;
  }

  if (group.cardType !== "Unit" && group.cardType !== "Echo") {
    return "duplicate";
  }

  if (zone === "active" || group.activeCardInstanceIds.includes(cardInstanceId)) {
    return "active copy";
  }

  return group.canUpgrade ? "ready" : `${group.poolCopies} / ${group.requiredCopies}`;
};

const UpgradeProgressBadge = ({
  group,
  cardInstanceId,
  zone
}: {
  readonly group: UpgradeProgressGroup | undefined;
  readonly cardInstanceId: CardInstanceId;
  readonly zone: "pool" | "active";
}) => {
  const text = upgradeProgressBadgeText(group, cardInstanceId, zone);
  if (!text) {
    return null;
  }

  return (
    <span className={`progress-badge ${text === "ready" ? "ready" : ""}`}>{text}</span>
  );
};

const CardInspectorView = ({
  inspection,
  emptyText,
  showLegalActions = true
}: {
  readonly inspection: CardInspection | undefined;
  readonly emptyText: string;
  readonly showLegalActions?: boolean;
}) => {
  if (!inspection) {
    return <p className="muted">{emptyText}</p>;
  }

  return (
    <div className="card-inspector">
      <div>
        <h3>{inspection.name}</h3>
        <p className="muted">
          {inspection.cardType} | {inspection.zone ?? "definition"} |{" "}
          {inspection.aspectText}
        </p>
      </div>
      <dl className="inspector-stats">
        <div>
          <dt>Cost</dt>
          <dd>{inspection.costText}</dd>
        </div>
        {inspection.statsText ? (
          <div>
            <dt>Stats</dt>
            <dd>{inspection.statsText}</dd>
          </div>
        ) : null}
        {inspection.upgradeText ? (
          <div>
            <dt>Upgrade</dt>
            <dd>{inspection.upgradeText}</dd>
          </div>
        ) : null}
        {inspection.upgradeBonusText ? (
          <div>
            <dt>Upgrade Bonus</dt>
            <dd>{inspection.upgradeBonusText}</dd>
          </div>
        ) : null}
        {inspection.sourceText ? (
          <div>
            <dt>Source</dt>
            <dd>{inspection.sourceText}</dd>
          </div>
        ) : null}
        {inspection.techniqueText ? (
          <div>
            <dt>Technique</dt>
            <dd>{inspection.techniqueText}</dd>
          </div>
        ) : null}
        <div>
          <dt>Keywords</dt>
          <dd>{optionalList(inspection.keywords)}</dd>
        </div>
        <div>
          <dt>Tags</dt>
          <dd>{optionalList(inspection.tags)}</dd>
        </div>
        <div>
          <dt>Traits</dt>
          <dd>{optionalList(inspection.traitNames)}</dd>
        </div>
      </dl>

      {inspection.combatStats ? (
        <div className="inspector-block">
          <h4>Combat Stats</h4>
          <div
            className="stat-chip-row"
            aria-label={`${inspection.name} combat stat chips`}
          >
            {inspection.combatStats.chips.map((chip) => (
              <span key={chip} className="stat-chip">
                {chip}
              </span>
            ))}
          </div>
          <dl className="combat-stat-details">
            {inspection.combatStats.details.map((detail) => (
              <div key={detail.label}>
                <dt>
                  {detail.label}: {detail.value}
                </dt>
                <dd>{detail.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {inspection.upgradeProgressText ? (
        <div className="inspector-block">
          <h4>Upgrade Progress</h4>
          <p>{inspection.upgradeProgressText}</p>
          {inspection.upgradeProgressDetails ? (
            <ul className="message-list compact">
              {inspection.upgradeProgressDetails.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {inspection.rulesText ? (
        <div className="inspector-block">
          <h4>Rules Text</h4>
          <p>{inspection.rulesText}</p>
        </div>
      ) : null}

      {inspection.abilityText.length > 0 ? (
        <div className="inspector-block">
          <h4>Abilities</h4>
          <ul className="message-list compact">
            {inspection.abilityText.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {inspection.design ? (
        <div className="inspector-block">
          <h4>Design</h4>
          <dl className="inspector-stats">
            <div>
              <dt>Role</dt>
              <dd>{inspection.design.role}</dd>
            </div>
            <div>
              <dt>Archetypes</dt>
              <dd>{optionalList(inspection.design.archetypes)}</dd>
            </div>
            <div>
              <dt>Complexity</dt>
              <dd>{inspection.design.complexity}</dd>
            </div>
            <div>
              <dt>Mechanics</dt>
              <dd>{optionalList(inspection.design.mechanicTags)}</dd>
            </div>
          </dl>
        </div>
      ) : null}

      {showLegalActions ? (
        <div className="inspector-block">
          <h4>Legal Actions</h4>
          {inspection.legalActions.length > 0 ? (
            <ul className="message-list compact">
              {inspection.legalActions.map((action) => (
                <li key={action.type}>
                  <strong>{action.label}</strong>
                  {action.reason ? (
                    <span className="muted"> - {action.reason}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No legal action from the current state.</p>
          )}
        </div>
      ) : null}

      {showLegalActions && inspection.blockedReasons.length > 0 ? (
        <div className="inspector-block">
          <h4>Blocked Reasons</h4>
          <ul className="message-list compact">
            {inspection.blockedReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

const CombatSummaryView = ({ summary }: { readonly summary: CombatDisplaySummary }) => (
  <div className="combat-summary">
    <div className="combat-summary-title">{summary.title}</div>
    <dl className="combat-summary-stats">
      <div>
        <dt>Damage to you</dt>
        <dd>{summary.damageToPlayerA}</dd>
      </div>
      <div>
        <dt>Damage to enemy</dt>
        <dd>{summary.damageToPlayerB}</dd>
      </div>
      <div>
        <dt>Events</dt>
        <dd>{summary.eventCount}</dd>
      </div>
      <div>
        <dt>Warnings</dt>
        <dd>
          {summary.warningCodes.length > 0 ? summary.warningCodes.join(", ") : "None"}
        </dd>
      </div>
    </dl>
    <ol className="combat-lines">
      {summary.lines.map((line, index) => (
        <li
          key={`${line.timeMs ?? "na"}:${line.kind}:${index}`}
          className={`combat-line ${line.severity ?? "info"}`}
        >
          <span className="combat-time">{timeLabel(line.timeMs)}</span>
          <span className="combat-kind">{line.kind}</span>
          <span>{line.text}</span>
        </li>
      ))}
    </ol>
  </div>
);

const RawDebugDetails = ({
  label,
  value
}: {
  readonly label: string;
  readonly value: unknown;
}) => (
  <details className="raw-debug">
    <summary>{label}</summary>
    <pre>{JSON.stringify(value, null, 2)}</pre>
  </details>
);

const traitProgressText = (trait: TraitCount): string => {
  const target =
    trait.nextThreshold?.count ?? trait.activeThreshold?.count ?? trait.count;
  return `${trait.count} / ${target}`;
};

const traitCardNames = (trait: TraitCount): string =>
  trait.cards.map((card) => card.cardName).join(", ");

const TraitListView = ({
  traits,
  emptyText
}: {
  readonly traits: readonly TraitCount[];
  readonly emptyText: string;
}) => {
  if (traits.length === 0) {
    return <p className="muted">{emptyText}</p>;
  }

  return (
    <ol className="trait-list">
      {traits.map((trait) => (
        <li key={trait.traitId}>
          <div className="trait-row-heading">
            <strong>{trait.name}</strong>
            <span>{traitProgressText(trait)}</span>
          </div>
          {trait.activeThreshold ? (
            <p>
              {trait.activeThreshold.label}: {trait.activeThreshold.description}
            </p>
          ) : trait.nextThreshold ? (
            <p>
              Next {trait.nextThreshold.label}: {trait.nextThreshold.description}
            </p>
          ) : null}
          <small>{traitCardNames(trait)}</small>
        </li>
      ))}
    </ol>
  );
};

const TraitSummaryView = ({ summary }: { readonly summary: TraitSummary }) => (
  <div className="trait-summary">
    <h3>Active</h3>
    <TraitListView traits={summary.activeTraits} emptyText="No active traits yet." />
    <h3>Near</h3>
    <TraitListView
      traits={summary.nearTraits}
      emptyText="No near-active traits from the current loadout."
    />
  </div>
);

const CombatModelFactsView = () => (
  <div className="combat-model-facts">
    <h3>Combat Model</h3>
    <ul className="message-list compact">
      {COMBAT_MODEL_FACTS.map((fact) => (
        <li key={fact.label}>
          <strong>{fact.label}:</strong> {fact.text}
        </li>
      ))}
    </ul>
  </div>
);

type BoardPlacementSummary = RunState["board"]["placements"][number];

const firstUnitOrEchoPlacement = (
  placements: readonly BoardPlacementSummary[]
): BoardPlacementSummary | undefined =>
  placements.find((placement) => {
    const def = sampleCatalog.cardsById.get(placement.defId);
    return def?.cardType === "Unit" || def?.cardType === "Echo";
  }) ?? placements[0];

const cardTypeClass = (card: BoardGridCardSummary): string =>
  `card-${card.cardType.toLowerCase()}`;

const compactCardName = (name: string): string => {
  if (name.length <= 16) {
    return name;
  }

  const words = name.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return `${words[0]} ${words
      .slice(1)
      .map((word) => word[0])
      .join("")}.`;
  }

  return `${name.slice(0, 13)}.`;
};

const boardStatChips = (card: BoardGridCardSummary): readonly string[] =>
  card.combatStats?.chips.slice(0, 4) ?? [];

const sameCoordinate = (
  left: Pick<BoardPosition, "row" | "col">,
  right: Pick<BoardPosition, "row" | "col">
): boolean => left.row === right.row && left.col === right.col;

const formatCoordinate = (position: Pick<BoardPosition, "row" | "col">): string =>
  `r${position.row} c${position.col}`;

const hexNoun = (count: number): string => (count === 1 ? "hex" : "hexes");

const previewReasonText = (reason: string | undefined): string => {
  switch (reason) {
    case "Nearest valid target.":
    case "Nearest valid enemy.":
      return "nearest valid enemy.";
    case "Guard is prioritized.":
      return "Guard enemy is prioritized.";
    case "AntiAir prioritizes Airborne targets.":
      return "AntiAir prioritizes Airborne targets.";
    case "Airborne attacker prioritizes lowest health before distance.":
      return "Airborne attacker prioritizes lowest health before distance.";
    case "No valid target.":
      return "no valid target.";
    case undefined:
      return "current targeting rules.";
    default:
      return reason;
  }
};

const previewSideForRef = (
  ref: BoardSelectedCardRef | undefined
): EngagementPreviewSide | undefined =>
  ref?.type === "run"
    ? "playerA"
    : ref?.type === "encounterBoard"
      ? "playerB"
      : undefined;

const EngagementPreviewPanel = ({ preview }: { readonly preview: EngagementPreview }) => {
  if (!preview.selected) {
    return (
      <div className="engagement-preview-panel" data-testid="engagement-preview">
        <h4>Engagement Preview</h4>
        <p>{preview.explanation[0] ?? "Select a board Unit or Echo."}</p>
      </div>
    );
  }

  const target = preview.likelyTarget;
  const statusLabel = target?.inRange
    ? "Attack now"
    : target
      ? "Out of range"
      : "No target";
  const headline = target
    ? target.inRange
      ? preview.selected.identity === "Ranged" && target.distance > 1
        ? `${preview.selected.name} can attack from ${target.distance} ${hexNoun(
            target.distance
          )} away.`
        : `${preview.selected.name} can attack ${target.name} now.`
      : `${preview.selected.name} cannot attack yet.`
    : `${preview.selected.name} has no valid target.`;

  return (
    <div className="engagement-preview-panel" data-testid="engagement-preview">
      <div className="engagement-preview-header">
        <h4>Engagement Preview</h4>
        <span
          className={`engagement-preview-status ${
            target?.inRange ? "in-range" : target ? "out-of-range" : "no-target"
          }`}
        >
          {statusLabel}
        </span>
      </div>
      <div className="engagement-preview-title">
        <strong>{preview.selected.name}</strong>
        <span>{preview.selected.identity}</span>
        <span>Range {preview.selected.range}</span>
      </div>
      <p className="engagement-preview-headline">{headline}</p>
      {target ? (
        <p>
          {target.inRange
            ? `Distance ${target.distance}, range ${preview.selected.range}.`
            : `Target is ${target.distance} ${hexNoun(target.distance)} away, range ${
                preview.selected.range
              }.`}
        </p>
      ) : null}
      {preview.nextMove ? (
        <p>
          Next move: {formatCoordinate(preview.nextMove.from)} to{" "}
          {formatCoordinate(preview.nextMove.to)}.
        </p>
      ) : preview.blockedMovementReason ? (
        <p>{preview.blockedMovementReason}</p>
      ) : null}
      <p>Likely target: {previewReasonText(preview.targetingReason)}</p>
    </div>
  );
};

const BoardGridView = ({
  boardSide,
  engagementPreview,
  summary,
  emptyText,
  onInspect,
  renderCardMeta,
  selectedCardInstanceId
}: {
  readonly boardSide: EngagementPreviewSide;
  readonly engagementPreview: EngagementPreview;
  readonly summary: BoardGridSummary;
  readonly emptyText: string;
  readonly onInspect: (card: BoardGridCardSummary) => void;
  readonly renderCardMeta?: (card: BoardGridCardSummary) => ReactNode;
  readonly selectedCardInstanceId?: CardInstanceId | undefined;
}) => {
  const occupiedCount = summary.cells.reduce(
    (count, cell) => count + cell.cards.length,
    0
  );
  const hasEngagementPreview = engagementPreview.selected !== undefined;
  const rows = Array.from({ length: summary.rows }, (_, row) =>
    summary.cells.filter((cell) => cell.row === row)
  );

  return (
    <div className="board-grid-wrap">
      <div
        className={`board-grid hex-board-grid offset-${summary.layout.offsetMode} ${
          hasEngagementPreview ? "has-preview" : ""
        }`}
        aria-label={`${summary.layout.offsetMode} offset hex board`}
      >
        {rows.map((rowCells, row) => (
          <div
            key={`row:${row}`}
            className={`board-grid-row ${rowCells[0]?.isOffsetRow ? "offset" : ""}`}
          >
            {rowCells.map((cell) => {
              const coordinate = { row: cell.row, col: cell.col };
              const isRangeCell =
                engagementPreview.selected?.side === boardSide &&
                engagementPreview.rangeCells.some((position) =>
                  sameCoordinate(position, coordinate)
                );
              const isSelectedCell =
                engagementPreview.selected?.side === boardSide &&
                sameCoordinate(engagementPreview.selected.position, coordinate);
              const isLikelyTargetCell =
                engagementPreview.likelyTarget?.side === boardSide &&
                sameCoordinate(engagementPreview.likelyTarget.position, coordinate);
              const isNextMoveCell =
                engagementPreview.selected?.side === boardSide &&
                engagementPreview.nextMove !== undefined &&
                sameCoordinate(engagementPreview.nextMove.to, coordinate);
              const isBlockedSelectedCell =
                isSelectedCell && engagementPreview.blockedMovementReason !== undefined;
              const isTargetInRangeCell =
                isLikelyTargetCell && engagementPreview.likelyTarget?.inRange === true;
              const isTargetOutOfRangeCell =
                isLikelyTargetCell && engagementPreview.likelyTarget?.inRange === false;
              const isPreviewFocusCell =
                isRangeCell || isSelectedCell || isLikelyTargetCell || isNextMoveCell;
              const isPreviewQuietCell = hasEngagementPreview && !isPreviewFocusCell;

              return (
                <div
                  key={`${cell.row}:${cell.col}`}
                  data-testid="board-cell"
                  className={`board-grid-cell ${
                    cell.cards.length === 0 ? "empty" : "occupied"
                  } ${cell.isOffsetRow ? "offset-row" : ""} ${
                    isRangeCell ? "preview-range" : ""
                  } ${isSelectedCell ? "preview-selected" : ""} ${
                    isLikelyTargetCell ? "preview-target" : ""
                  } ${
                    isTargetInRangeCell ? "preview-target-in-range" : ""
                  } ${isTargetOutOfRangeCell ? "preview-target-out-of-range" : ""} ${
                    isNextMoveCell ? "preview-next-move" : ""
                  } ${isBlockedSelectedCell ? "preview-blocked" : ""} ${
                    hasEngagementPreview
                      ? isPreviewQuietCell
                        ? "preview-quiet"
                        : "preview-active"
                      : ""
                  }`}
                  data-occupied={cell.cards.length > 0 ? "true" : "false"}
                  data-range-preview={isRangeCell ? "true" : "false"}
                  data-selected-preview={isSelectedCell ? "true" : "false"}
                  data-likely-target={isLikelyTargetCell ? "true" : "false"}
                  data-target-in-range={isTargetInRangeCell ? "true" : "false"}
                  data-target-out-of-range={isTargetOutOfRangeCell ? "true" : "false"}
                  data-next-move={isNextMoveCell ? "true" : "false"}
                  data-movement-blocked={isBlockedSelectedCell ? "true" : "false"}
                  data-preview-quiet={isPreviewQuietCell ? "true" : "false"}
                >
                  <div className="board-grid-coordinate">
                    r{cell.row} c{cell.col}
                  </div>
                  {isSelectedCell ? (
                    <span className="board-preview-marker selected">Selected</span>
                  ) : null}
                  {isRangeCell &&
                  !isSelectedCell &&
                  !isLikelyTargetCell &&
                  !isNextMoveCell ? (
                    <span className="board-preview-marker range">Range</span>
                  ) : null}
                  {isLikelyTargetCell ? (
                    <>
                      <span
                        className={`board-preview-marker target-label ${
                          isTargetInRangeCell ? "in-range" : "out-of-range"
                        }`}
                      >
                        Target
                      </span>
                      <span
                        className={`board-preview-marker target-status ${
                          isTargetInRangeCell ? "in-range" : "out-of-range"
                        }`}
                      >
                        {isTargetInRangeCell ? "Attack" : "Out of range"}
                      </span>
                    </>
                  ) : null}
                  {isNextMoveCell ? (
                    <span className="board-preview-marker move">Next move</span>
                  ) : null}
                  {isBlockedSelectedCell ? (
                    <span className="board-preview-marker blocked">Blocked</span>
                  ) : null}
                  {cell.cards.length > 0 ? (
                    cell.cards.map((card) => (
                      <button
                        key={card.cardInstanceId}
                        type="button"
                        data-testid="board-card"
                        className={`board-grid-layer ${card.layer} ${cardTypeClass(
                          card
                        )} ${
                          selectedCardInstanceId === card.cardInstanceId ? "selected" : ""
                        }`}
                        aria-label={`Inspect ${card.name} ${card.layer} r${cell.row} c${cell.col}`}
                        title={`${card.name} | ${card.cardType} | ${card.layer} | r${cell.row} c${cell.col}`}
                        onClick={() => onInspect(card)}
                      >
                        <span className="board-grid-layer-label">
                          {card.layer} {card.cardType}
                        </span>
                        <span className="board-grid-card-name">
                          {compactCardName(card.name)}
                        </span>
                        {boardStatChips(card).length > 0 ? (
                          <div
                            className="board-stat-chips"
                            aria-label={`${card.name} combat stats`}
                          >
                            {boardStatChips(card).map((chip) => (
                              <span key={chip} className="stat-chip compact">
                                {chip}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {renderCardMeta ? (
                          <span className="board-grid-meta">{renderCardMeta(card)}</span>
                        ) : null}
                      </button>
                    ))
                  ) : (
                    <span className="board-grid-empty">Empty</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {occupiedCount === 0 ? <p className="muted board-grid-note">{emptyText}</p> : null}
    </div>
  );
};

export function App() {
  const [selectedStarterKitId, setSelectedStarterKitId] = useState(firstStarterKitId);
  const [run, setRun] = useState(() => createDebugRun(firstStarterKitId));
  const [lastRecordedCombat, setLastRecordedCombat] = useState<
    RecordedCombatDebug | undefined
  >();
  const [selectedAllyCardRef, setSelectedAllyCardRef] = useState<
    AllySelectedCardRef | undefined
  >();
  const [selectedEnemyCardRef, setSelectedEnemyCardRef] = useState<
    EnemySelectedCardRef | undefined
  >();
  const [selectedEngagementRef, setSelectedEngagementRef] = useState<
    BoardSelectedCardRef | undefined
  >();
  const phase = getRunPhase(run);
  const rewardChoices = useMemo(() => getCurrentRewardChoices(run, sampleCatalog), [run]);
  const rewardOfferExplanations = useMemo(
    () => buildRewardOfferExplanations(run, sampleCatalog),
    [run]
  );
  const rewardOfferExplanationByChoiceId = useMemo(
    () =>
      new Map(
        rewardOfferExplanations.map((explanation) => [explanation.choiceId, explanation])
      ),
    [rewardOfferExplanations]
  );
  const currentEncounter = useMemo(() => getCurrentEncounter(run, sampleCatalog), [run]);
  const opponentSetup = useMemo(
    () =>
      currentEncounter ? buildCombatantSetupForEncounter(currentEncounter) : undefined,
    [currentEncounter]
  );
  const playerSetup = useMemo(() => buildCombatantSetupForRun(run), [run]);
  const playerBoardGrid = useMemo(
    () => buildBoardGridSummary(run.board, sampleCatalog, run.activeCards),
    [run]
  );
  const encounterBoardGrid = useMemo(
    () =>
      currentEncounter
        ? buildBoardGridSummary(currentEncounter.loadout.board, sampleCatalog)
        : undefined,
    [currentEncounter]
  );
  const starterKitName =
    sampleCatalog.starterKitsById.get(run.starterKitId ?? "")?.name ?? "None";
  const validation = useMemo(() => validateRunLoadout(run, sampleCatalog), [run]);
  const resourceSummary = useMemo(
    () => buildLoadoutResourceSummary(run, sampleCatalog),
    [run]
  );
  const traitSummary = useMemo(() => buildRunTraitSummary(run, sampleCatalog), [run]);
  const upgradeProgressGroups = useMemo(
    () => getUpgradeProgressGroups(run, sampleCatalog),
    [run]
  );
  const upgradeProgressByCardId = useMemo(() => {
    const byCardId = new Map<CardInstanceId, UpgradeProgressGroup>();
    for (const group of upgradeProgressGroups) {
      for (const cardInstanceId of [
        ...group.poolCardInstanceIds,
        ...group.activeCardInstanceIds,
        ...group.otherCardInstanceIds
      ]) {
        byCardId.set(cardInstanceId, group);
      }
    }
    return byCardId;
  }, [upgradeProgressGroups]);
  const nextActionMessage = useMemo(
    () => getRunNextActionMessage(run, validation, canApplyReward(run)),
    [run, validation]
  );
  const recordReady = canRecordCombat(run, sampleCatalog);
  const editable = canEditLoadout(run);

  const combat = useMemo(() => {
    if (!opponentSetup || !recordReady) {
      return undefined;
    }

    return resolveCombat({
      catalog: sampleCatalog,
      seed: `client-debug-combat:${run.seed}:${run.currentRound}:${currentEncounter?.id}`,
      playerA: playerSetup,
      playerB: opponentSetup
    });
  }, [
    currentEncounter?.id,
    opponentSetup,
    playerSetup,
    recordReady,
    run.currentRound,
    run.seed
  ]);
  const latestCombatSummary = run.combatHistory.at(-1);
  const latestOpenedPack = run.openedPacks.at(-1);
  const latestRewardHistoryEntry = run.rewardHistory.at(-1);
  const upcomingCombatDisplaySummary = useMemo(
    () =>
      combat
        ? buildCombatDisplaySummary({
            catalog: sampleCatalog,
            combatResult: combat,
            perspectiveSide: "playerA"
          })
        : undefined,
    [combat]
  );
  const lastRecordedCombatDisplaySummary = useMemo(
    () =>
      lastRecordedCombat
        ? buildCombatDisplaySummary({
            catalog: sampleCatalog,
            combatResult: lastRecordedCombat.result,
            perspectiveSide: "playerA"
          })
        : undefined,
    [lastRecordedCombat]
  );
  const defaultAllyCardRef = useMemo<AllySelectedCardRef | undefined>(() => {
    const placement = firstUnitOrEchoPlacement(run.board.placements);
    return placement
      ? { type: "run", cardInstanceId: placement.cardInstanceId }
      : undefined;
  }, [run.board.placements]);
  const defaultEnemyCardRef = useMemo<EnemySelectedCardRef | undefined>(() => {
    const placement = currentEncounter
      ? firstUnitOrEchoPlacement(currentEncounter.loadout.board.placements)
      : undefined;
    return placement
      ? { type: "encounterBoard", cardInstanceId: placement.cardInstanceId }
      : undefined;
  }, [currentEncounter]);
  const effectiveAllyCardRef = selectedAllyCardRef ?? defaultAllyCardRef;
  const effectiveEnemyCardRef = selectedEnemyCardRef ?? defaultEnemyCardRef;
  const effectiveEngagementRef =
    selectedEngagementRef ?? (defaultAllyCardRef as BoardSelectedCardRef | undefined);
  const engagementPreview = useMemo(() => {
    const engagementSide = previewSideForRef(effectiveEngagementRef);

    return buildEngagementPreview({
      catalog: sampleCatalog,
      playerBoard: run.board,
      enemyBoard: currentEncounter?.loadout.board ?? { placements: [] },
      playerActiveCards: run.activeCards,
      ...(effectiveEngagementRef && engagementSide
        ? {
            selectedCardInstanceId: effectiveEngagementRef.cardInstanceId,
            selectedSide: engagementSide
          }
        : {})
    });
  }, [currentEncounter, effectiveEngagementRef, run.activeCards, run.board]);
  const selectedAllyInspection = useMemo(() => {
    if (!effectiveAllyCardRef) {
      return undefined;
    }

    return inspectRunCard({
      catalog: sampleCatalog,
      run,
      cardInstanceId: effectiveAllyCardRef.cardInstanceId
    });
  }, [effectiveAllyCardRef, run]);
  const selectedEnemyInspection = useMemo(() => {
    if (!effectiveEnemyCardRef || !currentEncounter) {
      return undefined;
    }

    if (effectiveEnemyCardRef.type === "encounterBoard") {
      const placement = currentEncounter.loadout.board.placements.find(
        (candidate) => candidate.cardInstanceId === effectiveEnemyCardRef.cardInstanceId
      );
      return placement
        ? inspectEncounterCard({ catalog: sampleCatalog, placement })
        : undefined;
    }

    const card =
      effectiveEnemyCardRef.type === "encounterSource"
        ? currentEncounter.loadout.sourceRow.cards.find(
            (candidate) => candidate.instanceId === effectiveEnemyCardRef.cardInstanceId
          )
        : currentEncounter.loadout.spellrail.cards.find(
            (candidate) => candidate.instanceId === effectiveEnemyCardRef.cardInstanceId
          );

    return card ? inspectEncounterCard({ catalog: sampleCatalog, card }) : undefined;
  }, [currentEncounter, effectiveEnemyCardRef]);
  const latestPackName = latestOpenedPack
    ? (sampleCatalog.packsById.get(latestOpenedPack.packId)?.name ??
      latestOpenedPack.packId)
    : undefined;
  const latestOpenedCardNames =
    latestOpenedPack?.slots.map((slot) => cardName(slot.cardDefId)) ?? [];
  const latestRewardCardIds = useMemo(
    () => new Set(getLatestOpenedPackCardInstanceIds(run)),
    [run]
  );

  const resetRun = (starterKitId = selectedStarterKitId) => {
    setSelectedStarterKitId(starterKitId);
    setRun(createDebugRun(starterKitId));
    setLastRecordedCombat(undefined);
    setSelectedAllyCardRef(undefined);
    setSelectedEnemyCardRef(undefined);
    setSelectedEngagementRef(undefined);
  };

  const performLoadoutAction = (
    cardInstanceId: CardInstanceId,
    action: LoadoutAction
  ) => {
    setRun((currentRun) => {
      switch (action.type) {
        case "placeOnBoard":
          return applyRunAction(currentRun, sampleCatalog, {
            type: "placeCardOnBoard",
            cardInstanceId,
            position: action.position
          });
        case "addToSourceRow":
          return applyRunAction(currentRun, sampleCatalog, {
            type: "addCardToSourceRow",
            cardInstanceId
          });
        case "addToSpellrail":
          return applyRunAction(currentRun, sampleCatalog, {
            type: "addCardToSpellrail",
            cardInstanceId
          });
        case "returnToPool":
          return applyRunAction(currentRun, sampleCatalog, {
            type: "returnCardToPool",
            cardInstanceId
          });
      }
    });
  };

  const renderLoadoutActions = (cardInstanceId: CardInstanceId) => {
    const actions = getLegalLoadoutActions(run, sampleCatalog, cardInstanceId);
    const selectRunCard = () => {
      setSelectedAllyCardRef({ type: "run", cardInstanceId });
      if (
        run.board.placements.some(
          (placement) => placement.cardInstanceId === cardInstanceId
        )
      ) {
        setSelectedEngagementRef({ type: "run", cardInstanceId });
      }
    };
    const inspectButton = (
      <button type="button" className="secondary" onClick={selectRunCard}>
        Inspect
      </button>
    );
    if (actions.length === 0) {
      return (
        <div className="mini-actions">
          {inspectButton}
          {editable ? <small>No legal action</small> : null}
        </div>
      );
    }

    return (
      <div className="mini-actions">
        {inspectButton}
        {actions.map((action) => (
          <button
            key={`${cardInstanceId}:${action.type}`}
            type="button"
            onClick={() => performLoadoutAction(cardInstanceId, action)}
          >
            {action.label}
          </button>
        ))}
      </div>
    );
  };

  const upgradeGroup = (group: UpgradeProgressGroup) => {
    setRun((currentRun) =>
      applyRunAction(currentRun, sampleCatalog, {
        type: "upgradeCardGroup",
        defId: group.defId,
        upgradeLevel: group.upgradeLevel
      })
    );
  };

  const upgradeLevelForActiveCard = (cardInstanceId: CardInstanceId): number =>
    run.activeCards.find((card) => card.instanceId === cardInstanceId)?.upgradeLevel ?? 0;

  const inspectEncounterBoard = (cardInstanceId: CardInstanceId) => {
    setSelectedEnemyCardRef({ type: "encounterBoard", cardInstanceId });
    setSelectedEngagementRef({ type: "encounterBoard", cardInstanceId });
  };

  const inspectEncounterSource = (cardInstanceId: CardInstanceId) => {
    setSelectedEnemyCardRef({ type: "encounterSource", cardInstanceId });
  };

  const inspectEncounterSpellrail = (cardInstanceId: CardInstanceId) => {
    setSelectedEnemyCardRef({ type: "encounterSpellrail", cardInstanceId });
  };

  const renderPlayerGridCardMeta = (card: BoardGridCardSummary): ReactNode => (
    <>
      <UpgradeBadge level={card.upgradeLevel ?? 0} />
      {card.definitionMissing ? (
        <span className="missing-def-badge">missing def</span>
      ) : null}
    </>
  );

  const renderEncounterGridCardMeta = (card: BoardGridCardSummary): ReactNode =>
    card.definitionMissing ? (
      <span className="missing-def-badge">missing def</span>
    ) : null;

  const markReady = () => {
    setRun((currentRun) =>
      applyRunAction(currentRun, sampleCatalog, { type: "markCombatReady" })
    );
  };

  const recordCombat = () => {
    if (!combat || !currentEncounter) {
      return;
    }

    setLastRecordedCombat({
      round: run.currentRound,
      encounterId: currentEncounter.id,
      result: combat
    });
    setRun((currentRun) =>
      applyRunAction(currentRun, sampleCatalog, {
        type: "recordCombatResult",
        combatResult: combatResultForAction(combat),
        encounterId: currentEncounter.id
      })
    );
  };

  const openReward = (choiceId: string) => {
    setRun((currentRun) =>
      applyRunAction(currentRun, sampleCatalog, {
        type: "applyPackReward",
        choiceId
      })
    );
  };

  const advanceRound = () => {
    setSelectedAllyCardRef(undefined);
    setSelectedEnemyCardRef(undefined);
    setSelectedEngagementRef(undefined);
    setRun((currentRun) =>
      applyRunAction(currentRun, sampleCatalog, { type: "advanceRunAfterCombat" })
    );
  };

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <h1>Packbound</h1>
          <p>Ugly playable deterministic run loop</p>
        </div>
        <div className="button-row">
          <label className="starter-picker">
            Starter
            <select
              value={selectedStarterKitId}
              onChange={(event) => resetRun(event.target.value)}
            >
              {sampleCatalog.starterKits.map((starterKit) => (
                <option key={starterKit.id} value={starterKit.id}>
                  {starterKit.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={markReady}
            disabled={!currentEncounter || !validation.ok || phase !== "planning"}
          >
            Ready Combat
          </button>
          <button type="button" onClick={recordCombat} disabled={!combat}>
            Record Combat
          </button>
          <button
            type="button"
            onClick={advanceRound}
            disabled={run.status !== "active" || phase !== "combatResolved"}
          >
            Advance
          </button>
          <button type="button" className="secondary" onClick={() => resetRun()}>
            Reset
          </button>
        </div>
      </section>

      <section className="battlefield-section" aria-labelledby="battlefield-heading">
        <div className="battlefield-header">
          <div>
            <h2 id="battlefield-heading">Battlefield</h2>
            <p className="muted">
              Automatic combat setup for round {run.currentRound}. Inspect one ally and
              one enemy at the same time to compare stats, keywords, and targeting clues.
            </p>
          </div>
          <dl className="battlefield-run-strip">
            <div>
              <dt>Phase</dt>
              <dd>{phase}</dd>
            </div>
            <div>
              <dt>Health</dt>
              <dd>{run.playerHealth}</dd>
            </div>
            <div>
              <dt>Gold</dt>
              <dd>{run.playerGold}</dd>
            </div>
            <div>
              <dt>Encounter</dt>
              <dd>{currentEncounter?.name ?? "None"}</dd>
            </div>
          </dl>
        </div>

        <div className="battlefield-layout">
          <aside className="battlefield-inspector ally">
            <h3>Ally Inspector</h3>
            <CardInspectorView
              inspection={selectedAllyInspection}
              emptyText="Select an ally board, pool, Source Row, or Spellrail card."
            />
          </aside>

          <div className="battlefield-board" data-testid="hex-arena">
            <div className="hex-arena-heading">
              <h3>Hex Arena</h3>
              <EngagementPreviewPanel preview={engagementPreview} />
              <div className="hex-arena-badges" aria-label="Hex arena topology">
                <span>Odd-r hex</span>
                <span>Pointy-top</span>
              </div>
            </div>

            <div className="hex-arena-viewport" data-testid="hex-arena-viewport">
              <div className="battlefield-board-side enemy">
                <div className="board-side-heading">
                  <h3>Enemy Hex Board</h3>
                  <span>{currentEncounter?.kind ?? "none"}</span>
                </div>
                <div className="board-orientation" aria-label="Enemy board orientation">
                  <span>Enemy side</span>
                  <span>Odd-r hex</span>
                  <span>Odd rows offset</span>
                  <span>Backline r0</span>
                  <span>Frontline r3</span>
                </div>
                {encounterBoardGrid ? (
                  <BoardGridView
                    boardSide="playerB"
                    engagementPreview={engagementPreview}
                    summary={encounterBoardGrid}
                    emptyText="No enemy board cards are placed."
                    onInspect={(card) => inspectEncounterBoard(card.cardInstanceId)}
                    renderCardMeta={renderEncounterGridCardMeta}
                    selectedCardInstanceId={
                      effectiveEnemyCardRef?.type === "encounterBoard"
                        ? effectiveEnemyCardRef.cardInstanceId
                        : undefined
                    }
                  />
                ) : (
                  <p className="muted">No current encounter board to show.</p>
                )}
              </div>

              <div className="battlefield-vs">Engagement Line</div>

              <div className="battlefield-board-side ally">
                <div className="board-side-heading">
                  <h3>Ally Hex Board</h3>
                  <span>{resourceSummary.boardChargeText} Charge</span>
                </div>
                <div className="board-orientation" aria-label="Ally board orientation">
                  <span>Your side</span>
                  <span>Odd-r hex</span>
                  <span>Odd rows offset</span>
                  <span>Frontline r0</span>
                  <span>Backline r3</span>
                </div>
                <BoardGridView
                  boardSide="playerA"
                  engagementPreview={engagementPreview}
                  summary={playerBoardGrid}
                  emptyText="No player board cards are placed."
                  onInspect={(card) => {
                    setSelectedAllyCardRef({
                      type: "run",
                      cardInstanceId: card.cardInstanceId
                    });
                    setSelectedEngagementRef({
                      type: "run",
                      cardInstanceId: card.cardInstanceId
                    });
                  }}
                  renderCardMeta={renderPlayerGridCardMeta}
                  selectedCardInstanceId={
                    effectiveAllyCardRef?.type === "run"
                      ? effectiveAllyCardRef.cardInstanceId
                      : undefined
                  }
                />
              </div>
            </div>
          </div>

          <aside className="battlefield-inspector enemy">
            <h3>Enemy Inspector</h3>
            <CardInspectorView
              inspection={selectedEnemyInspection}
              emptyText="Select an enemy board, Source Row, or Spellrail card."
              showLegalActions={false}
            />
          </aside>
        </div>

        <CombatModelFactsView />
      </section>

      <section className="debug-grid">
        <div className="panel">
          <h2>Run State</h2>
          <p className="next-action">{nextActionMessage}</p>
          <dl className="run-stats">
            <div>
              <dt>Seed</dt>
              <dd>{run.seed}</dd>
            </div>
            <div>
              <dt>Round</dt>
              <dd>
                {run.currentRound} / {run.maxRounds}
              </dd>
            </div>
            <div>
              <dt>Health</dt>
              <dd>{run.playerHealth}</dd>
            </div>
            <div>
              <dt>Gold</dt>
              <dd>{run.playerGold}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{run.status}</dd>
            </div>
            <div>
              <dt>Phase</dt>
              <dd>{phase}</dd>
            </div>
            <div>
              <dt>Starter</dt>
              <dd>{starterKitName}</dd>
            </div>
          </dl>
        </div>

        <div className="panel">
          <h2>Current Encounter</h2>
          <dl className="run-stats">
            <div>
              <dt>Name</dt>
              <dd>{currentEncounter?.name ?? "None"}</dd>
            </div>
            <div>
              <dt>Kind</dt>
              <dd>{currentEncounter?.kind ?? "none"}</dd>
            </div>
            <div>
              <dt>Difficulty</dt>
              <dd>{currentEncounter?.difficulty ?? "-"}</dd>
            </div>
            <div>
              <dt>Opponent Board</dt>
              <dd>{currentEncounter ? "Inspect in battlefield" : "-"}</dd>
            </div>
          </dl>
          {currentEncounter ? (
            <div className="encounter-loadout">
              <h3>Opponent Board</h3>
              <ol className="card-list compact">
                {currentEncounter.loadout.board.placements.map((placement) => (
                  <li key={placement.cardInstanceId}>
                    <span>{cardName(placement.defId)}</span>
                    <small>
                      r{placement.position.row} c{placement.position.col}{" "}
                      {placement.position.layer}
                    </small>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => inspectEncounterBoard(placement.cardInstanceId)}
                    >
                      Inspect
                    </button>
                  </li>
                ))}
              </ol>
              <h3>Opponent Source Row</h3>
              <ol className="card-list compact">
                {currentEncounter.loadout.sourceRow.cards.map((card) => (
                  <li key={card.instanceId}>
                    <span>{cardName(card.defId)}</span>
                    <small>{card.zone}</small>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => inspectEncounterSource(card.instanceId)}
                    >
                      Inspect
                    </button>
                  </li>
                ))}
              </ol>
              <h3>Opponent Spellrail</h3>
              <ol className="card-list compact">
                {currentEncounter.loadout.spellrail.cards.length > 0 ? (
                  currentEncounter.loadout.spellrail.cards.map((card) => (
                    <li key={card.instanceId}>
                      <span>{cardName(card.defId)}</span>
                      <small>{card.zone}</small>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => inspectEncounterSpellrail(card.instanceId)}
                      >
                        Inspect
                      </button>
                    </li>
                  ))
                ) : (
                  <li>
                    <span>None</span>
                  </li>
                )}
              </ol>
            </div>
          ) : null}
        </div>

        <div className="panel">
          <h2>Planning Check</h2>
          <div className={validation.ok ? "status ok" : "status error"}>
            {validation.ok ? "Legal" : "Illegal"}
          </div>
          <ul className="message-list">
            {validation.errors.map((error) => (
              <li key={`${error.code}:${error.cardInstanceId ?? "state"}`}>
                {error.message}
              </li>
            ))}
          </ul>
        </div>

        <div className="panel">
          <h2>Traits / Teamups</h2>
          <TraitSummaryView summary={traitSummary} />
        </div>

        <div className="panel">
          <h2>Reward Choices</h2>
          <p className="muted">
            {canApplyReward(run)
              ? "Buy one pack to add to the pool."
              : "Rewards appear after combat is recorded."}
          </p>
          <ol className="card-list">
            {rewardChoices.map((choice) => {
              const explanation = rewardOfferExplanationByChoiceId.get(choice.id);

              return (
                <li key={choice.id}>
                  <div className="reward-choice-cell">
                    <span>{choice.label}</span>
                    <small>Cost {choice.cost} gold</small>
                    {!choice.affordable ? (
                      <small>
                        Need {choice.cost} gold, have {run.playerGold}
                      </small>
                    ) : (
                      <small>After purchase: {choice.goldAfterPurchase} gold</small>
                    )}
                    {explanation ? (
                      <>
                        <p className="reward-headline">{explanation.headline}</p>
                        <ul className="reward-reasons">
                          {explanation.reasons.map((reason, index) => (
                            <li
                              key={`${reason.kind}:${index}:${reason.text}`}
                              className={`reward-reason ${reason.severity}`}
                            >
                              {reason.text}
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => openReward(choice.id)}
                    disabled={!choice.affordable}
                  >
                    Open
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="panel">
          <h2>Board</h2>
          <ol className="card-list">
            {run.board.placements.map((placement) => (
              <li key={placement.cardInstanceId}>
                <div className="card-name-cell">
                  <span>{cardName(placement.defId)}</span>
                  <UpgradeBadge
                    level={upgradeLevelForActiveCard(placement.cardInstanceId)}
                  />
                  <UpgradeProgressBadge
                    group={upgradeProgressByCardId.get(placement.cardInstanceId)}
                    cardInstanceId={placement.cardInstanceId}
                    zone="active"
                  />
                </div>
                <small>
                  r{placement.position.row} c{placement.position.col}{" "}
                  {placement.position.layer}
                </small>
                {renderLoadoutActions(placement.cardInstanceId)}
              </li>
            ))}
          </ol>
        </div>

        <div className="panel">
          <h2>Source Row</h2>
          <dl className="source-summary">
            <div>
              <dt>Board Charge</dt>
              <dd>{resourceSummary.boardChargeText}</dd>
            </div>
            <div>
              <dt>Aspect Access</dt>
              <dd>{resourceSummary.aspectAccessText}</dd>
            </div>
            <div>
              <dt>Combat Charge/sec</dt>
              <dd>{resourceSummary.combatChargePerSecondText}</dd>
            </div>
            <div>
              <dt>Slots</dt>
              <dd>{resourceSummary.sourceSlotsText}</dd>
            </div>
          </dl>
          <ol className="card-list">
            {run.sourceRow.cards.map((card) => (
              <li key={card.instanceId}>
                <div className="card-name-cell">
                  <span>{cardName(card.defId)}</span>
                  <UpgradeBadge level={card.upgradeLevel} />
                  <UpgradeProgressBadge
                    group={upgradeProgressByCardId.get(card.instanceId)}
                    cardInstanceId={card.instanceId}
                    zone="active"
                  />
                </div>
                <small>{card.zone}</small>
                {renderLoadoutActions(card.instanceId)}
              </li>
            ))}
          </ol>
        </div>

        <div className="panel">
          <h2>Spellrail</h2>
          <ol className="card-list">
            {run.spellrail.cards.map((card) => (
              <li key={card.instanceId}>
                <div className="card-name-cell">
                  <span>{cardName(card.defId)}</span>
                  <UpgradeBadge level={card.upgradeLevel} />
                  <UpgradeProgressBadge
                    group={upgradeProgressByCardId.get(card.instanceId)}
                    cardInstanceId={card.instanceId}
                    zone="active"
                  />
                </div>
                <small>{card.zone}</small>
                {renderLoadoutActions(card.instanceId)}
              </li>
            ))}
          </ol>
        </div>

        <div className="panel">
          <h2>Upgrade Progress</h2>
          {upgradeProgressGroups.length > 0 ? (
            <ol className="card-list">
              {upgradeProgressGroups.map((group) => (
                <li key={`${group.defId}:${group.upgradeLevel}`}>
                  <span>{describeUpgradeProgressGroup(group)}</span>
                  {group.canUpgrade ? (
                    <button
                      type="button"
                      onClick={() => upgradeGroup(group)}
                      disabled={!editable}
                    >
                      Upgrade
                    </button>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted">
              No duplicate upgrade progress yet. Unit and Echo cards need 3 matching pool
              copies at the same level.
            </p>
          )}
        </div>

        <div className="panel">
          <h2>Pool Cards</h2>
          {latestOpenedPack ? (
            <div className="pool-reward-summary">
              <p className="muted">
                Latest pack: {latestPackName} | New cards are in Pool Cards below.
              </p>
              {latestRewardHistoryEntry ? (
                <p className="muted">
                  Paid {latestRewardHistoryEntry.cost} gold | Gold{" "}
                  {latestRewardHistoryEntry.goldBefore}
                  {" -> "}
                  {latestRewardHistoryEntry.goldAfter}
                </p>
              ) : null}
              <p>{latestOpenedCardNames.join(", ")}</p>
              <small>{latestOpenedPack.seed}</small>
            </div>
          ) : (
            <p className="muted">Open rewards to grow the pool.</p>
          )}
          <ol className="card-list">
            {run.pool.map((card) => {
              const isLatestReward = latestRewardCardIds.has(card.instanceId);
              return (
                <li
                  key={card.instanceId}
                  className={isLatestReward ? "latest-reward-card" : undefined}
                >
                  <div className="card-name-cell">
                    <span>{cardName(card.defId)}</span>
                    <UpgradeBadge level={card.upgradeLevel} />
                    <UpgradeProgressBadge
                      group={upgradeProgressByCardId.get(card.instanceId)}
                      cardInstanceId={card.instanceId}
                      zone="pool"
                    />
                    {isLatestReward ? <span className="new-badge">new</span> : null}
                  </div>
                  <small>{card.zone}</small>
                  {renderLoadoutActions(card.instanceId)}
                </li>
              );
            })}
          </ol>
        </div>

        <div className="panel wide">
          <h2>Last Recorded Combat</h2>
          {latestCombatSummary ? (
            <>
              <p className="muted">
                Round {latestCombatSummary.round} | Winner: {latestCombatSummary.winner} |
                Damage: {latestCombatSummary.damageToPlayer}/
                {latestCombatSummary.damageToOpponent} | Events:{" "}
                {latestCombatSummary.eventCount} | Gold: +{latestCombatSummary.goldEarned}
              </p>
              {lastRecordedCombatDisplaySummary ? (
                <>
                  <CombatSummaryView summary={lastRecordedCombatDisplaySummary} />
                  <RawDebugDetails
                    label="Raw debug events"
                    value={{
                      round: lastRecordedCombat?.round,
                      encounterId: lastRecordedCombat?.encounterId,
                      runSummary: latestCombatSummary,
                      events: lastRecordedCombat?.result.events ?? [],
                      warnings: lastRecordedCombat?.result.warnings ?? []
                    }}
                  />
                </>
              ) : (
                <p className="muted combat-empty">
                  Compact run summary is available; full event details are not stored in
                  run state.
                </p>
              )}
            </>
          ) : (
            <p className="muted">No combat has been recorded for this run.</p>
          )}
        </div>

        {combat && upcomingCombatDisplaySummary ? (
          <div className="panel wide">
            <h2>Upcoming Combat Preview</h2>
            <p className="muted">
              Preview only, not yet recorded. Winner: {combat.winner} | Events:{" "}
              {combat.events.length}
            </p>
            <CombatSummaryView summary={upcomingCombatDisplaySummary} />
            <RawDebugDetails
              label="Raw debug events"
              value={{
                phase,
                currentEncounterId: currentEncounter?.id ?? null,
                events: combat.events,
                warnings: combat.warnings
              }}
            />
          </div>
        ) : null}
      </section>
    </main>
  );
}
