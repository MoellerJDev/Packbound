import { type ReactNode, useMemo, useState } from "react";

import { sampleCatalog } from "@packbound/content";
import {
  applyRunAction,
  buildBoardGridSummary,
  buildEngagementPreview,
  buildLoadoutResourceSummary,
  buildRewardOfferExplanations,
  buildRunTraitSummary,
  buildCombatantSetupForEncounter,
  buildCombatantSetupForRun,
  canApplyReward,
  canDeployCommander,
  canEditLoadout,
  canPlaceCardOnBoard,
  canRecordCombat,
  canReturnCommanderToCommand,
  createEncounterMatch,
  createRunFromStarterKit,
  describeUpgradeProgressGroup,
  passEncounterPriority,
  getDefaultCommanderPosition,
  getCurrentEncounter,
  getCurrentRewardChoices,
  getLatestOpenedPackCardInstanceIds,
  getLegalLoadoutActions,
  getUpgradeProgressGroups,
  getRunPhase,
  getRunNextActionMessage,
  inspectEncounterCard,
  inspectRunCard,
  listPrototypePressureActionSources,
  recordEncounterCombatSkirmish,
  submitPrototypePressureActionFromRun,
  validateRunLoadout,
  type BoardGridCardSummary,
  type CombatResultLike,
  type EngagementPreviewSide,
  type EncounterMatchState,
  type LoadoutAction,
  type RunState,
  type UpgradeProgressGroup
} from "@packbound/rules";
import {
  BOARD_COLS,
  BOARD_ROWS,
  asPlayerId,
  type BoardPosition,
  type CardDefId,
  type CardInstance,
  type CardInstanceId
} from "@packbound/shared";
import {
  buildCombatDisplaySummary,
  resolveCombat,
  type CombatResult
} from "@packbound/sim";

import { BoardGridView } from "./components/BoardGridView";
import { CardInspectorView } from "./components/CardInspectorView";
import { CombatModelFactsView } from "./components/CombatModelFactsView";
import { CombatSummaryView } from "./components/CombatSummaryView";
import { EngagementPreviewPanel } from "./components/EngagementPreviewPanel";
import { PriorityLabPanel } from "./components/PriorityLabPanel";
import { PixiBattlefieldRenderer } from "./components/pixi/PixiBattlefieldRenderer";
import {
  buildPixiBattlefieldModel,
  type PixiBattlefieldCard
} from "./components/pixi/pixiBattlefieldModel";
import {
  combatEventsToPixiReplayCommands,
  type PixiReplayCommand
} from "./components/pixi/pixiCombatReplay";
import {
  completePixiReplayCommand,
  createPixiReplayControlsState,
  limitPixiReplayCommands,
  pausePixiReplay,
  playPixiReplay,
  resetPixiReplay,
  stepPixiReplay
} from "./components/pixi/pixiReplayControls";
import { RawDebugDetails } from "./components/RawDebugDetails";
import { TraitSummaryView } from "./components/TraitSummaryView";
import { UpgradeBadge, UpgradeProgressBadge } from "./components/upgradeBadges";
import {
  DEBUG_PRIORITY_SCENARIO_ID,
  DEBUG_RENDERER_SCENARIO_ID,
  applyDebugScenario,
  debugScenarioFromSearch
} from "./debugScenarios";

const playerId = asPlayerId("debug-player");
const runSeed = "client-debug-run";
const activeDebugScenarioId = debugScenarioFromSearch(window.location.search);

const cardName = (defId: CardDefId): string =>
  sampleCatalog.cardsById.get(defId)?.name ?? defId;
const cardNamesByDefId = new Map(
  sampleCatalog.cards.map((card) => [card.id, card.name] as const)
);

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
const createPriorityLabMatch = (): EncounterMatchState =>
  createEncounterMatch({
    matchId: "debug-priority-lab",
    seed: "client-debug-priority-lab"
  });

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

type BoardPlacementSummary = RunState["board"]["placements"][number];

const firstUnitOrEchoPlacement = (
  placements: readonly BoardPlacementSummary[]
): BoardPlacementSummary | undefined =>
  placements.find((placement) => {
    const def = sampleCatalog.cardsById.get(placement.defId);
    return def?.cardType === "Unit" || def?.cardType === "Echo";
  }) ?? placements[0];

