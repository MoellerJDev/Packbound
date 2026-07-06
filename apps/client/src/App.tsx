import { useMemo, useState } from "react";

import { sampleCatalog } from "@packbound/content";
import {
  applyRunAction,
  buildBoardGridSummary,
  buildEngagementPreview,
  buildLoadoutResourceSummary,
  buildPostPackLoadoutSuggestions,
  buildRewardOfferExplanations,
  buildRunTraitSummary,
  buildCombatantSetupForEncounter,
  buildCombatantSetupForRun,
  buildEncounterCombatChargeProfileForRun,
  canApplyReward,
  canDeployCommander,
  canEditLoadout,
  canPlaceCardOnBoard,
  canRecordCombat,
  canReturnCommanderToCommand,
  createEncounterMatch,
  createRunFromStarterKit,
  passEncounterPriority,
  getCommanderDeploymentCandidatePosition,
  getCommanderEffectiveRebindTax,
  getDefaultCommanderPosition,
  getCurrentEncounter,
  getCurrentCommanderUpgradeChoices,
  getCurrentRewardChoices,
  getLatestOpenedPackCardInstanceIds,
  getLegalLoadoutActions,
  getUpgradeProgressGroups,
  getRunPhase,
  getRunNextActionMessage,
  inspectEncounterCard,
  inspectRunCard,
  recordEncounterCombatSkirmish,
  submitCommanderRallyActionFromRun,
  submitPrototypePressureActionFromRun,
  submitTargetProbeActionFromEncounterBoard,
  validateRunLoadout,
  type CombatResultLike,
  type CommanderUpgradeId,
  type EngagementPreviewSide,
  type EncounterCombatChargeProfile,
  type EncounterMatchState,
  type LoadoutAction,
  type RunState,
  type UpgradeProgressGroup
} from "@packbound/rules";
import {
  BOARD_COLS,
  BOARD_ROWS,
  asPlayerId,
  chargeCostTotal,
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

import {
  BattlefieldSection,
  type BattlefieldSectionController,
  type BattlefieldSectionView
} from "./components/BattlefieldSection";
import {
  DefaultPixiBattlefieldSection,
  type DefaultPixiBattlefieldController,
  type DefaultPixiBattlefieldView
} from "./components/DefaultPixiBattlefieldSection";
import type {
  LastRecordedCombatPanelView,
  UpcomingCombatPanelView
} from "./components/CombatResultPanel";
import type { CommandZonePanelView } from "./components/CommandZonePanel";
import type { CommanderUpgradePanelView } from "./components/CommanderUpgradePanel";
import {
  HexArenaView,
  type HexArenaController,
  type HexArenaViewData
} from "./components/HexArenaView";
import type { LoadoutZonesPanelView } from "./components/LoadoutZonesPanel";
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
import type { RunGuideStat, RunGuideStep } from "./components/RunGuidePanel";
import {
  DEBUG_PRIORITY_SCENARIO_ID,
  DEBUG_RENDERER_SCENARIO_ID,
  applyDebugScenario,
  debugScenarioFromSearch
} from "./debugScenarios";
import {
  DefaultRunRoute,
  type DefaultRunRouteController,
  type DefaultRunRouteView
} from "./routes/DefaultRunRoute";
import {
  RendererLabRoute,
  type RendererLabRouteController,
  type RendererLabRouteView
} from "./routes/RendererLabRoute";
import {
  PriorityLabRoute,
  buildPriorityLabRouteView,
  type PriorityLabRouteController
} from "./routes/PriorityLabRoute";
import { useDefaultPixiPlacement } from "./hooks/useDefaultPixiPlacement";
import {
  buildDefaultPixiLoadoutEditView,
  type DefaultPixiZoneEditAction
} from "./viewModels/defaultPixiLoadoutEditView";
import { buildDefaultPixiCommanderEditView } from "./viewModels/defaultPixiCommanderEditView";
import { sameBoardPosition } from "./viewModels/defaultPixiPlacementView";

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
const PRIORITY_LAB_TARGET_PLAYER_COMBAT_CHARGE = 3;
type PriorityLabCombatChargeSetup = {
  readonly profile: EncounterCombatChargeProfile;
  readonly debugTopUp: number;
  readonly playerCombatCharge: number;
};
const priorityLabCombatChargeSetupForRun = (
  run: RunState
): PriorityLabCombatChargeSetup => {
  const profile = buildEncounterCombatChargeProfileForRun(run, sampleCatalog);
  const debugTopUp = Math.max(
    0,
    PRIORITY_LAB_TARGET_PLAYER_COMBAT_CHARGE - profile.startingCombatCharge
  );

  return {
    profile,
    debugTopUp,
    playerCombatCharge: profile.startingCombatCharge + debugTopUp
  };
};
const createPriorityLabMatch = (
  chargeSetup: PriorityLabCombatChargeSetup
): EncounterMatchState =>
  createEncounterMatch({
    matchId: "debug-priority-lab",
    seed: "client-debug-priority-lab",
    playerCombatCharge: chargeSetup.playerCombatCharge
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

export function App() {
  const isDefaultRoute = activeDebugScenarioId === undefined;
  const isRendererLab = activeDebugScenarioId === DEBUG_RENDERER_SCENARIO_ID;
  const showDeveloperDetails = activeDebugScenarioId !== undefined;
  const [selectedStarterKitId, setSelectedStarterKitId] = useState(firstStarterKitId);
  const [run, setRun] = useState(() => createDebugRun(firstStarterKitId));
  const [priorityMatch, setPriorityMatch] = useState(() =>
    createPriorityLabMatch(priorityLabCombatChargeSetupForRun(run))
  );
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
  const [selectedTargetProbeCardInstanceId, setSelectedTargetProbeCardInstanceId] =
    useState<CardInstanceId | undefined>();
  const phase = getRunPhase(run);
  const rewardChoices = useMemo(() => getCurrentRewardChoices(run, sampleCatalog), [run]);
  const commanderUpgradeChoices = useMemo(
    () => getCurrentCommanderUpgradeChoices(run),
    [run]
  );
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
  const priorityLabCombatChargeSetup = useMemo(
    () => priorityLabCombatChargeSetupForRun(run),
    [run]
  );
  const traitSummary = useMemo(() => buildRunTraitSummary(run, sampleCatalog), [run]);
  const upgradeProgressGroups = useMemo(
    () => getUpgradeProgressGroups(run, sampleCatalog),
    [run]
  );
  const readyUpgradeGroups = useMemo(
    () => upgradeProgressGroups.filter((group) => group.canUpgrade),
    [upgradeProgressGroups]
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
  const commanderCandidatePosition = useMemo(
    () => getCommanderDeploymentCandidatePosition(run, sampleCatalog),
    [run]
  );
  const commanderDefaultPosition = useMemo(
    () => getDefaultCommanderPosition(run, sampleCatalog),
    [run]
  );
  const commanderDefinition = run.commander
    ? sampleCatalog.cardsById.get(run.commander.card.defId)
    : undefined;
  const commanderBaseBoardCharge = chargeCostTotal(commanderDefinition?.cost);
  const commanderRawRebindTax = run.commander?.rebindTax ?? 0;
  const commanderRebindTaxDiscount = run.commander?.rebindTaxDiscount ?? 0;
  const commanderEffectiveRebindTax = getCommanderEffectiveRebindTax(run.commander);
  const commanderDeployBoardCharge =
    commanderBaseBoardCharge + commanderEffectiveRebindTax;
  const commanderBoardChargeAfterDeploy =
    run.commander?.card.zone === "board"
      ? resourceSummary.boardChargeUsed
      : resourceSummary.boardChargeUsed + commanderDeployBoardCharge;
  const commanderDeployCheck = useMemo(() => {
    if (!run.commander) {
      return { ok: false as const, reason: "Run has no Commander." };
    }
    if (run.commander.card.zone !== "command") {
      return { ok: false as const, reason: "Commander is already deployed." };
    }
    if (!commanderDefaultPosition && commanderCandidatePosition) {
      return canDeployCommander(run, sampleCatalog, commanderCandidatePosition);
    }
    if (!commanderDefaultPosition) {
      return {
        ok: false as const,
        reason: "No legal Commander deployment tile is available."
      };
    }
    return canDeployCommander(run, sampleCatalog, commanderDefaultPosition);
  }, [commanderCandidatePosition, commanderDefaultPosition, run]);
  const commanderReturnCheck = useMemo(() => canReturnCommanderToCommand(run), [run]);

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
  const priorityLabRouteView = useMemo(
    () =>
      buildPriorityLabRouteView({
        canRunCombat: priorityMatch.phase === "combat" && priorityLabCombat !== undefined,
        catalog: sampleCatalog,
        combatChargeProfile: priorityLabCombatChargeSetup.profile,
        currentEncounterBoard: currentEncounter?.loadout.board,
        debugCombatChargeTopUp: priorityLabCombatChargeSetup.debugTopUp,
        match: priorityMatch,
        run,
        selectedTargetProbeCardInstanceId
      }),
    [
      currentEncounter,
      priorityLabCombat,
      priorityLabCombatChargeSetup,
      priorityMatch,
      run,
      selectedTargetProbeCardInstanceId
    ]
  );
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
  const postPackSuggestions = useMemo(
    () => buildPostPackLoadoutSuggestions(run, sampleCatalog),
    [run]
  );
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
  const pixiPlacement = useDefaultPixiPlacement({
    boardCols: BOARD_COLS,
    boardRows: BOARD_ROWS,
    catalog: sampleCatalog,
    isDefaultRoute,
    run
  });
  const pixiPlacementCard = pixiPlacement.view.selectedPlacementCard;
  const pixiPlaceablePositions = pixiPlacement.view.placeablePositions;
  const selectedCardIdForPixiZoneEdit =
    selectedAllyCardRef?.type === "run" ? selectedAllyCardRef.cardInstanceId : undefined;
  const pixiLoadoutEditView = useMemo(
    () =>
      buildDefaultPixiLoadoutEditView({
        catalog: sampleCatalog,
        run,
        selectedCardId: selectedCardIdForPixiZoneEdit
      }),
    [run, selectedCardIdForPixiZoneEdit]
  );
  const pixiBattlefieldModel = useMemo(
    () =>
      buildPixiBattlefieldModel({
        playerBoard: playerBoardGrid,
        ...(encounterBoardGrid ? { enemyBoard: encounterBoardGrid } : {}),
        engagementPreview,
        ...(isDefaultRoute || isRendererLab
          ? { placeablePositions: pixiPlaceablePositions }
          : {})
      }),
    [
      encounterBoardGrid,
      engagementPreview,
      isDefaultRoute,
      isRendererLab,
      playerBoardGrid,
      pixiPlaceablePositions
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
  const packRewardClaimedThisRound = run.rewardHistory.some(
    (entry) => entry.type === "pack" && entry.round === run.currentRound
  );
  const commanderUpgradeClaimedThisRound =
    !run.commander ||
    run.commander.upgradeHistory.some((entry) => entry.round === run.currentRound);
  const runGuideSteps = useMemo<readonly RunGuideStep[]>(() => {
    const rewardBucketsDone =
      packRewardClaimedThisRound && commanderUpgradeClaimedThisRound;
    return [
      {
        label: "Prepare your loadout",
        detail: validation.ok
          ? "Board, Sources, Spellrail, and Commander are legal."
          : "Fix the blocked loadout item before combat.",
        state:
          phase === "planning"
            ? validation.ok
              ? "done"
              : "blocked"
            : phase === "complete"
              ? "done"
              : "done"
      },
      {
        label: "Start combat",
        detail:
          phase === "planning" && validation.ok
            ? "Click Ready Combat when the board looks good."
            : "Combat can start after the loadout is legal.",
        state:
          phase === "planning"
            ? validation.ok
              ? "active"
              : "todo"
            : phase === "complete"
              ? "done"
              : "done"
      },
      {
        label: "Review combat",
        detail:
          phase === "combatReady"
            ? "Check the preview, then Record Combat."
            : latestCombatSummary
              ? "Latest combat is summarized below."
              : "Combat results appear after recording.",
        state:
          phase === "combatReady"
            ? "active"
            : phase === "planning" && !latestCombatSummary
              ? "todo"
              : latestCombatSummary || phase === "reward" || phase === "combatResolved"
                ? "done"
                : "todo"
      },
      {
        label: "Choose rewards",
        detail:
          phase === "reward"
            ? rewardBucketsDone
              ? "Pack and Commander rewards are claimed."
              : "Open one pack and choose one Commander upgrade."
            : "Rewards unlock after combat.",
        state:
          phase === "reward"
            ? rewardBucketsDone
              ? "done"
              : "active"
            : phase === "combatResolved" || phase === "planning"
              ? rewardBucketsDone && latestCombatSummary
                ? "done"
                : "todo"
              : "todo"
      },
      {
        label: "Advance to next fight",
        detail:
          phase === "combatResolved"
            ? "Click Advance to enter the next planning round."
            : "Advance becomes available after rewards are complete.",
        state:
          phase === "combatResolved" ? "active" : phase === "complete" ? "done" : "todo"
      }
    ];
  }, [
    commanderUpgradeClaimedThisRound,
    latestCombatSummary,
    packRewardClaimedThisRound,
    phase,
    validation.ok
  ]);
  const latestCommanderCombatReturn =
    latestCombatSummary && run.commander
      ? run.commander.lifecycleHistory
          .slice()
          .reverse()
          .find(
            (entry) =>
              entry.round === latestCombatSummary.round &&
              entry.type === "destroyed_to_command"
          )
      : undefined;
  const commandZoneBlockedReasons = [
    commanderDeployCheck.ok ? "" : `Deploy Commander: ${commanderDeployCheck.reason}`,
    commanderReturnCheck.ok ? "" : `Return to Command: ${commanderReturnCheck.reason}`
  ].filter((line) => line.length > 0);
  const commandZoneView = {
    boardChargeAfterDeploy: commanderBoardChargeAfterDeploy,
    boardChargeCapacity: resourceSummary.boardChargeCapacity,
    blockedReasons: commandZoneBlockedReasons,
    commanderName: run.commander ? cardName(run.commander.card.defId) : "None",
    deployBoardCharge: commanderDeployBoardCharge,
    deployCount: run.commander?.deployCount ?? 0,
    effectiveRebindTax: commanderEffectiveRebindTax,
    hasCommander: run.commander !== undefined,
    lifecycleEntries: (run.commander?.lifecycleHistory ?? []).slice(-5).reverse(),
    rawRebindTax: commanderRawRebindTax,
    rebindTaxDiscount: commanderRebindTaxDiscount,
    baseBoardCharge: commanderBaseBoardCharge,
    upgradeLevel: run.commander?.card.upgradeLevel ?? 0,
    zone: run.commander?.card.zone ?? "none"
  } satisfies CommandZonePanelView;
  const pixiCommanderEditView = buildDefaultPixiCommanderEditView({
    commanderName: commandZoneView.commanderName,
    deployBlockedReason: commanderDeployCheck.ok
      ? undefined
      : commanderDeployCheck.reason,
    hasCommander: commandZoneView.hasCommander,
    returnBlockedReason: commanderReturnCheck.ok
      ? undefined
      : commanderReturnCheck.reason,
    zone: commandZoneView.zone
  });
  const commanderUpgradePanelView = {
    choices: commanderUpgradeChoices,
    currentLevel: run.commander?.card.upgradeLevel ?? 0,
    effectiveRebindTax: commanderEffectiveRebindTax,
    history: run.commander?.upgradeHistory ?? [],
    phase,
    rawRebindTax: commanderRawRebindTax,
    rebindTaxDiscount: commanderRebindTaxDiscount
  } satisfies CommanderUpgradePanelView;
  const loadoutZonesView = {
    activeCards: run.activeCards,
    boardPlacements: run.board.placements,
    editable,
    isDefaultRoute,
    latestOpenedCardNames,
    latestOpenedPack,
    latestPackName,
    latestRewardCardIds,
    latestRewardHistoryEntry,
    phase,
    poolCards: run.pool,
    readyUpgradeGroups,
    resourceSummary,
    sourceCards: run.sourceRow.cards,
    spellrailCards: run.spellrail.cards,
    upgradeProgressByCardId,
    upgradeProgressGroups
  } satisfies LoadoutZonesPanelView;
  const rewardChoicesDescription = canApplyReward(run)
    ? rewardChoices.length > 0
      ? "Choose one pack. New cards go to the Pool for the next planning step."
      : commanderUpgradeClaimedThisRound
        ? "Pack reward claimed. Advance when ready."
        : "Pack reward claimed. Choose a Commander upgrade to finish rewards."
    : "Rewards appear after combat is recorded.";
  const runGuideStats = [
    {
      label: "Round",
      value: (
        <>
          {run.currentRound} / {run.maxRounds}
        </>
      )
    },
    { label: "Health", value: run.playerHealth },
    { label: "Gold", value: run.playerGold },
    { label: "Phase", value: phase },
    { label: "Starter", value: starterKitName }
  ] satisfies readonly RunGuideStat[];
  const runGuideDetails = [
    { label: "Seed", value: run.seed },
    { label: "Status", value: run.status }
  ] satisfies readonly RunGuideStat[];
  const lastRecordedCombatPanelView = {
    commanderReturnedToCommand: latestCommanderCombatReturn !== undefined,
    displaySummary: lastRecordedCombatDisplaySummary,
    emptyText:
      "Compact run summary is available; full event details are not stored in run state.",
    flowNote: latestCombatSummary
      ? `Combat recorded: ${latestCombatSummary.winner}. You gained ${
          latestCombatSummary.goldEarned
        } gold. ${
          phase === "reward"
            ? "Claim one pack and one Commander upgrade before advancing."
            : packRewardClaimedThisRound && commanderUpgradeClaimedThisRound
              ? "Rewards are complete; Advance starts the next planning round."
              : "Finish any remaining reward before advancing."
        }`
      : "",
    rawDebugValue: {
      round: lastRecordedCombat?.round,
      encounterId: lastRecordedCombat?.encounterId,
      runSummary: latestCombatSummary,
      events: lastRecordedCombat?.result.events ?? [],
      warnings: lastRecordedCombat?.result.warnings ?? []
    },
    summary: latestCombatSummary
  } satisfies LastRecordedCombatPanelView;
  const upcomingCombatPanelView =
    combat && upcomingCombatDisplaySummary
      ? ({
          combat,
          currentEncounterId: currentEncounter?.id,
          displaySummary: upcomingCombatDisplaySummary,
          phase
        } satisfies UpcomingCombatPanelView)
      : undefined;

  const resetRun = (starterKitId = selectedStarterKitId) => {
    const nextRun = createDebugRun(starterKitId);
    const nextPriorityChargeSetup = priorityLabCombatChargeSetupForRun(nextRun);
    setSelectedStarterKitId(starterKitId);
    setRun(nextRun);
    setPriorityMatch(createPriorityLabMatch(nextPriorityChargeSetup));
    setLastRecordedCombat(undefined);
    setSelectedAllyCardRef(undefined);
    setSelectedEnemyCardRef(undefined);
    setSelectedEngagementRef(undefined);
    pixiPlacement.controller.clearPlacement();
    setSelectedTargetProbeCardInstanceId(undefined);
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
    pixiPlacement.controller.clearPlacement();
    setSelectedAllyCardRef({ type: "run", cardInstanceId });
    if (action.type === "placeOnBoard") {
      setSelectedEngagementRef({ type: "run", cardInstanceId });
      setRendererReplay((current) => resetPixiReplay(current));
    }
  };

  const renderLoadoutActions = (cardInstanceId: CardInstanceId) => {
    const actions = getLegalLoadoutActions(run, sampleCatalog, cardInstanceId);
    const placeAction = actions.find((action) => action.type === "placeOnBoard");
    const selectRunCard = () => {
      pixiPlacement.controller.clearPlacement();
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
          {editable ? <small>Inspect for blocked reason</small> : null}
        </div>
      );
    }

    return (
      <div className="mini-actions">
        {inspectButton}
        {isDefaultRoute && placeAction ? (
          <button type="button" onClick={() => selectPixiPlacementCard(cardInstanceId)}>
            Select Board Cell
          </button>
        ) : null}
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
    pixiPlacement.controller.clearPlacement();
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
    pixiPlacement.controller.clearPlacement();
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
    pixiPlacement.controller.clearPlacement();
    setSelectedAllyCardRef({ type: "run", cardInstanceId });
    setSelectedEngagementRef(undefined);
    setRendererReplay((current) => resetPixiReplay(current));
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

  const inspectEncounterBoard = (cardInstanceId: CardInstanceId) => {
    pixiPlacement.controller.clearPlacement();
    setSelectedEnemyCardRef({ type: "encounterBoard", cardInstanceId });
    setSelectedEngagementRef({ type: "encounterBoard", cardInstanceId });
  };

  const inspectAllyBoardCard = (cardInstanceId: CardInstanceId) => {
    pixiPlacement.controller.clearPlacement();
    setSelectedAllyCardRef({ type: "run", cardInstanceId });
    setSelectedEngagementRef({ type: "run", cardInstanceId });
  };

  const inspectEncounterSource = (cardInstanceId: CardInstanceId) => {
    pixiPlacement.controller.clearPlacement();
    setSelectedEnemyCardRef({ type: "encounterSource", cardInstanceId });
  };

  const inspectEncounterSpellrail = (cardInstanceId: CardInstanceId) => {
    pixiPlacement.controller.clearPlacement();
    setSelectedEnemyCardRef({ type: "encounterSpellrail", cardInstanceId });
  };

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

  const applyCommanderUpgrade = (choiceId: CommanderUpgradeId) => {
    setRun((currentRun) =>
      applyRunAction(currentRun, sampleCatalog, {
        type: "applyCommanderUpgradeChoice",
        choiceId
      })
    );
  };

  const advanceRound = () => {
    setSelectedAllyCardRef(undefined);
    setSelectedEnemyCardRef(undefined);
    setSelectedEngagementRef(undefined);
    pixiPlacement.controller.clearPlacement();
    setSelectedTargetProbeCardInstanceId(undefined);
    setRendererReplay((current) => resetPixiReplay(current));
    setRun((currentRun) =>
      applyRunAction(currentRun, sampleCatalog, { type: "advanceRunAfterCombat" })
    );
  };

  const selectPriorityTargetProbeTarget = (cardInstanceId: CardInstanceId) => {
    setSelectedTargetProbeCardInstanceId(cardInstanceId);
  };

  const submitPriorityPrototypeAction = () => {
    const source = priorityLabRouteView.availablePrototypeActionSource;
    if (!source) {
      return;
    }

    setPriorityMatch((currentMatch) =>
      submitPrototypePressureActionFromRun({
        match: currentMatch,
        run,
        catalog: sampleCatalog,
        actor: "player",
        cardInstanceId: source.cardInstanceId
      })
    );
  };

  const submitPriorityCommanderAction = () => {
    if (!priorityLabRouteView.commanderActionSource) {
      return;
    }

    setPriorityMatch((currentMatch) =>
      submitCommanderRallyActionFromRun({
        match: currentMatch,
        run,
        catalog: sampleCatalog,
        actor: "player"
      })
    );
  };

  const submitPriorityTargetProbeAction = () => {
    const target = priorityLabRouteView.selectedTargetProbeTarget;
    if (!target || !currentEncounter) {
      return;
    }

    setPriorityMatch((currentMatch) =>
      submitTargetProbeActionFromEncounterBoard({
        match: currentMatch,
        catalog: sampleCatalog,
        board: currentEncounter.loadout.board,
        actor: "player",
        cardInstanceId: target.cardInstanceId
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
    setSelectedTargetProbeCardInstanceId(undefined);
    setPriorityMatch(createPriorityLabMatch(priorityLabCombatChargeSetup));
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
    command: PixiReplayCommand,
    resetKey: number
  ) => {
    setRendererReplay((current) =>
      completePixiReplayCommand(
        current,
        rendererReplayCommands.length,
        nextCommandIndex,
        command,
        { cardNameByInstanceId: rendererReplayCardNameByInstanceId },
        resetKey
      )
    );
  };

  const selectPixiToken = (card: PixiBattlefieldCard) => {
    pixiPlacement.controller.clearPlacement();
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

  const placePixiSelectedCardOnCell = (position: BoardPosition) => {
    if (
      !pixiPlacement.selectedPlacementCardId ||
      !pixiPlaceablePositions.some((candidate) => sameBoardPosition(candidate, position))
    ) {
      return;
    }

    const cardInstanceId = pixiPlacement.selectedPlacementCardId;
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
    pixiPlacement.controller.clearPlacement();
    setRendererReplay((current) => resetPixiReplay(current));
  };

  const selectPixiPlacementCard = (cardInstanceId: CardInstanceId) => {
    pixiPlacement.controller.selectPlacementCard(cardInstanceId);
    setSelectedAllyCardRef({ type: "run", cardInstanceId });
  };

  const applyPixiZoneEditAction = (action: DefaultPixiZoneEditAction) => {
    if (pixiLoadoutEditView.mode !== "selected") {
      return;
    }

    performLoadoutAction(pixiLoadoutEditView.selectedCardInstanceId, action);
  };

  const renderPixiPoolActions = (card: CardInstance) => {
    const actions = getLegalLoadoutActions(run, sampleCatalog, card.instanceId);
    const placeAction = actions.find((action) => action.type === "placeOnBoard");
    const directActions = actions.filter((action) => action.type !== "placeOnBoard");

    return (
      <div className="mini-actions">
        <button
          type="button"
          className="secondary"
          onClick={() => {
            pixiPlacement.controller.clearPlacement();
            setSelectedAllyCardRef({ type: "run", cardInstanceId: card.instanceId });
          }}
        >
          Inspect
        </button>
        {placeAction ? (
          <button type="button" onClick={() => selectPixiPlacementCard(card.instanceId)}>
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

  const hexArenaView = {
    engagementPreview,
    encounterBoardGrid,
    encounterKindText: currentEncounter?.kind ?? "none",
    playerBoardGrid,
    resourceBoardChargeText: resourceSummary.boardChargeText,
    selectedAllyBoardCardInstanceId:
      effectiveAllyCardRef?.type === "run"
        ? effectiveAllyCardRef.cardInstanceId
        : undefined,
    selectedEnemyBoardCardInstanceId:
      effectiveEnemyCardRef?.type === "encounterBoard"
        ? effectiveEnemyCardRef.cardInstanceId
        : undefined
  } satisfies HexArenaViewData;
  const hexArenaController = {
    onInspectAllyBoardCard: inspectAllyBoardCard,
    onInspectEnemyBoardCard: inspectEncounterBoard
  } satisfies HexArenaController;
  const battlefieldSectionView = {
    currentRound: run.currentRound,
    encounterName: currentEncounter?.name ?? "None",
    hexArena: hexArenaView,
    isDefaultRoute,
    phase,
    playerGold: run.playerGold,
    playerHealth: run.playerHealth,
    selectedAllyInspection,
    selectedEnemyInspection
  } satisfies BattlefieldSectionView;
  const battlefieldSectionController = {
    hexArena: hexArenaController
  } satisfies BattlefieldSectionController;
  const defaultPixiBattlefieldView = {
    currentRound: run.currentRound,
    encounterName: currentEncounter?.name ?? "None",
    engagementPreview,
    phase,
    boardEditControls: pixiPlacement.view.boardEditControls,
    commanderEditControls: pixiCommanderEditView,
    loadoutEditControls: pixiLoadoutEditView,
    pixiBattlefieldModel,
    playerGold: run.playerGold,
    playerHealth: run.playerHealth,
    placementHint: pixiPlacement.view.placementHint,
    selectedAllyInspection,
    selectedEnemyInspection
  } satisfies DefaultPixiBattlefieldView;
  const renderDebugBoard = () => (
    <HexArenaView controller={hexArenaController} view={hexArenaView} />
  );
  const defaultPixiBattlefieldController = {
    onApplyZoneEditAction: applyPixiZoneEditAction,
    onCancelPlacement: pixiPlacement.controller.clearPlacement,
    onCellSelect: placePixiSelectedCardOnCell,
    onDeployCommander: deployCommanderFromCommand,
    ...(pixiPlacementCard && isDefaultRoute
      ? { onBlockedCellSelect: pixiPlacement.controller.selectBlockedCell }
      : {}),
    onInspectCommander: inspectCommander,
    onReturnCommander: returnCommanderFromBoard,
    onTokenSelect: selectPixiToken,
    renderDebugBoard
  } satisfies DefaultPixiBattlefieldController;
  const defaultRunRouteView = {
    combat: {
      lastRecorded: lastRecordedCombatPanelView,
      upcoming: upcomingCombatPanelView
    },
    commandZone: {
      deployDisabled: !commanderDeployCheck.ok,
      returnDisabled: !commanderReturnCheck.ok,
      view: commandZoneView
    },
    commanderUpgradePanelView,
    currentEncounter,
    isDefaultRoute,
    loadoutZonesView,
    planningCheck: {
      errors: validation.errors,
      ok: validation.ok
    },
    postPackSuggestions,
    rewards: {
      description: rewardChoicesDescription,
      explanationsByChoiceId: rewardOfferExplanationByChoiceId,
      playerGold: run.playerGold,
      rewardChoices
    },
    runGuide: {
      nextActionMessage,
      runDetails: runGuideDetails,
      stats: runGuideStats,
      steps: runGuideSteps
    },
    showDeveloperDetails,
    traitSummary
  } satisfies DefaultRunRouteView;
  const defaultRunRouteController = {
    cardName,
    onApplyCommanderUpgrade: applyCommanderUpgrade,
    onApplyPostPackSuggestion: performLoadoutAction,
    onDeployCommander: deployCommanderFromCommand,
    onInspectCommander: inspectCommander,
    onInspectEncounterBoard: inspectEncounterBoard,
    onInspectEncounterSource: inspectEncounterSource,
    onInspectEncounterSpellrail: inspectEncounterSpellrail,
    onOpenReward: openReward,
    onReturnCommander: returnCommanderFromBoard,
    onUpgradeGroup: upgradeGroup,
    renderLoadoutActions
  } satisfies DefaultRunRouteController;

  const rendererLabRouteView = {
    boardPlacements: run.board.placements,
    commandZoneView,
    commanderDeployDisabled: !commanderDeployCheck.ok,
    commanderReturnDisabled: !commanderReturnCheck.ok,
    commanderUpgradePanelView,
    engagementPreview,
    pixiBattlefieldModel,
    poolCards: run.pool,
    rendererInspectorIsEnemy,
    rendererInspection,
    pixiPlacementCardId: pixiPlacement.selectedPlacementCardId,
    pixiPlacementCardName: pixiPlacementCard
      ? cardName(pixiPlacementCard.defId)
      : undefined,
    replay: rendererReplay,
    replayAvailable: rendererLabCombat !== undefined,
    replayCommandCountText: rendererReplayCommandCountText,
    replayCommands: rendererReplayCommands,
    replayEventCount: rendererLabCombat?.events.length ?? 0,
    replayLatestSummary: rendererReplayLatestSummary,
    replayWinnerText: rendererLabCombat?.winner ?? "none",
    resourceSummary,
    rendererLabCombatDisplaySummary,
    sourceCards: run.sourceRow.cards,
    spellrailCards: run.spellrail.cards,
    spellrailMaxSlots: run.spellrail.maxSlots
  } satisfies RendererLabRouteView;
  const rendererLabRouteController = {
    cardName,
    onApplyCommanderUpgrade: applyCommanderUpgrade,
    onCellSelect: placePixiSelectedCardOnCell,
    onDeployCommander: deployCommanderFromCommand,
    onInspectCommander: inspectCommander,
    onPauseReplay: pauseRendererReplay,
    onPlayReplay: playRendererReplay,
    onReplayCommandComplete: completeRendererReplayCommand,
    onResetReplay: resetRendererReplay,
    onReturnCommander: returnCommanderFromBoard,
    onStepReplay: stepRendererReplay,
    onTokenSelect: selectPixiToken,
    renderDebugBoard,
    renderLoadoutActions,
    renderPixiPoolActions
  } satisfies RendererLabRouteController;
  const priorityLabRouteController = {
    onPassEnemy: passPriorityAsEnemy,
    onPassPlayer: passPriorityAsPlayer,
    onReset: resetPriorityLab,
    onRunSkirmish: runPrioritySkirmish,
    onSelectTargetProbeTarget: selectPriorityTargetProbeTarget,
    onSubmitCommanderAction: submitPriorityCommanderAction,
    onSubmitPrototypeAction: submitPriorityPrototypeAction,
    onSubmitTargetProbeAction: submitPriorityTargetProbeAction
  } satisfies PriorityLabRouteController;

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <h1>Packbound</h1>
          <p>Open packs, tune the loadout, fight, and grow the run.</p>
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

      {isDefaultRoute ? (
        <DefaultPixiBattlefieldSection
          controller={defaultPixiBattlefieldController}
          view={defaultPixiBattlefieldView}
        />
      ) : null}

      {!isDefaultRoute && !isRendererLab ? (
        <BattlefieldSection
          controller={battlefieldSectionController}
          view={battlefieldSectionView}
        />
      ) : null}

      {isRendererLab ? (
        <RendererLabRoute
          controller={rendererLabRouteController}
          view={rendererLabRouteView}
        />
      ) : null}

      {activeDebugScenarioId === DEBUG_PRIORITY_SCENARIO_ID ? (
        <PriorityLabRoute
          controller={priorityLabRouteController}
          view={priorityLabRouteView}
        />
      ) : null}

      <DefaultRunRoute
        controller={defaultRunRouteController}
        view={defaultRunRouteView}
      />
    </main>
  );
}
