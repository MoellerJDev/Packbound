import type { EngagementPreview } from "@packbound/rules";

import { formatCoordinate, hexNoun } from "./formatting";

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

const sidePrefix = (side: "playerA" | "playerB"): string =>
  side === "playerA" ? "Your" : "Enemy";

const sideName = ({
  name,
  side
}: {
  readonly name: string;
  readonly side: "playerA" | "playerB";
}): string => `${sidePrefix(side)} ${name}`;

export const EngagementPreviewPanel = ({
  playerFacingLabels = false,
  preview
}: {
  readonly playerFacingLabels?: boolean;
  readonly preview: EngagementPreview;
}) => {
  if (!preview.selected) {
    return (
      <div className="engagement-preview-panel" data-testid="engagement-preview">
        <h4>Engagement Preview</h4>
        <p>{preview.explanation[0] ?? "Select a board Unit or Echo."}</p>
      </div>
    );
  }

  const target = preview.likelyTarget;
  const selectedName = playerFacingLabels
    ? sideName(preview.selected)
    : preview.selected.name;
  const targetName =
    playerFacingLabels && target ? sideName(target) : (target?.name ?? undefined);
  const statusLabel = target?.inRange
    ? "Attack now"
    : target
      ? "Out of range"
      : "No target";
  const headline = target
    ? target.inRange
      ? preview.selected.identity === "Ranged" && target.distance > 1
        ? playerFacingLabels
          ? `${selectedName} can attack ${targetName} from ${target.distance} ${hexNoun(
              target.distance
            )} away.`
          : `${selectedName} can attack from ${target.distance} ${hexNoun(
              target.distance
            )} away.`
        : `${selectedName} can attack ${targetName} now.`
      : `${selectedName} cannot attack yet.`
    : `${selectedName} has no valid target.`;

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
        <strong>{selectedName}</strong>
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
