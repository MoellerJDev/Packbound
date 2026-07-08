import type { CSSProperties, ReactNode } from "react";

import type {
  BattlefieldLayersView,
  CardInspection,
  EngagementPreview
} from "@packbound/rules";
import type { BoardPosition } from "@packbound/shared";

import { CardInspectorView } from "./CardInspectorView";
import { CombatModelFactsView } from "./CombatModelFactsView";
import { BattlefieldLayersPanel } from "./BattlefieldLayersPanel";
import { EngagementPreviewPanel } from "./EngagementPreviewPanel";
import { PixiBattlefieldRenderer } from "./pixi/PixiBattlefieldRenderer";
import { PIXI_BATTLEFIELD_LAYOUT } from "./pixi/pixiBattlefieldLayout";
import type {
  PixiBattlefieldCard,
  PixiBattlefieldModel
} from "./pixi/pixiBattlefieldModel";
import type { PixiReplayCommand } from "./pixi/pixiCombatReplay";
import type { PixiReplayControlsState } from "./pixi/pixiReplayControls";
import type {
  DefaultPixiBoardEditControlsView,
  DefaultPixiPlacementHintView
} from "../viewModels/defaultPixiPlacementView";
import type {
  DefaultPixiLoadoutEditView,
  DefaultPixiZoneEditAction
} from "../viewModels/defaultPixiLoadoutEditView";
import type { DefaultPixiCommanderEditView } from "../viewModels/defaultPixiCommanderEditView";
import { useFitAspectRect } from "../hooks/useFitAspectRect";

const DEFAULT_PIXI_ASPECT_RATIO =
  PIXI_BATTLEFIELD_LAYOUT.width / PIXI_BATTLEFIELD_LAYOUT.height;

export type DefaultPixiBattlefieldView = {
  readonly combatPlayback?: {
    readonly commandCountText: string;
    readonly commands: readonly PixiReplayCommand[];
    readonly latestSummary: string;
    readonly recordedEventCount: number;
    readonly replay: PixiReplayControlsState;
  };
  readonly currentRound: number;
  readonly encounterName: string;
  readonly engagementPreview: EngagementPreview;
  readonly battlefieldLayers: BattlefieldLayersView;
  readonly phase: string;
  readonly boardEditControls: DefaultPixiBoardEditControlsView;
  readonly commanderEditControls: DefaultPixiCommanderEditView;
  readonly loadoutEditControls: DefaultPixiLoadoutEditView;
  readonly pixiBattlefieldModel: PixiBattlefieldModel;
  readonly placementHint: DefaultPixiPlacementHintView;
  readonly playerGold: number;
  readonly playerHealth: number;
  readonly selectedAllyInspection: CardInspection | undefined;
  readonly selectedEnemyInspection: CardInspection | undefined;
  readonly replayTokenInspectionNotice?: string;
  readonly showDebugPanels: boolean;
};

export type DefaultPixiBattlefieldController = {
  readonly onCancelPlacement: () => void;
  readonly onCancelCommanderPlacement: () => void;
  readonly onCellSelect: (position: BoardPosition) => void;
  readonly onBlockedCellSelect?: (position: BoardPosition) => void;
  readonly onApplyZoneEditAction: (action: DefaultPixiZoneEditAction) => void;
  readonly onDeployCommander: () => void;
  readonly onInspectCommander: () => void;
  readonly onPauseCombatPlayback: () => void;
  readonly onPlayCombatPlayback: () => void;
  readonly onReplayCommandComplete: (
    nextCommandIndex: number,
    command: PixiReplayCommand,
    resetKey: number
  ) => void;
  readonly onResetCombatPlayback: () => void;
  readonly onReturnCommander: () => void;
  readonly onStepCombatPlayback: () => void;
  readonly onTokenSelect: (card: PixiBattlefieldCard) => void;
  readonly renderDebugBoard: () => ReactNode;
};

