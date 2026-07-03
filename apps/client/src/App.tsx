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
  canEditLoadout,
  canRecordCombat,
  createEncounterMatch,
  createRunFromStarterKit,
  describeUpgradeProgressGroup,
  passEncounterPriority,
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
import { asPlayerId, type CardDefId, type CardInstanceId } from "@packbound/shared";
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
import { buildPixiBattlefieldModel } from "./components/pixi/pixiBattlefieldModel";
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

export function App() {
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
  const [rendererReplay, setRendererReplay] = useState({
    key: 0,
    play: false
  });
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
  const pixiBattlefieldModel = useMemo(
    () =>
      buildPixiBattlefieldModel({
        playerBoard: playerBoardGrid,
        ...(encounterBoardGrid ? { enemyBoard: encounterBoardGrid } : {}),
        engagementPreview
      }),
    [encounterBoardGrid, engagementPreview, playerBoardGrid]
  );
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
    setPriorityMatch(createPriorityLabMatch());
    setLastRecordedCombat(undefined);
    setSelectedAllyCardRef(undefined);
    setSelectedEnemyCardRef(undefined);
    setSelectedEngagementRef(undefined);
    setRendererReplay({ key: 0, play: false });
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
    setRendererReplay((current) => ({ key: current.key + 1, play: true }));
  };

  const resetRendererReplay = () => {
    setRendererReplay((current) => ({ key: current.key + 1, play: false }));
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

      {activeDebugScenarioId === DEBUG_RENDERER_SCENARIO_ID ? (
        <section className="renderer-lab-section" aria-labelledby="renderer-lab-heading">
          <div className="renderer-lab-header">
            <div>
              <h2 id="renderer-lab-heading">Pixi Renderer Lab</h2>
              <p className="muted">
                A single shared battlefield rendered from existing board summaries,
                engagement preview data, and deterministic combat events. The React Hex
                Arena remains above as the debug fallback.
              </p>
            </div>
            <div className="button-row">
              <button
                type="button"
                onClick={playRendererReplay}
                disabled={!rendererLabCombat}
              >
                Play Replay
              </button>
              <button type="button" className="secondary" onClick={resetRendererReplay}>
                Reset Replay
              </button>
            </div>
          </div>

          <div className="renderer-lab-shell">
            <div>
              <PixiBattlefieldRenderer
                model={pixiBattlefieldModel}
                combatEvents={rendererLabCombat?.events ?? []}
                cardNamesByDefId={cardNamesByDefId}
                replayRequestKey={rendererReplay.key}
                playReplay={rendererReplay.play}
              />
            </div>
            <aside className="renderer-lab-panel">
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
                  <dt>Winner</dt>
                  <dd>{rendererLabCombat?.winner ?? "none"}</dd>
                </div>
                <div>
                  <dt>Visualized</dt>
                  <dd>appear/recall, move, attack, damage, destroyed</dd>
                </div>
              </dl>
              <h3>Preview Overlays</h3>
              <ul className="message-list compact">
                <li>Selected halo, attack range glow, likely target ring.</li>
                <li>Next-move ghost marker and movement arrow when available.</li>
                <li>Player side uses cool cyan; enemy side uses ember red.</li>
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
