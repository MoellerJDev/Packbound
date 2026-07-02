import type { CardDefinition } from "@packbound/shared";

export type CombatRole = "Melee" | "Ranged";

export type CombatStatDetail = {
  readonly label: string;
  readonly value: string;
  readonly description: string;
};

export type CombatStatSummary = {
  readonly attack: number;
  readonly health: number;
  readonly attackSpeed: number;
  readonly range: number;
  readonly role: CombatRole;
  readonly summaryText: string;
  readonly chips: readonly string[];
  readonly details: readonly CombatStatDetail[];
};

export type CombatModelFact = {
  readonly label: string;
  readonly text: string;
};

export const RANGE_MODEL_TEXT =
  "Range is displayed for card identity; current MVP targeting still attacks the selected target without movement/range gating.";

export const COMBAT_MODEL_FACTS: readonly CombatModelFact[] = [
  {
    label: "Automatic combat",
    text: "Units attack automatically once combat is recorded."
  },
  {
    label: "Attack and health",
    text: "Attack sets basic-attack damage, and health determines how much damage a Unit can take before being destroyed."
  },
  {
    label: "Attack speed",
    text: "Attack speed is attacks per second and feeds the simulator attack timer."
  },
  {
    label: "Positioning",
    text: "Board distance affects target priority; Guard can override that priority."
  },
  {
    label: "Keywords",
    text: "Guard, Barrier, Quickstart, Airborne, and AntiAir can affect current combat resolution."
  },
  {
    label: "Support and Techniques",
    text: "Support-layer Relics can trigger from their board position, and Techniques use combat Charge when their triggers are met."
  },
  {
    label: "Range",
    text: RANGE_MODEL_TEXT
  }
];

const formatNumber = (value: number): string => `${Number(value.toFixed(4))}`;

export const combatRoleFromRange = (range: number): CombatRole =>
  range <= 1 ? "Melee" : "Ranged";

export const buildCombatStatSummary = (
  def: CardDefinition,
  upgradeLevel = 0
): CombatStatSummary | undefined => {
  if (def.cardType !== "Unit" && def.cardType !== "Echo") {
    return undefined;
  }

  const attack = def.stats.attack + upgradeLevel;
  const health = def.stats.health + upgradeLevel;
  const attackSpeed = def.stats.attackSpeed;
  const range = def.stats.range;
  const role = combatRoleFromRange(range);
  const attackSpeedText = formatNumber(attackSpeed);
  const rangeText = formatNumber(range);

  return {
    attack,
    health,
    attackSpeed,
    range,
    role,
    summaryText: `${attack} ATK / ${health} HP / ${attackSpeedText} speed / ${rangeText} range`,
    chips: [
      `${attack} ATK`,
      `${health} HP`,
      `${attackSpeedText} AS`,
      `${rangeText} RNG`,
      role
    ],
    details: [
      {
        label: "Attack",
        value: `${attack} ATK`,
        description: "Damage dealt by each basic attack."
      },
      {
        label: "Health",
        value: `${health} HP`,
        description: "Damage this Unit can take before being destroyed."
      },
      {
        label: "Attack speed",
        value: `${attackSpeedText} AS`,
        description: "Attacks per second, used by the simulator attack timer."
      },
      {
        label: "Range",
        value: `${rangeText} RNG`,
        description: RANGE_MODEL_TEXT
      },
      {
        label: "Melee/Ranged",
        value: role,
        description: "Derived from range for readability."
      }
    ]
  };
};