const DefaultPixiPlacementHint = ({
  hint
}: {
  readonly hint: DefaultPixiPlacementHintView;
}) => {
  if (hint.mode === "blocked" || hint.mode === "blockedCell") {
    return (
      <p
        className="default-pixi-placement-note blocked"
        data-testid="default-pixi-placement-hint"
      >
        {hint.text}
      </p>
    );
  }

  if (hint.mode === "ready") {
    return (
      <p
        className="renderer-placement-hint default-pixi-placement-hint"
        data-testid="default-pixi-placement-hint"
      >
        {hint.text}
      </p>
    );
  }

  return (
    <p className="default-pixi-placement-note" data-testid="default-pixi-placement-hint">
      {hint.text}
    </p>
  );
};

const DefaultPixiBoardEditControls = ({
  onCancelPlacement,
  view
}: {
  readonly onCancelPlacement: () => void;
  readonly view: DefaultPixiBoardEditControlsView;
}) => (
  <div
    className="default-pixi-edit-controls"
    data-testid="default-pixi-board-edit-controls"
  >
    <dl>
      <div>
        <dt>Mode</dt>
        <dd data-testid="default-pixi-board-edit-mode">{view.modeLabel}</dd>
      </div>
      {view.selectedCardName ? (
        <div>
          <dt>Selected</dt>
          <dd data-testid="default-pixi-board-edit-selected">{view.selectedCardName}</dd>
        </div>
      ) : null}
    </dl>
    <p data-testid="default-pixi-board-edit-status">{view.statusText}</p>
    {view.canCancelPlacement ? (
      <button type="button" className="secondary" onClick={onCancelPlacement}>
        Cancel Placement
      </button>
    ) : null}
  </div>
);

const DefaultPixiLoadoutEditControls = ({
  onApplyZoneEditAction,
  view
}: {
  readonly onApplyZoneEditAction: (action: DefaultPixiZoneEditAction) => void;
  readonly view: DefaultPixiLoadoutEditView;
}) => (
  <div
    className="default-pixi-edit-controls default-pixi-loadout-edit-controls"
    data-testid="default-pixi-zone-edit-controls"
  >
    <dl>
      <div>
        <dt>Mode</dt>
        <dd data-testid="default-pixi-zone-edit-mode">{view.modeLabel}</dd>
      </div>
      {view.mode === "selected" ? (
        <div>
          <dt>Selected</dt>
          <dd data-testid="default-pixi-zone-edit-selected">{view.selectedCardName}</dd>
        </div>
      ) : null}
      {view.mode === "selected" ? (
        <div>
          <dt>Zone</dt>
          <dd data-testid="default-pixi-zone-edit-selected-zone">
            {view.selectedZoneLabel}
          </dd>
        </div>
      ) : null}
    </dl>
    <div className="button-row compact">
      {view.actions.map((action) => (
        <button
          key={action.type}
          type="button"
          onClick={() => onApplyZoneEditAction(action)}
        >
          {action.label}
        </button>
      ))}
    </div>
    <p data-testid="default-pixi-zone-edit-status">{view.statusText}</p>
  </div>
);

const DefaultPixiCommanderEditControls = ({
  onCancelCommanderPlacement,
  onDeployCommander,
  onInspectCommander,
  onReturnCommander,
  view
}: {
  readonly onDeployCommander: () => void;
  readonly onCancelCommanderPlacement: () => void;
  readonly onInspectCommander: () => void;
  readonly onReturnCommander: () => void;
  readonly view: DefaultPixiCommanderEditView;
}) => (
  <div
    className="default-pixi-edit-controls default-pixi-commander-edit-controls"
    data-testid="default-pixi-commander-edit-controls"
  >
    <div className="default-pixi-commander-heading">
      <span data-testid="default-pixi-commander-edit-mode">{view.modeLabel}</span>
      <strong data-testid="default-pixi-commander-edit-selected">
        {view.commanderName}
      </strong>
      <small data-testid="default-pixi-commander-edit-zone">{view.zoneLabel}</small>
    </div>
    <div className="button-row compact">
      <button
        type="button"
        className="secondary"
        disabled={!view.canInspect}
        onClick={onInspectCommander}
      >
        Inspect Commander
      </button>
      <button type="button" disabled={!view.canDeploy} onClick={onDeployCommander}>
        Deploy Commander
      </button>
      {view.canCancelPlacement ? (
        <button type="button" className="secondary" onClick={onCancelCommanderPlacement}>
          Cancel Commander Placement
        </button>
      ) : null}
      <button type="button" disabled={!view.canReturn} onClick={onReturnCommander}>
        Return to Command
      </button>
    </div>
    <p data-testid="default-pixi-commander-edit-status">{view.statusText}</p>
  </div>
);

