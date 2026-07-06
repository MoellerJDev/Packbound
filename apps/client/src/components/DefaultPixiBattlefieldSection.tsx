import type { ReactNode } from "react";

import type { CardInspection, EngagementPreview } from "@packbound/rules";
import type { BoardPosition } from "@packbound/shared";

import { CardInspectorView } from "./CardInspectorView";
import { CombatModelFactsView } from "./CombatModelFactsView";
import { EngagementPreviewPanel } from "./EngagementPreviewPanel";
import { PixiBattlefieldRenderer } from "./pixi/PixiBattlefieldRenderer";
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
};

export type DefaultPixiBattlefieldController = {
  readonly onCancelPlacement: () => void;
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
  onDeployCommander,
  onInspectCommander,
  onReturnCommander,
  view
}: {
  readonly onDeployCommander: () => void;
  readonly onInspectCommander: () => void;
  readonly onReturnCommander: () => void;
  readonly view: DefaultPixiCommanderEditView;
}) => (
  <div
    className="default-pixi-edit-controls default-pixi-commander-edit-controls"
    data-testid="default-pixi-commander-edit-controls"
  >
    <dl>
      <div>
        <dt>Mode</dt>
        <dd data-testid="default-pixi-commander-edit-mode">{view.modeLabel}</dd>
      </div>
      <div>
        <dt>Commander</dt>
        <dd data-testid="default-pixi-commander-edit-selected">{view.commanderName}</dd>
      </div>
      <div>
        <dt>Zone</dt>
        <dd data-testid="default-pixi-commander-edit-zone">{view.zoneLabel}</dd>
      </div>
    </dl>
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
        onClick={controller.onPlayCombatPlayback}
        disabled={playback.commands.length === 0 || playback.replay.status === "playing"}
      >
        {playback.replay.status === "paused"
          ? "Resume Combat Playback"
          : "Play Combat Playback"}
      </button>
      <button
        type="button"
        className="secondary"
        onClick={controller.onPauseCombatPlayback}
        disabled={playback.replay.status !== "playing"}
      >
        Pause Combat Playback
      </button>
      <button
        type="button"
        className="secondary"
        onClick={controller.onStepCombatPlayback}
        disabled={
          playback.commands.length === 0 ||
          playback.replay.status === "playing" ||
          playback.replay.status === "complete"
        }
      >
        Step Combat Playback
      </button>
      <button
        type="button"
        className="secondary"
        onClick={controller.onResetCombatPlayback}
      >
        Reset Combat Playback
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

export const DefaultPixiBattlefieldSection = ({
  controller,
  view
}: {
  readonly controller: DefaultPixiBattlefieldController;
  readonly view: DefaultPixiBattlefieldView;
}) => (
  <section
    className="battlefield-section default-pixi-battlefield-section"
    aria-labelledby="battlefield-heading"
  >
    <div className="battlefield-header">
      <div>
        <h2 id="battlefield-heading">Battlefield</h2>
        <p className="muted">
          Blue tokens are yours, red tokens are enemies. Click either side to inspect what
          will fight next.
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
      <aside className="battlefield-inspector ally">
        <h3>Ally Inspector</h3>
        <p className="inspector-context-note">Your side selection</p>
        <CardInspectorView
          contextLabel="Your side"
          inspection={view.selectedAllyInspection}
          emptyText="Select an ally token, pool, Source Row, or Spellrail card."
          variant="compact"
        />
      </aside>

      <div className="default-pixi-stage">
        <div className="default-pixi-side-legend" data-testid="default-pixi-side-legend">
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
        <div className="default-pixi-action-area" aria-label="Battlefield actions">
          <div className="default-pixi-action-grid">
            <DefaultPixiBoardEditControls
              view={view.boardEditControls}
              onCancelPlacement={controller.onCancelPlacement}
            />
            <DefaultPixiLoadoutEditControls
              view={view.loadoutEditControls}
              onApplyZoneEditAction={controller.onApplyZoneEditAction}
            />
            <DefaultPixiCommanderEditControls
              view={view.commanderEditControls}
              onDeployCommander={controller.onDeployCommander}
              onInspectCommander={controller.onInspectCommander}
              onReturnCommander={controller.onReturnCommander}
            />
          </div>
          <DefaultPixiPlacementHint hint={view.placementHint} />
        </div>
        {view.combatPlayback ? (
          <DefaultCombatPlaybackPanel
            controller={controller}
            playback={view.combatPlayback}
          />
        ) : null}
        <EngagementPreviewPanel preview={view.engagementPreview} playerFacingLabels />
        <details className="renderer-debug-board default-pixi-debug-board">
          <summary>React/CSS Debug Board</summary>
          <div className="renderer-debug-board-inner">
            {controller.renderDebugBoard()}
          </div>
        </details>
      </div>

      <aside className="battlefield-inspector enemy">
        <h3>Enemy Inspector</h3>
        <p className="inspector-context-note">Enemy side selection</p>
        <CardInspectorView
          contextLabel="Enemy side"
          inspection={view.selectedEnemyInspection}
          emptyText="Select an enemy token, Source Row, or Spellrail card."
          showLegalActions={false}
          variant="compact"
        />
      </aside>
    </div>

    <details className="combat-model-details">
      <summary>Combat Model Notes</summary>
      <CombatModelFactsView />
    </details>
  </section>
);
