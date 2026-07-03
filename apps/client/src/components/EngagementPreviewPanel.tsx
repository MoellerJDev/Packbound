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

export const EngagementPreviewPanel = ({
  preview
}: {
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