const DefaultCombatPlaybackPanel = ({
  controller,
  playback
}: {
  readonly controller: Pick<
    DefaultPixiBattlefieldController,
    | "onPauseCombatPlayback"
    | "onPlayCombatPlayback"
    | "onResetCombatPlayback"
    | "onStepCombatPlayback"
  >;
  readonly playback: NonNullable<DefaultPixiBattlefieldView["combatPlayback"]>;
}) => (
  <div className="default-combat-playback" data-testid="default-combat-playback">
    <div>
      <h3>Combat Playback</h3>
      <p>
        Replay the recorded combat on the Pixi board. Key Moments remain the text summary;
        this shows the board process.
      </p>
    </div>
    <dl>
      <div>
        <dt>Status</dt>
        <dd data-testid="default-combat-playback-status">{playback.replay.status}</dd>
      </div>
      <div>
        <dt>Event commands</dt>
        <dd data-testid="default-combat-playback-command-index">
          {playback.commandCountText}
        </dd>
      </div>
      <div>
        <dt>Recorded events</dt>
        <dd>{playback.recordedEventCount}</dd>
      </div>
    </dl>
    <p className="renderer-replay-latest" data-testid="default-combat-playback-latest">
      {playback.latestSummary}
    </p>
    <div className="button-row compact">
      <button
        type="button"
        aria-label={
          playback.replay.status === "paused"
            ? "Resume Combat Playback"
            : "Play Combat Playback"
        }
        onClick={controller.onPlayCombatPlayback}
        disabled={playback.commands.length === 0 || playback.replay.status === "playing"}
      >
        {playback.replay.status === "paused" ? "Resume" : "Play"}
      </button>
      <button
        type="button"
        aria-label="Pause Combat Playback"
        className="secondary"
        onClick={controller.onPauseCombatPlayback}
        disabled={playback.replay.status !== "playing"}
      >
        Pause
      </button>
      <button
        type="button"
        aria-label="Step Combat Playback"
        className="secondary"
        onClick={controller.onStepCombatPlayback}
        disabled={
          playback.commands.length === 0 ||
          playback.replay.status === "playing" ||
          playback.replay.status === "complete"
        }
      >
        Step
      </button>
      <button
        type="button"
        aria-label="Reset Combat Playback"
        className="secondary"
        onClick={controller.onResetCombatPlayback}
      >
        Reset
      </button>
    </div>
  </div>
);

const selectionContextText = ({
  selectedAllyInspection,
  selectedEnemyInspection
}: Pick<
  DefaultPixiBattlefieldView,
  "selectedAllyInspection" | "selectedEnemyInspection"
>): string => {
  const allyName = selectedAllyInspection?.name ?? "none";
  const enemyName = selectedEnemyInspection?.name ?? "none";
  return `Selected ally: ${allyName}. Selected enemy: ${enemyName}.`;
};

