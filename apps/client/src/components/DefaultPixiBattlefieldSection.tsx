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
  readonly onReturnCommander: () => void;
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
          Pixi is the primary battlefield for this encounter. Click a token to inspect it,
          then use the panels below to tune the run.
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
        <CardInspectorView
          inspection={view.selectedAllyInspection}
          emptyText="Select an ally token, pool, Source Row, or Spellrail card."
        />
      </aside>

      <div className="default-pixi-stage">
        <PixiBattlefieldRenderer
          model={view.pixiBattlefieldModel}
          replayCommands={[]}
          replayStatus="idle"
          replayCommandIndex={0}
          replayResetKey={0}
          replayStepRequestKey={0}
          onTokenSelect={controller.onTokenSelect}
          onCellSelect={controller.onCellSelect}
          {...(controller.onBlockedCellSelect
            ? { onBlockedCellSelect: controller.onBlockedCellSelect }
            : {})}
        />
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
        <DefaultPixiPlacementHint hint={view.placementHint} />
        <EngagementPreviewPanel preview={view.engagementPreview} />
        <details className="renderer-debug-board default-pixi-debug-board">
          <summary>React/CSS Debug Board</summary>
          <div className="renderer-debug-board-inner">
            {controller.renderDebugBoard()}
          </div>
        </details>
      </div>

      <aside className="battlefield-inspector enemy">
        <h3>Enemy Inspector</h3>
        <CardInspectorView
          inspection={view.selectedEnemyInspection}
          emptyText="Select an enemy token, Source Row, or Spellrail card."
          showLegalActions={false}
        />
      </aside>
    </div>

    <details className="combat-model-details">
      <summary>Combat Model Notes</summary>
      <CombatModelFactsView />
    </details>
  </section>
);
