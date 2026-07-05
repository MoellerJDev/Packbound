import type { ReactNode } from "react";

import type {
  CardInspection,
  CommanderUpgradeId,
  EngagementPreview,
  LoadoutResourceSummary,
  RunState
} from "@packbound/rules";
import type { BoardPosition, CardDefId, CardInstance } from "@packbound/shared";
import type { CombatDisplaySummary } from "@packbound/sim";

import { CardInspectorView } from "../components/CardInspectorView";
import { CombatSummaryView } from "../components/CombatSummaryView";
import {
  CommandZonePanel,
  type CommandZonePanelView
} from "../components/CommandZonePanel";
import {
  CommanderUpgradePanel,
  type CommanderUpgradePanelView
} from "../components/CommanderUpgradePanel";
import { EngagementPreviewPanel } from "../components/EngagementPreviewPanel";
import { PixiBattlefieldRenderer } from "../components/pixi/PixiBattlefieldRenderer";
import type {
  PixiBattlefieldCard,
  PixiBattlefieldModel
} from "../components/pixi/pixiBattlefieldModel";
import type { PixiReplayCommand } from "../components/pixi/pixiCombatReplay";
import type { PixiReplayControlsState } from "../components/pixi/pixiReplayControls";

export type RendererLabRouteView = {
  readonly boardPlacements: RunState["board"]["placements"];
  readonly commandZoneView: CommandZonePanelView;
  readonly commanderDeployDisabled: boolean;
  readonly commanderReturnDisabled: boolean;
  readonly commanderUpgradePanelView: CommanderUpgradePanelView;
  readonly engagementPreview: EngagementPreview;
  readonly pixiBattlefieldModel: PixiBattlefieldModel;
  readonly poolCards: RunState["pool"];
  readonly rendererInspectorIsEnemy: boolean;
  readonly rendererInspection: CardInspection | undefined;
  readonly rendererPlacementCardId: CardInstance["instanceId"] | undefined;
  readonly rendererPlacementCardName: string | undefined;
  readonly replay: PixiReplayControlsState;
  readonly replayAvailable: boolean;
  readonly replayCommandCountText: string;
  readonly replayCommands: readonly PixiReplayCommand[];
  readonly replayEventCount: number;
  readonly replayLatestSummary: string;
  readonly replayWinnerText: string;
  readonly resourceSummary: LoadoutResourceSummary;
  readonly rendererLabCombatDisplaySummary: CombatDisplaySummary | undefined;
  readonly sourceCards: RunState["sourceRow"]["cards"];
  readonly spellrailCards: RunState["spellrail"]["cards"];
  readonly spellrailMaxSlots: number;
};

export type RendererLabRouteController = {
  readonly cardName: (defId: CardDefId) => string;
  readonly onApplyCommanderUpgrade: (choiceId: CommanderUpgradeId) => void;
  readonly onCellSelect: (position: BoardPosition) => void;
  readonly onDeployCommander: () => void;
  readonly onInspectCommander: () => void;
  readonly onPauseReplay: () => void;
  readonly onPlayReplay: () => void;
  readonly onReplayCommandComplete: (
    nextCommandIndex: number,
    command: PixiReplayCommand,
    resetKey: number
  ) => void;
  readonly onResetReplay: () => void;
  readonly onReturnCommander: () => void;
  readonly onStepReplay: () => void;
  readonly onTokenSelect: (card: PixiBattlefieldCard) => void;
  readonly renderDebugBoard: () => ReactNode;
  readonly renderLoadoutActions: (
    cardInstanceId: CardInstance["instanceId"]
  ) => ReactNode;
  readonly renderRendererPoolActions: (card: CardInstance) => ReactNode;
};