const DefaultPixiSelectedCard = ({
  contextLabel,
  emptyText,
  inspection,
  testId,
  title,
  tone
}: {
  readonly contextLabel: string;
  readonly emptyText: string;
  readonly inspection: CardInspection | undefined;
  readonly testId: string;
  readonly title: string;
  readonly tone: "ally" | "enemy";
}) => (
  <section className={`default-pixi-selected-card ${tone}`} data-testid={testId}>
    <div className="default-pixi-selected-head">
      <h3>{title}</h3>
      <span data-testid="default-pixi-selected-card-context">{contextLabel}</span>
    </div>
    {inspection ? (
      <div className="default-pixi-selected-summary">
        <div className="default-pixi-selected-title-line">
          <h4>{inspection.name}</h4>
          <p className="muted" data-testid="default-pixi-selected-card-meta">
            {inspection.cardType} | {inspection.zone ?? "definition"} |{" "}
            {inspection.aspectText}
          </p>
        </div>
        {inspection.combatStats ? (
          <div
            className="stat-chip-row compact-inspector-chips"
            aria-label={`${inspection.name} combat stat chips`}
          >
            {inspection.combatStats.chips.map((chip) => (
              <span key={chip} className="stat-chip">
                {chip}
              </span>
            ))}
          </div>
        ) : null}
        <details
          className="compact-details card-inspector-details-toggle"
          data-testid="default-pixi-selected-card-details"
        >
          <summary data-testid="default-pixi-selected-card-details-summary">
            Details
          </summary>
          <CardInspectorView
            contextLabel={contextLabel}
            inspection={inspection}
            emptyText={emptyText}
            showLegalActions={tone === "ally"}
            variant="compact"
          />
        </details>
      </div>
    ) : (
      <p className="muted">{emptyText}</p>
    )}
  </section>
);