const previewSideForRef = (
  ref: BoardSelectedCardRef | undefined
): EngagementPreviewSide | undefined =>
  ref?.type === "run"
    ? "playerA"
    : ref?.type === "encounterBoard"
      ? "playerB"
      : undefined;

const boardLayerForPoolCard = (
  card: CardInstance
): BoardPosition["layer"] | undefined => {
  const def = sampleCatalog.cardsById.get(card.defId);
  if (def?.cardType === "Unit" || def?.cardType === "Echo") {
    return "ground";
  }
  if (def?.cardType === "Relic" || def?.cardType === "Field") {
    return "support";
  }
  return undefined;
};

const sameBoardPosition = (left: BoardPosition, right: BoardPosition): boolean =>
  left.row === right.row && left.col === right.col && left.layer === right.layer;

export function App() {
  const isRendererLab = activeDebugScenarioId === DEBUG_RENDERER_SCENARIO_ID;
  const [selectedStarterKitId, setSelectedStarterKitId] = useState(firstStarterKitId);
  const [run, setRun] = useState(() => createDebugRun(firstStarterKitId));
  const [priorityMatch, setPriorityMatch] = useState(createPriorityLabMatch);
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
  const [rendererReplay, setRendererReplay] = useState(createPixiReplayControlsState);
  const [rendererPlacementCardId, setRendererPlacementCardId] = useState<
    CardInstanceId | undefined
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
  const commanderDefaultPosition = useMemo(
    () => getDefaultCommanderPosition(run, sampleCatalog),
    [run]
  );
  const commanderDeployCheck = useMemo(() => {
    if (!run.commander) {
      return { ok: false as const, reason: "Run has no Commander." };
    }
    if (run.commander.card.zone !== "command") {
      return { ok: false as const, reason: "Commander is already deployed." };
    }
    if (!commanderDefaultPosition) {
      return {
        ok: false as const,
        reason: "No legal Commander deployment tile is available."
      };
    }
    return canDeployCommander(run, sampleCatalog, commanderDefaultPosition);
  }, [commanderDefaultPosition, run]);
  const commanderReturnCheck = useMemo(() => canReturnCommanderToCommand(run), [run]);
  const priorityPrototypeActionSource = useMemo(
    () =>
      listPrototypePressureActionSources({
        run,
        catalog: sampleCatalog,
        actor: "player"
      })[0],
    [run]
  );
  const availablePriorityPrototypeActionSource = useMemo(
    () =>
      listPrototypePressureActionSources({
        run,
        catalog: sampleCatalog,
        actor: "player",
        match: priorityMatch
      })[0],
    [priorityMatch, run]
  );

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
  const priorityLabCombat = useMemo(() => {
    if (!opponentSetup || !currentEncounter) {
      return undefined;
    }

    return resolveCombat({
      catalog: sampleCatalog,
      seed: `client-debug-priority-combat:${priorityMatch.seed}:${priorityMatch.turnNumber}:${priorityMatch.skirmishes.length}:${currentEncounter.id}`,
      playerA: playerSetup,
      playerB: opponentSetup
    });
  }, [
    currentEncounter,
    opponentSetup,
    playerSetup,
    priorityMatch.seed,
    priorityMatch.skirmishes.length,
    priorityMatch.turnNumber
  ]);
  const rendererLabCombat = useMemo(() => {
    if (!opponentSetup || !currentEncounter) {
      return undefined;
    }

    return resolveCombat({
      catalog: sampleCatalog,
      seed: `client-debug-renderer-combat:${run.seed}:${run.currentRound}:${currentEncounter.id}`,
      playerA: playerSetup,
      playerB: opponentSetup
    });
  }, [currentEncounter, opponentSetup, playerSetup, run.currentRound, run.seed]);
  const rendererReplayCommands = useMemo(
    () =>
      limitPixiReplayCommands(
        combatEventsToPixiReplayCommands(rendererLabCombat?.events ?? [], {
          cardNamesByDefId
        })
      ),
    [rendererLabCombat]
  );
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
  const rendererLabCombatDisplaySummary = useMemo(
    () =>
      rendererLabCombat
        ? buildCombatDisplaySummary({
            catalog: sampleCatalog,
            combatResult: rendererLabCombat,
            perspectiveSide: "playerA",
            maxLines: 10
          })
        : undefined,
    [rendererLabCombat]
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
  const rendererPlacementCard = useMemo(
    () =>
      rendererPlacementCardId
        ? run.pool.find((card) => card.instanceId === rendererPlacementCardId)
        : undefined,
    [rendererPlacementCardId, run.pool]
  );
  const rendererPlaceablePositions = useMemo(() => {
    if (!rendererPlacementCard) {
      return [];
    }

    const layer = boardLayerForPoolCard(rendererPlacementCard);
    if (!layer) {
      return [];
    }

    const positions: BoardPosition[] = [];
    for (let row = 0; row < BOARD_ROWS; row += 1) {
      for (let col = 0; col < BOARD_COLS; col += 1) {
        const position = { row, col, layer };
        if (
          canPlaceCardOnBoard(
            run,
            sampleCatalog,
            rendererPlacementCard.instanceId,
            position
          ).ok
        ) {
          positions.push(position);
        }
      }
    }
    return positions;
  }, [rendererPlacementCard, run]);
  const pixiBattlefieldModel = useMemo(
    () =>
      buildPixiBattlefieldModel({
        playerBoard: playerBoardGrid,
        ...(encounterBoardGrid ? { enemyBoard: encounterBoardGrid } : {}),
        engagementPreview,
        ...(isRendererLab ? { placeablePositions: rendererPlaceablePositions } : {})
      }),
    [
      encounterBoardGrid,
      engagementPreview,
      isRendererLab,
      playerBoardGrid,
      rendererPlaceablePositions
    ]
  );
  const rendererReplayCardNameByInstanceId = useMemo(() => {
    const byInstanceId = new Map<CardInstanceId, string>();
    for (const card of pixiBattlefieldModel.cards) {
      byInstanceId.set(card.cardInstanceId, card.name);
    }
    for (const command of rendererReplayCommands) {
      if (command.type === "appear") {
        byInstanceId.set(command.cardInstanceId, command.token.name);
      }
    }
    return byInstanceId;
  }, [pixiBattlefieldModel.cards, rendererReplayCommands]);
  const rendererReplayCommandCountText = `${Math.min(
    rendererReplay.commandIndex,
    rendererReplayCommands.length
  )} / ${rendererReplayCommands.length}`;
  const rendererReplayLatestSummary =
    rendererReplay.latestCommandSummary ?? "No command visualized yet.";
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
  const rendererInspectorIsEnemy = selectedEngagementRef?.type === "encounterBoard";
  const rendererInspection = rendererInspectorIsEnemy
    ? selectedEnemyInspection
    : selectedAllyInspection;
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
    setPriorityMatch(createPriorityLabMatch());
    setLastRecordedCombat(undefined);
    setSelectedAllyCardRef(undefined);
    setSelectedEnemyCardRef(undefined);
    setSelectedEngagementRef(undefined);
    setRendererPlacementCardId(undefined);
    setRendererReplay((current) => resetPixiReplay(current));
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
    setRendererPlacementCardId(undefined);
    setSelectedAllyCardRef({ type: "run", cardInstanceId });
    if (action.type === "placeOnBoard") {
      setSelectedEngagementRef({ type: "run", cardInstanceId });
      setRendererReplay((current) => resetPixiReplay(current));
    }
  };

  const renderLoadoutActions = (cardInstanceId: CardInstanceId) => {
    const actions = getLegalLoadoutActions(run, sampleCatalog, cardInstanceId);
    const selectRunCard = () => {
      setRendererPlacementCardId(undefined);
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

  const inspectCommander = () => {
    if (!run.commander) {
      return;
    }

    const cardInstanceId = run.commander.card.instanceId;
    setRendererPlacementCardId(undefined);
    setSelectedAllyCardRef({ type: "run", cardInstanceId });
    if (run.commander.card.zone === "board") {
      setSelectedEngagementRef({ type: "run", cardInstanceId });
    }
  };

  const deployCommanderFromCommand = () => {
    const cardInstanceId = run.commander?.card.instanceId;
    if (!cardInstanceId) {
      return;
    }

    setRun((currentRun) => {
      const position = getDefaultCommanderPosition(currentRun, sampleCatalog);
      if (!position || !canDeployCommander(currentRun, sampleCatalog, position).ok) {
        return currentRun;
      }
      return applyRunAction(currentRun, sampleCatalog, {
        type: "deployCommander",
        position
      });
    });
    setRendererPlacementCardId(undefined);
    setSelectedAllyCardRef({ type: "run", cardInstanceId });
    setSelectedEngagementRef({ type: "run", cardInstanceId });
    setRendererReplay((current) => resetPixiReplay(current));
  };

  const returnCommanderFromBoard = () => {
    const cardInstanceId = run.commander?.card.instanceId;
    if (!cardInstanceId) {
      return;
    }

    setRun((currentRun) =>
      canReturnCommanderToCommand(currentRun).ok
        ? applyRunAction(currentRun, sampleCatalog, {
            type: "returnCommanderToCommand"
          })
        : currentRun
    );
    setRendererPlacementCardId(undefined);
    setSelectedAllyCardRef({ type: "run", cardInstanceId });
    setSelectedEngagementRef(undefined);
    setRendererReplay((current) => resetPixiReplay(current));
  };

  const renderCommandZonePanel = (variant: "panel" | "renderer-lab-panel") => {
    const commander = run.commander;
    const Heading = variant === "panel" ? "h2" : "h3";
    const commanderName = commander ? cardName(commander.card.defId) : "None";
    const blockedReasons = [
      commanderDeployCheck.ok ? "" : `Deploy Commander: ${commanderDeployCheck.reason}`,
      commanderReturnCheck.ok ? "" : `Return to Command: ${commanderReturnCheck.reason}`
    ].filter((line) => line.length > 0);

    return (
      <div className={variant} data-testid="command-zone-panel">
        <Heading>Command Zone</Heading>
        <dl className="run-stats">
          <div>
            <dt>Commander</dt>
            <dd data-testid="command-zone-card-name">{commanderName}</dd>
          </div>
          <div>
            <dt>Zone</dt>
            <dd data-testid="command-zone-location">{commander?.card.zone ?? "none"}</dd>
          </div>
          <div>
            <dt>Deploy Count</dt>
            <dd data-testid="commander-deploy-count">{commander?.deployCount ?? 0}</dd>
          </div>
          <div>
            <dt>Rebind Tax</dt>
            <dd data-testid="commander-rebind-tax">{commander?.rebindTax ?? 0}</dd>
          </div>
        </dl>
        <p className="muted">
          Prototype Commander. Rebind Tax is visible-only until cost enforcement lands.
        </p>
        <div className="mini-actions">
          <button
            type="button"
            className="secondary"
            onClick={inspectCommander}
            disabled={!commander}
          >
            Inspect
          </button>
          <button
            type="button"
            onClick={deployCommanderFromCommand}
            disabled={!commanderDeployCheck.ok}
          >
            Deploy Commander
          </button>
          <button
            type="button"
            onClick={returnCommanderFromBoard}
            disabled={!commanderReturnCheck.ok}
          >
            Return to Command
          </button>
        </div>
        {blockedReasons.length > 0 ? (
          <ul className="message-list compact">
            {blockedReasons.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
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
    setRendererPlacementCardId(undefined);
    setSelectedEnemyCardRef({ type: "encounterBoard", cardInstanceId });
    setSelectedEngagementRef({ type: "encounterBoard", cardInstanceId });
  };

  const inspectEncounterSource = (cardInstanceId: CardInstanceId) => {
    setRendererPlacementCardId(undefined);
    setSelectedEnemyCardRef({ type: "encounterSource", cardInstanceId });
  };

  const inspectEncounterSpellrail = (cardInstanceId: CardInstanceId) => {
    setRendererPlacementCardId(undefined);
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
    setRendererPlacementCardId(undefined);
    setRendererReplay((current) => resetPixiReplay(current));
    setRun((currentRun) =>
      applyRunAction(currentRun, sampleCatalog, { type: "advanceRunAfterCombat" })
    );
  };

  const submitPriorityPrototypeAction = () => {
    if (!availablePriorityPrototypeActionSource) {
      return;
    }

    setPriorityMatch((currentMatch) =>
      submitPrototypePressureActionFromRun({
        match: currentMatch,
        run,
        catalog: sampleCatalog,
        actor: "player",
        cardInstanceId: availablePriorityPrototypeActionSource.cardInstanceId
      })
    );
  };

  const passPriorityAsPlayer = () => {
    setPriorityMatch((currentMatch) => passEncounterPriority(currentMatch, "player"));
  };

  const passPriorityAsEnemy = () => {
    setPriorityMatch((currentMatch) => passEncounterPriority(currentMatch, "enemy"));
  };

  const runPrioritySkirmish = () => {
    if (!priorityLabCombat) {
      return;
    }

    setPriorityMatch((currentMatch) =>
      recordEncounterCombatSkirmish(currentMatch, priorityLabCombat)
    );
  };

  const resetPriorityLab = () => {
    setPriorityMatch(createPriorityLabMatch());
  };

  const playRendererReplay = () => {
    setRendererReplay((current) =>
      playPixiReplay(current, rendererReplayCommands.length)
    );
  };

  const pauseRendererReplay = () => {
    setRendererReplay((current) => pausePixiReplay(current));
  };

  const stepRendererReplay = () => {
    setRendererReplay((current) =>
      stepPixiReplay(current, rendererReplayCommands.length)
    );
  };

  const resetRendererReplay = () => {
    setRendererReplay((current) => resetPixiReplay(current));
  };

  const completeRendererReplayCommand = (
    nextCommandIndex: number,
    command: PixiReplayCommand
  ) => {
    setRendererReplay((current) =>
      completePixiReplayCommand(
        current,
        rendererReplayCommands.length,
        nextCommandIndex,
        command,
        { cardNameByInstanceId: rendererReplayCardNameByInstanceId }
      )
    );
  };

  const selectPixiToken = (card: PixiBattlefieldCard) => {
    setRendererPlacementCardId(undefined);
    if (card.side === "playerA") {
      setSelectedAllyCardRef({ type: "run", cardInstanceId: card.cardInstanceId });
      setSelectedEngagementRef({ type: "run", cardInstanceId: card.cardInstanceId });
      return;
    }

    setSelectedEnemyCardRef({
      type: "encounterBoard",
      cardInstanceId: card.cardInstanceId
    });
    setSelectedEngagementRef({
      type: "encounterBoard",
      cardInstanceId: card.cardInstanceId
    });
  };

  const placeRendererCardOnCell = (position: BoardPosition) => {
    if (
      !rendererPlacementCardId ||
      !rendererPlaceablePositions.some((candidate) =>
        sameBoardPosition(candidate, position)
      )
    ) {
      return;
    }

    const cardInstanceId = rendererPlacementCardId;
    setRun((currentRun) => {
      const check = canPlaceCardOnBoard(
        currentRun,
        sampleCatalog,
        cardInstanceId,
        position
      );
      if (!check.ok) {
        return currentRun;
      }

      return applyRunAction(currentRun, sampleCatalog, {
        type: "placeCardOnBoard",
        cardInstanceId,
        position
      });
    });
    setSelectedAllyCardRef({ type: "run", cardInstanceId });
    setSelectedEngagementRef({ type: "run", cardInstanceId });
    setRendererPlacementCardId(undefined);
    setRendererReplay((current) => resetPixiReplay(current));
  };

  const selectRendererPlacementCard = (cardInstanceId: CardInstanceId) => {
    setRendererPlacementCardId(cardInstanceId);
    setSelectedAllyCardRef({ type: "run", cardInstanceId });
  };

  const renderRendererPoolActions = (card: CardInstance) => {
    const actions = getLegalLoadoutActions(run, sampleCatalog, card.instanceId);
    const placeAction = actions.find((action) => action.type === "placeOnBoard");
    const directActions = actions.filter((action) => action.type !== "placeOnBoard");

    return (
      <div className="mini-actions">
        <button
          type="button"
          className="secondary"
          onClick={() => {
            setRendererPlacementCardId(undefined);
            setSelectedAllyCardRef({ type: "run", cardInstanceId: card.instanceId });
          }}
        >
          Inspect
        </button>
        {placeAction ? (
          <button
            type="button"
            onClick={() => selectRendererPlacementCard(card.instanceId)}
          >
            Select Board Cell
          </button>
        ) : null}
        {directActions.map((action) => (
          <button
            key={`${card.instanceId}:${action.type}`}
            type="button"
            onClick={() => performLoadoutAction(card.instanceId, action)}
          >
            {action.label}
          </button>
        ))}
        {actions.length === 0 && editable ? <small>No legal action</small> : null}
      </div>
    );
  };

  const renderHexArena = () => (
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
              setRendererPlacementCardId(undefined);
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
  );

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

      {!isRendererLab ? (
        <section className="battlefield-section" aria-labelledby="battlefield-heading">
          <div className="battlefield-header">
            <div>
              <h2 id="battlefield-heading">Battlefield</h2>
              <p className="muted">
                Automatic combat setup for round {run.currentRound}. Inspect one ally and
                one enemy at the same time to compare stats, keywords, and targeting
                clues.
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

            {renderHexArena()}

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
      ) : null}

      {isRendererLab ? (
        <section className="renderer-lab-section" aria-labelledby="renderer-lab-heading">
          <div className="renderer-lab-header">
            <div>
              <h2 id="renderer-lab-heading">Pixi Renderer Lab</h2>
              <p className="muted">
                Pixi is the primary battlefield on this route. The React/CSS board is
                available in the collapsed debug fallback below.
              </p>
            </div>
            <div className="button-row">
              <button
                type="button"
                onClick={playRendererReplay}
                disabled={
                  !rendererLabCombat ||
                  rendererReplayCommands.length === 0 ||
                  rendererReplay.status === "playing"
                }
              >
                {rendererReplay.status === "paused" ? "Resume Replay" : "Play Replay"}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={pauseRendererReplay}
                disabled={rendererReplay.status !== "playing"}
              >
                Pause Replay
              </button>
              <button
                type="button"
                className="secondary"
                onClick={stepRendererReplay}
                disabled={
                  !rendererLabCombat ||
                  rendererReplayCommands.length === 0 ||
                  rendererReplay.status === "playing" ||
                  rendererReplay.status === "complete"
                }
              >
                Step Replay
              </button>
              <button type="button" className="secondary" onClick={resetRendererReplay}>
                Reset Replay
              </button>
            </div>
          </div>

          <div className="renderer-lab-main">
            <div className="renderer-lab-stage">
              <PixiBattlefieldRenderer
                model={pixiBattlefieldModel}
                replayCommands={rendererReplayCommands}
                replayStatus={rendererReplay.status}
                replayCommandIndex={rendererReplay.commandIndex}
                replayResetKey={rendererReplay.resetKey}
                replayStepRequestKey={rendererReplay.stepRequestKey}
                onReplayCommandComplete={completeRendererReplayCommand}
                onTokenSelect={selectPixiToken}
                onCellSelect={placeRendererCardOnCell}
              />
              <EngagementPreviewPanel preview={engagementPreview} />
              {rendererPlacementCard ? (
                <p className="renderer-placement-hint">
                  Placing {cardName(rendererPlacementCard.defId)}. Legal Pixi cells are
                  highlighted.
                </p>
              ) : null}
            </div>
            <aside className="renderer-lab-panel renderer-inspector-panel">
              <h3>Pixi Inspector</h3>
              <CardInspectorView
                inspection={rendererInspection}
                emptyText="Select a unit or support token on the Pixi battlefield."
                showLegalActions={!rendererInspectorIsEnemy}
              />
              <h3>Renderer Feed</h3>
              <dl className="run-stats">
                <div>
                  <dt>Shared field units</dt>
                  <dd>{pixiBattlefieldModel.cards.length}</dd>
                </div>
                <div>
                  <dt>Replay events</dt>
                  <dd>{rendererLabCombat?.events.length ?? 0}</dd>
                </div>
                <div>
                  <dt>Replay status</dt>
                  <dd data-testid="renderer-replay-status">{rendererReplay.status}</dd>
                </div>
                <div>
                  <dt>Replay command</dt>
                  <dd data-testid="renderer-replay-command-index">
                    {rendererReplayCommandCountText}
                  </dd>
                </div>
                <div>
                  <dt>Winner</dt>
                  <dd>{rendererLabCombat?.winner ?? "none"}</dd>
                </div>
                <div>
                  <dt>Visualized</dt>
                  <dd>appear/recall, move, attack, damage, destroyed</dd>
                </div>
              </dl>
              <p className="renderer-replay-latest" data-testid="renderer-replay-latest">
                {rendererReplayLatestSummary}
              </p>
              <h3>Preview</h3>
              <ul className="message-list compact">
                <li>Selected halo, range glow, likely target ring, and next move.</li>
                <li>Unit circles show larger nameplates plus ATK / HP / RNG chips.</li>
                <li>Support and Relic-style permanents use support plates.</li>
                <li>Player tokens use cool cyan; enemy tokens use ember red.</li>
              </ul>
              {rendererLabCombatDisplaySummary ? (
                <>
                  <h3>Combat Feed Sample</h3>
                  <CombatSummaryView summary={rendererLabCombatDisplaySummary} />
                </>
              ) : (
                <p className="muted">No deterministic combat result is available.</p>
              )}
            </aside>
          </div>

          <div className="renderer-lab-loadout-grid">
            {renderCommandZonePanel("renderer-lab-panel")}

            <div className="renderer-lab-panel">
              <h3>Loadout Resources</h3>
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
                  <dt>Source Row</dt>
                  <dd>{resourceSummary.sourceSlotsText}</dd>
                </div>
                <div>
                  <dt>Spellrail</dt>
                  <dd>
                    {run.spellrail.cards.length} / {run.spellrail.maxSlots}
                  </dd>
                </div>
                <div>
                  <dt>Combat Charge/sec</dt>
                  <dd>{resourceSummary.combatChargePerSecondText}</dd>
                </div>
              </dl>
              <p className="muted">
                Pool/Bench cards are inactive. Source Row provides Charge and aspects.
                Spellrail holds Techniques.
              </p>
            </div>

            <div className="renderer-lab-panel">
              <h3>Board</h3>
              <p className="muted">Active board permanents use Board Charge.</p>
              <ol className="card-list compact">
                {run.board.placements.length > 0 ? (
                  run.board.placements.map((placement) => (
                    <li key={placement.cardInstanceId}>
                      <span>{cardName(placement.defId)}</span>
                      <small>
                        r{placement.position.row} c{placement.position.col}{" "}
                        {placement.position.layer}
                      </small>
                      {renderLoadoutActions(placement.cardInstanceId)}
                    </li>
                  ))
                ) : (
                  <li>
                    <span>None</span>
                  </li>
                )}
              </ol>
            </div>

            <div className="renderer-lab-panel">
              <h3>Source Row</h3>
              <p className="muted">Sources define capacity, aspect access, and charge.</p>
              <ol className="card-list compact">
                {run.sourceRow.cards.map((card) => (
                  <li key={card.instanceId}>
                    <span>{cardName(card.defId)}</span>
                    <small>{card.zone}</small>
                    {renderLoadoutActions(card.instanceId)}
                  </li>
                ))}
              </ol>
            </div>

            <div className="renderer-lab-panel">
              <h3>Spellrail</h3>
              <p className="muted">
                Techniques queue here for the current prototype loop.
              </p>
              <ol className="card-list compact">
                {run.spellrail.cards.length > 0 ? (
                  run.spellrail.cards.map((card) => (
                    <li key={card.instanceId}>
                      <span>{cardName(card.defId)}</span>
                      <small>{card.zone}</small>
                      {renderLoadoutActions(card.instanceId)}
                    </li>
                  ))
                ) : (
                  <li>
                    <span>None</span>
                  </li>
                )}
              </ol>
            </div>

            <div className="renderer-lab-panel wide">
              <h3>Pool / Bench</h3>
              <p className="muted">
                Select a board-placeable card, then click a highlighted Pixi cell.
              </p>
              <ol className="card-list compact">
                {run.pool.length > 0 ? (
                  run.pool.map((card) => (
                    <li
                      key={card.instanceId}
                      className={
                        rendererPlacementCardId === card.instanceId
                          ? "pending-placement-card"
                          : undefined
                      }
                    >
                      <span>{cardName(card.defId)}</span>
                      <small>Pool / Bench</small>
                      {renderRendererPoolActions(card)}
                    </li>
                  ))
                ) : (
                  <li>
                    <span>No Pool / Bench cards</span>
                  </li>
                )}
              </ol>
            </div>
          </div>

          <details className="renderer-debug-board">
            <summary>React/CSS Debug Board</summary>
            <div className="renderer-debug-board-inner">{renderHexArena()}</div>
          </details>
        </section>
      ) : null}

      {activeDebugScenarioId === DEBUG_PRIORITY_SCENARIO_ID ? (
        <PriorityLabPanel
          match={priorityMatch}
          canRunCombat={
            priorityMatch.phase === "combat" && priorityLabCombat !== undefined
          }
          prototypeActionSource={priorityPrototypeActionSource}
          canSubmitPrototypeAction={availablePriorityPrototypeActionSource !== undefined}
          prototypeActionSourceUnavailableText={
            priorityPrototypeActionSource
              ? `${priorityPrototypeActionSource.cardName} is already queued or used this encounter.`
              : "No valid player Spellrail Technique source."
          }
          onSubmitPrototypeAction={submitPriorityPrototypeAction}
          onPassPlayer={passPriorityAsPlayer}
          onPassEnemy={passPriorityAsEnemy}
          onRunSkirmish={runPrioritySkirmish}
          onReset={resetPriorityLab}
        />
      ) : null}

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

        {renderCommandZonePanel("panel")}

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