export const RendererLabRoute = ({
  controller,
  view
}: {
  readonly controller: RendererLabRouteController;
  readonly view: RendererLabRouteView;
}) => (
  <section className="renderer-lab-section" aria-labelledby="renderer-lab-heading">
    <div className="renderer-lab-header">
      <div>
        <h2 id="renderer-lab-heading">Pixi Renderer Lab</h2>
        <p className="muted">
          Pixi is the primary battlefield on this route. The React/CSS board is available
          in the collapsed debug fallback below.
        </p>
      </div>
      <div className="button-row">
        <button
          type="button"
          onClick={controller.onPlayReplay}
          disabled={
            !view.replayAvailable ||
            view.replayCommands.length === 0 ||
            view.replay.status === "playing"
          }
        >
          {view.replay.status === "paused" ? "Resume Replay" : "Play Replay"}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={controller.onPauseReplay}
          disabled={view.replay.status !== "playing"}
        >
          Pause Replay
        </button>
        <button
          type="button"
          className="secondary"
          onClick={controller.onStepReplay}
          disabled={
            !view.replayAvailable ||
            view.replayCommands.length === 0 ||
            view.replay.status === "playing" ||
            view.replay.status === "complete"
          }
        >
          Step Replay
        </button>
        <button type="button" className="secondary" onClick={controller.onResetReplay}>
          Reset Replay
        </button>
      </div>
    </div>

    <div className="renderer-lab-main">
      <div className="renderer-lab-stage">
        <PixiBattlefieldRenderer
          model={view.pixiBattlefieldModel}
          replayCommands={view.replayCommands}
          replayStatus={view.replay.status}
          replayCommandIndex={view.replay.commandIndex}
          replayResetKey={view.replay.resetKey}
          replayStepRequestKey={view.replay.stepRequestKey}
          onReplayCommandComplete={controller.onReplayCommandComplete}
          onTokenSelect={controller.onTokenSelect}
          onCellSelect={controller.onCellSelect}
        />
        <EngagementPreviewPanel preview={view.engagementPreview} />
        {view.rendererPlacementCardName ? (
          <p className="renderer-placement-hint">
            Placing {view.rendererPlacementCardName}. Legal Pixi cells are highlighted.
          </p>
        ) : null}
      </div>
      <aside className="renderer-lab-panel renderer-inspector-panel">
        <h3>Pixi Inspector</h3>
        <CardInspectorView
          inspection={view.rendererInspection}
          emptyText="Select a unit or support token on the Pixi battlefield."
          showLegalActions={!view.rendererInspectorIsEnemy}
        />
        <h3>Renderer Feed</h3>
        <dl className="run-stats">
          <div>
            <dt>Shared field units</dt>
            <dd>{view.pixiBattlefieldModel.cards.length}</dd>
          </div>
          <div>
            <dt>Replay events</dt>
            <dd>{view.replayEventCount}</dd>
          </div>
          <div>
            <dt>Replay status</dt>
            <dd data-testid="renderer-replay-status">{view.replay.status}</dd>
          </div>
          <div>
            <dt>Replay command</dt>
            <dd data-testid="renderer-replay-command-index">
              {view.replayCommandCountText}
            </dd>
          </div>
          <div>
            <dt>Winner</dt>
            <dd>{view.replayWinnerText}</dd>
          </div>
          <div>
            <dt>Visualized</dt>
            <dd>appear/recall, move, attack, damage, destroyed</dd>
          </div>
        </dl>
        <p className="renderer-replay-latest" data-testid="renderer-replay-latest">
          {view.replayLatestSummary}
        </p>
        <h3>Preview</h3>
        <ul className="message-list compact">
          <li>Selected halo, range glow, likely target ring, and next move.</li>
          <li>Unit circles show larger nameplates plus ATK / HP / RNG chips.</li>
          <li>Support and Relic-style permanents use support plates.</li>
          <li>Player tokens use cool cyan; enemy tokens use ember red.</li>
        </ul>
        {view.rendererLabCombatDisplaySummary ? (
          <>
            <h3>Combat Feed Sample</h3>
            <CombatSummaryView summary={view.rendererLabCombatDisplaySummary} />
          </>
        ) : (
          <p className="muted">No deterministic combat result is available.</p>
        )}
      </aside>
    </div>

    <div className="renderer-lab-loadout-grid">
      <CommandZonePanel
        isDefaultRoute={false}
        variant="renderer-lab-panel"
        view={view.commandZoneView}
        deployDisabled={view.commanderDeployDisabled}
        returnDisabled={view.commanderReturnDisabled}
        onInspect={controller.onInspectCommander}
        onDeploy={controller.onDeployCommander}
        onReturn={controller.onReturnCommander}
      />
      <CommanderUpgradePanel
        variant="renderer-lab-panel"
        view={view.commanderUpgradePanelView}
        onApplyUpgrade={controller.onApplyCommanderUpgrade}
      />

      <div className="renderer-lab-panel">
        <h3>Loadout Resources</h3>
        <dl className="source-summary">
          <div>
            <dt>Board Charge</dt>
            <dd>{view.resourceSummary.boardChargeText}</dd>
          </div>
          <div>
            <dt>Aspect Access</dt>
            <dd>{view.resourceSummary.aspectAccessText}</dd>
          </div>
          <div>
            <dt>Source Row</dt>
            <dd>{view.resourceSummary.sourceSlotsText}</dd>
          </div>
          <div>
            <dt>Spellrail</dt>
            <dd>
              {view.spellrailCards.length} / {view.spellrailMaxSlots}
            </dd>
          </div>
          <div>
            <dt>Combat Charge/sec</dt>
            <dd>{view.resourceSummary.combatChargePerSecondText}</dd>
          </div>
        </dl>
        <p className="muted">
          Pool/Bench cards are inactive. Source Row provides Charge and aspects. Spellrail
          holds Techniques.
        </p>
      </div>

      <div className="renderer-lab-panel">
        <h3>Board</h3>
        <p className="muted">Active board permanents use Board Charge.</p>
        <ol className="card-list compact">
          {view.boardPlacements.length > 0 ? (
            view.boardPlacements.map((placement) => (
              <li key={placement.cardInstanceId}>
                <span>{controller.cardName(placement.defId)}</span>
                <small>
                  r{placement.position.row} c{placement.position.col}{" "}
                  {placement.position.layer}
                </small>
                {controller.renderLoadoutActions(placement.cardInstanceId)}
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
          {view.sourceCards.map((card) => (
            <li key={card.instanceId}>
              <span>{controller.cardName(card.defId)}</span>
              <small>{card.zone}</small>
              {controller.renderLoadoutActions(card.instanceId)}
            </li>
          ))}
        </ol>
      </div>

      <div className="renderer-lab-panel">
        <h3>Spellrail</h3>
        <p className="muted">Techniques queue here for the current prototype loop.</p>
        <ol className="card-list compact">
          {view.spellrailCards.length > 0 ? (
            view.spellrailCards.map((card) => (
              <li key={card.instanceId}>
                <span>{controller.cardName(card.defId)}</span>
                <small>{card.zone}</small>
                {controller.renderLoadoutActions(card.instanceId)}
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
          {view.poolCards.length > 0 ? (
            view.poolCards.map((card) => (
              <li
                key={card.instanceId}
                className={
                  view.rendererPlacementCardId === card.instanceId
                    ? "pending-placement-card"
                    : undefined
                }
              >
                <span>{controller.cardName(card.defId)}</span>
                <small>Pool / Bench</small>
                {controller.renderRendererPoolActions(card)}
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
      <div className="renderer-debug-board-inner">{controller.renderDebugBoard()}</div>
    </details>
  </section>
);