export const DefaultPixiBattlefieldSection = ({
  controller,
  view
}: {
  readonly controller: DefaultPixiBattlefieldController;
  readonly view: DefaultPixiBattlefieldView;
}) => {
  const fitStage = useFitAspectRect(DEFAULT_PIXI_ASPECT_RATIO);
  const boardHostStyle: CSSProperties | undefined =
    fitStage.rect.width > 0 && fitStage.rect.height > 0
      ? {
          height: `${fitStage.rect.height}px`,
          width: `${fitStage.rect.width}px`
        }
      : undefined;
  const showBoardEditControls =
    view.showDebugPanels || view.boardEditControls.mode === "place";
  const showLoadoutEditControls =
    view.showDebugPanels ||
    (view.loadoutEditControls.mode === "selected" &&
      view.loadoutEditControls.actions.length > 0);
  const showActionArea =
    showBoardEditControls ||
    showLoadoutEditControls ||
    view.placementHint.mode !== "idle";

  return (
    <section
      className="battlefield-section default-pixi-battlefield-section"
      aria-labelledby="battlefield-heading"
    >
      <div className="battlefield-header">
        <div>
          <h2 id="battlefield-heading">Battlefield</h2>
          <p className="muted">
            Blue tokens are yours, red tokens are enemies. Click either side to inspect
            what will fight next.
          </p>
        </div>
        <dl className="battlefield-run-strip">
          <div>
            <dt>Phase</dt>
            <dd>{view.phase}</dd>
          </div>
          <div>
            <dt>Health</dt>
            <dd>{view.playerHealth}</dd>
          </div>
          <div>
            <dt>Gold</dt>
            <dd>{view.playerGold}</dd>
          </div>
          <div>
            <dt>Encounter</dt>
            <dd>{view.encounterName}</dd>
          </div>
        </dl>
      </div>

      <div className="battlefield-layout">
        <div className="default-pixi-stage">
          <div className="default-pixi-cockpit" data-testid="default-pixi-cockpit">
            <div
              className="default-pixi-board-area"
              data-testid="default-pixi-board-area"
            >
              <div
                className="default-pixi-side-legend"
                data-testid="default-pixi-side-legend"
              >
                <span className="ally">Your side</span>
                <span className="center">Engagement line</span>
                <span className="enemy">Enemy side</span>
              </div>
              <p
                className="default-pixi-selection-context"
                data-testid="default-pixi-selection-context"
              >
                {selectionContextText(view)}
              </p>
              {view.replayTokenInspectionNotice ? (
                <p
                  className="default-pixi-selection-context warning"
                  data-testid="default-pixi-replay-inspection-note"
                >
                  {view.replayTokenInspectionNotice}
                </p>
              ) : null}
              <div
                ref={fitStage.containerRef}
                className="default-pixi-fit-stage"
                data-testid="default-pixi-fit-stage"
              >
                <div className="default-pixi-fit-board" style={boardHostStyle}>
                  <PixiBattlefieldRenderer
                    model={view.pixiBattlefieldModel}
                    presentation="playerFacing"
                    replayCommands={view.combatPlayback?.commands ?? []}
                    replayStatus={view.combatPlayback?.replay.status ?? "idle"}
                    replayCommandIndex={view.combatPlayback?.replay.commandIndex ?? 0}
                    replayResetKey={view.combatPlayback?.replay.resetKey ?? 0}
                    replayStepRequestKey={view.combatPlayback?.replay.stepRequestKey ?? 0}
                    onReplayCommandComplete={controller.onReplayCommandComplete}
                    onTokenSelect={controller.onTokenSelect}
                    onCellSelect={controller.onCellSelect}
                    {...(controller.onBlockedCellSelect
                      ? { onBlockedCellSelect: controller.onBlockedCellSelect }
                      : {})}
                  />
                </div>
              </div>
              {view.showDebugPanels ? (
                <details className="renderer-debug-board default-pixi-debug-board">
                  <summary>React/CSS Debug Board</summary>
                  <div className="renderer-debug-board-inner">
                    {controller.renderDebugBoard()}
                  </div>
                </details>
              ) : null}
            </div>

            <div className="default-pixi-sidecar" data-testid="default-pixi-sidecar">
              <EngagementPreviewPanel
                preview={view.engagementPreview}
                playerFacingLabels
              />
              <BattlefieldLayersPanel view={view.battlefieldLayers} />
              {view.combatPlayback ? (
                <DefaultCombatPlaybackPanel
                  controller={controller}
                  playback={view.combatPlayback}
                />
              ) : null}
              <div
                className="default-pixi-selection-cards"
                data-testid="default-pixi-selection-cards"
              >
                <DefaultPixiSelectedCard
                  contextLabel="Your side"
                  emptyText="Select an ally token, pool, Source Row, or Spellrail card."
                  inspection={view.selectedAllyInspection}
                  testId="default-pixi-ally-card"
                  title="Ally Selected"
                  tone="ally"
                />
                <DefaultPixiSelectedCard
                  contextLabel="Enemy side"
                  emptyText="Select an enemy token, Source Row, or Spellrail card."
                  inspection={view.selectedEnemyInspection}
                  testId="default-pixi-enemy-card"
                  title="Enemy Selected"
                  tone="enemy"
                />
              </div>
              <DefaultPixiCommanderEditControls
                view={view.commanderEditControls}
                onCancelCommanderPlacement={controller.onCancelCommanderPlacement}
                onDeployCommander={controller.onDeployCommander}
                onInspectCommander={controller.onInspectCommander}
                onReturnCommander={controller.onReturnCommander}
              />
              {showActionArea ? (
                <div
                  className="default-pixi-action-area"
                  aria-label="Battlefield actions"
                >
                  {showBoardEditControls || showLoadoutEditControls ? (
                    <div className="default-pixi-action-grid">
                      {showBoardEditControls ? (
                        <DefaultPixiBoardEditControls
                          view={view.boardEditControls}
                          onCancelPlacement={controller.onCancelPlacement}
                        />
                      ) : null}
                      {showLoadoutEditControls ? (
                        <DefaultPixiLoadoutEditControls
                          view={view.loadoutEditControls}
                          onApplyZoneEditAction={controller.onApplyZoneEditAction}
                        />
                      ) : null}
                    </div>
                  ) : null}
                  {view.placementHint.mode !== "idle" || view.showDebugPanels ? (
                    <DefaultPixiPlacementHint hint={view.placementHint} />
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {view.showDebugPanels ? (
        <details className="combat-model-details">
          <summary>Combat Model Notes</summary>
          <CombatModelFactsView />
        </details>
      ) : null}
    </section>
  );
};
