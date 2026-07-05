import { type ReactNode, useMemo, useState } from "react";

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
  type BoardGridCardSummary,
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

import { BoardGridView } from "./components/BoardGridView";
import { CardInspectorView } from "./components/CardInspectorView";
import { CombatModelFactsView } from "./components/CombatModelFactsView";
import {
  CombatResultPanel,
  type LastRecordedCombatPanelView,
  type UpcomingCombatPanelView
} from "./components/CombatResultPanel";
import {
  CommandZonePanel,
  type CommandZonePanelView
} from "./components/CommandZonePanel";
import {
  CommanderUpgradePanel,
  type CommanderUpgradePanelView
} from "./components/CommanderUpgradePanel";
import { EngagementPreviewPanel } from "./components/EngagementPreviewPanel";
import {
  LoadoutZonesPanel,
  type LoadoutZonesPanelView
} from "./components/LoadoutZonesPanel";
import { PostPackSuggestionsPanel } from "./components/PostPackSuggestionsPanel";
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
import { RewardChoicesPanel } from "./components/RewardChoicesPanel";
import {
  RunGuidePanel,
  type RunGuideStat,
  type RunGuideStep
} from "./components/RunGuidePanel";
import { TraitSummaryView } from "./components/TraitSummaryView";
import { UpgradeBadge } from "./components/upgradeBadges";
import {
  DEBUG_PRIORITY_SCENARIO_ID,
  DEBUG_RENDERER_SCENARIO_ID,
  applyDebugScenario,
  debugScenarioFromSearch
} from "./debugScenarios";
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
  const [rendererPlacementCardId, setRendererPlacementCardId] = useState<
    CardInstanceId | undefined
  >();
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
    setRendererPlacementCardId(undefined);
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
          {editable ? <small>Inspect for blocked reason</small> : null}
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
    setRendererPlacementCardId(undefined);
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

  const renderCurrentEncounterDetails = () => (
    <>
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
    </>
  );

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
    rendererPlacementCardId,
    rendererPlacementCardName: rendererPlacementCard
      ? cardName(rendererPlacementCard.defId)
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
    onCellSelect: placeRendererCardOnCell,
    onDeployCommander: deployCommanderFromCommand,
    onInspectCommander: inspectCommander,
    onPauseReplay: pauseRendererReplay,
    onPlayReplay: playRendererReplay,
    onReplayCommandComplete: completeRendererReplayCommand,
    onResetReplay: resetRendererReplay,
    onReturnCommander: returnCommanderFromBoard,
    onStepReplay: stepRendererReplay,
    onTokenSelect: selectPixiToken,
    renderDebugBoard: renderHexArena,
    renderLoadoutActions,
    renderRendererPoolActions
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

          {isDefaultRoute ? (
            <details className="combat-model-details">
              <summary>Combat Model Notes</summary>
              <CombatModelFactsView />
            </details>
          ) : (
            <CombatModelFactsView />
          )}
        </section>
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

      <section className="debug-grid">
        <RunGuidePanel
          isDefaultRoute={isDefaultRoute}
          nextActionMessage={nextActionMessage}
          runDetails={runGuideDetails}
          stats={runGuideStats}
          steps={runGuideSteps}
        />

        <CommandZonePanel
          isDefaultRoute={isDefaultRoute}
          variant="panel"
          view={commandZoneView}
          deployDisabled={!commanderDeployCheck.ok}
          returnDisabled={!commanderReturnCheck.ok}
          onInspect={inspectCommander}
          onDeploy={deployCommanderFromCommand}
          onReturn={returnCommanderFromBoard}
        />
        <CommanderUpgradePanel
          variant="panel"
          view={commanderUpgradePanelView}
          onApplyUpgrade={applyCommanderUpgrade}
        />

        {isDefaultRoute ? (
          <details className="panel advanced-panel" data-testid="opponent-details-panel">
            <summary className="advanced-summary">
              <h2>Opponent Details</h2>
              <span>{currentEncounter?.name ?? "No encounter"}</span>
            </summary>
            <div className="advanced-panel-body">
              <p className="muted">
                Opponent cards are inspectable directly from the battlefield; this panel
                keeps the full encounter loadout available when needed.
              </p>
              {renderCurrentEncounterDetails()}
            </div>
          </details>
        ) : (
          <div className="panel">
            <h2>Current Encounter</h2>
            {renderCurrentEncounterDetails()}
          </div>
        )}

        {isDefaultRoute && validation.ok ? (
          <details className="panel advanced-panel" data-testid="planning-check-panel">
            <summary className="advanced-summary">
              <h2>Planning Check</h2>
              <span>Legal</span>
            </summary>
            <div className="advanced-panel-body">
              <div className="status ok">Legal</div>
              <p className="muted">Loadout validation passed.</p>
            </div>
          </details>
        ) : (
          <div className="panel" data-testid="planning-check-panel">
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
        )}

        {isDefaultRoute ? (
          <details className="panel advanced-panel" data-testid="traits-panel">
            <summary className="advanced-summary">
              <h2>Traits / Teamups</h2>
              <span>Display-only prototype</span>
            </summary>
            <div className="advanced-panel-body">
              <TraitSummaryView summary={traitSummary} />
            </div>
          </details>
        ) : (
          <div className="panel" data-testid="traits-panel">
            <h2>Traits / Teamups</h2>
            <TraitSummaryView summary={traitSummary} />
          </div>
        )}

        <RewardChoicesPanel
          collapseExplanations={isDefaultRoute}
          description={rewardChoicesDescription}
          explanationsByChoiceId={rewardOfferExplanationByChoiceId}
          onOpenReward={openReward}
          playerGold={run.playerGold}
          rewardChoices={rewardChoices}
        />

        {isDefaultRoute && postPackSuggestions.latestOpenedCardCount > 0 ? (
          <PostPackSuggestionsPanel
            summary={postPackSuggestions}
            onApplySuggestion={performLoadoutAction}
          />
        ) : null}

        <LoadoutZonesPanel
          cardName={cardName}
          renderLoadoutActions={renderLoadoutActions}
          view={loadoutZonesView}
          onUpgradeGroup={upgradeGroup}
        />

        <CombatResultPanel
          isDefaultRoute={isDefaultRoute}
          lastRecorded={lastRecordedCombatPanelView}
          showDeveloperDetails={showDeveloperDetails}
          upcoming={upcomingCombatPanelView}
        />
      </section>
    </main>
  );
}
