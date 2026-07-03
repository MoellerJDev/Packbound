import type { UpgradeProgressGroup } from "@packbound/rules";
import type { CardInstanceId } from "@packbound/shared";

export const UpgradeBadge = ({ level }: { readonly level: number }) =>
  level > 0 ? <span className="level-badge">Lv {level}</span> : null;

const upgradeProgressBadgeText = (
  group: UpgradeProgressGroup | undefined,
  cardInstanceId: CardInstanceId,
  zone: "pool" | "active"
): string | undefined => {
  if (!group) {
    return undefined;
  }

  if (group.cardType !== "Unit" && group.cardType !== "Echo") {
    return "duplicate";
  }

  if (zone === "active" || group.activeCardInstanceIds.includes(cardInstanceId)) {
    return "active copy";
  }

  return group.canUpgrade ? "ready" : `${group.poolCopies} / ${group.requiredCopies}`;
};

export const UpgradeProgressBadge = ({
  group,
  cardInstanceId,
  zone
}: {
  readonly group: UpgradeProgressGroup | undefined;
  readonly cardInstanceId: CardInstanceId;
  readonly zone: "pool" | "active";
}) => {
  const text = upgradeProgressBadgeText(group, cardInstanceId, zone);
  if (!text) {
    return null;
  }

  return (
    <span className={`progress-badge ${text === "ready" ? "ready" : ""}`}>{text}</span>
  );
};
