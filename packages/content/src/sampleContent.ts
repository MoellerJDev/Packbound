import {
  asCardDefId,
  asCardInstanceId,
  asPackId,
  asPlayerId,
  type BoardPlacement,
  type CardDefinition,
  type CardDesignMetadata,
  type CardInstance,
  type PackDefinition,
  type PlayerId
} from "@packbound/shared";

import { loadContentCatalog } from "./catalog";
import type { EncounterDefinition } from "./encounters";
import type { StarterKitDefinition } from "./starterKits";

const design = (
  role: CardDesignMetadata["role"],
  archetypes: readonly string[],
  complexity: CardDesignMetadata["complexity"],
  mechanicTags: readonly string[]
): CardDesignMetadata => ({
  role,
  archetypes,
  complexity,
  mechanicTags
});

const encounterPlayer = (encounterId: string): PlayerId =>
  asPlayerId(`encounter:${encounterId}`);

const encounterCard = (
  encounterId: string,
  ownerId: PlayerId,
  defId: string,
  zone: CardInstance["zone"],
  index: number
): CardInstance => ({
  instanceId: asCardInstanceId(`${encounterId}:${defId}:${zone}:${index}`),
  defId: asCardDefId(defId),
  ownerId,
  zone,
  modifiers: [],
  upgradeLevel: 0
});

const encounterPlacement = (
  encounterId: string,
  ownerId: PlayerId,
  defId: string,
  row: number,
  col: number,
  layer: BoardPlacement["position"]["layer"] = "ground",
  index: number = 0
): BoardPlacement => ({
  cardInstanceId: asCardInstanceId(`${encounterId}:${defId}:board:${index}`),
  defId: asCardDefId(defId),
  ownerId,
  position: { row, col, layer }
});

const starterKitPlayer = (starterKitId: string): PlayerId =>
  asPlayerId(`starter:${starterKitId}`);

const starterKitCard = (
  starterKitId: string,
  ownerId: PlayerId,
  defId: string,
  zone: CardInstance["zone"],
  index: number
): CardInstance => ({
  instanceId: asCardInstanceId(`${starterKitId}:${defId}:${zone}:${index}`),
  defId: asCardDefId(defId),
  ownerId,
  zone,
  modifiers: [],
  upgradeLevel: 0
});

const starterKitPlacement = (
  starterKitId: string,
  ownerId: PlayerId,
  defId: string,
  row: number,
  col: number,
  layer: BoardPlacement["position"]["layer"] = "ground",
  index: number = 0
): BoardPlacement => ({
  cardInstanceId: asCardInstanceId(`${starterKitId}:${defId}:board:${index}`),
  defId: asCardDefId(defId),
  ownerId,
  position: { row, col, layer }
});

export const sampleCards: readonly CardDefinition[] = [
  {
    id: asCardDefId("ember_scraprunner"),
    name: "Ember Scraprunner",
    set: "ember_foundry",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Ember"],
    cost: { generic: 1, aspect: { Ember: 1 } },
    tags: ["Scrapper", "Tinkerer"],
    keywords: ["Quickstart"],
    abilities: [
      {
        id: "scraprunner-spark",
        trigger: { type: "OnDestroyed" },
        condition: { type: "Always" },
        target: { type: "NearestEnemy" },
        effect: { type: "DealDamage", amount: 1 }
      }
    ],
    stats: { attack: 2, health: 1, attackSpeed: 1.3, range: 1 },
    rulesText: "Quickstart. When destroyed, sparks the nearest enemy.",
    design: design("enabler", ["ember_scrappers", "shade_ashes"], 1, [
      "quickstart",
      "on-destroyed",
      "damage"
    ])
  },
  {
    id: asCardDefId("cinder_scout"),
    name: "Cinder Scout",
    set: "ember_foundry",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Ember"],
    cost: { generic: 1 },
    tags: ["Scrapper", "Scout"],
    keywords: ["Quickstart"],
    abilities: [],
    stats: { attack: 1, health: 2, attackSpeed: 1.1, range: 1 },
    rulesText: "Quickstart.",
    design: design("curve", ["ember_scrappers"], 1, ["quickstart", "curve"])
  },
  {
    id: asCardDefId("slag_sparkler"),
    name: "Slag Sparkler",
    set: "ember_foundry",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Ember"],
    cost: { generic: 1, aspect: { Ember: 1 } },
    tags: ["Scrapper", "Spark"],
    keywords: [],
    abilities: [
      {
        id: "slag-sparkler-burst",
        trigger: { type: "OnDestroyed" },
        condition: { type: "Always" },
        target: { type: "NearestEnemy" },
        effect: { type: "DealDamage", amount: 1 }
      }
    ],
    stats: { attack: 1, health: 2, attackSpeed: 1, range: 2 },
    rulesText: "When destroyed, sparks the nearest enemy.",
    design: design("interaction", ["ember_scrappers", "shade_ashes"], 1, [
      "on-destroyed",
      "damage"
    ])
  },
  {
    id: asCardDefId("signal_nest"),
    name: "Signal Nest",
    set: "ember_foundry",
    rarity: "uncommon",
    cardType: "Relic",
    aspects: ["Ember"],
    cost: { generic: 1, aspect: { Ember: 1 } },
    tags: ["Relic", "Tinkerer"],
    keywords: [],
    abilities: [
      {
        id: "signal-nest-wisp",
        trigger: { type: "OnCombatStart" },
        condition: { type: "Always" },
        target: { type: "EmptyBacklineTile" },
        effect: {
          type: "SummonEcho",
          cardDefId: asCardDefId("signal_wisp_echo"),
          placement: "Backline"
        }
      }
    ],
    supportSlots: 1,
    rulesText: "At combat start, creates a Signal Wisp Echo.",
    design: design("engine", ["ember_scrappers", "source_greed"], 2, [
      "relic",
      "summon-echo",
      "combat-start"
    ])
  },
  {
    id: asCardDefId("flare_foundry"),
    name: "Flare Foundry",
    set: "ember_foundry",
    rarity: "uncommon",
    cardType: "Relic",
    aspects: ["Ember"],
    cost: { generic: 2, aspect: { Ember: 1 } },
    tags: ["Relic", "Charge"],
    keywords: [],
    abilities: [
      {
        id: "flare-foundry-charge",
        trigger: { type: "OnCombatStart" },
        condition: { type: "Always" },
        target: { type: "Self" },
        effect: { type: "GainCombatCharge", amount: 1 }
      }
    ],
    supportSlots: 1,
    rulesText: "At combat start, gain 1 combat Charge.",
    design: design("engine", ["ember_scrappers", "source_greed"], 2, [
      "relic",
      "combat-charge"
    ])
  },
  {
    id: asCardDefId("rustline_cannon"),
    name: "Rustline Cannon",
    set: "ember_foundry",
    rarity: "rare",
    cardType: "Relic",
    aspects: ["Ember"],
    cost: { generic: 2, aspect: { Ember: 1 } },
    tags: ["Relic", "Tinkerer"],
    keywords: [],
    abilities: [
      {
        id: "rustline-opening-shot",
        trigger: { type: "OnCombatStart" },
        condition: { type: "Always" },
        target: { type: "NearestEnemy" },
        effect: { type: "DealDamage", amount: 1 }
      }
    ],
    supportSlots: 1,
    rulesText: "At combat start, fires at the nearest enemy.",
    design: design("payoff", ["ember_scrappers", "source_greed"], 2, [
      "relic",
      "combat-start",
      "damage"
    ])
  },
  {
    id: asCardDefId("sparkfall"),
    name: "Sparkfall",
    set: "ember_foundry",
    rarity: "common",
    cardType: "Technique",
    aspects: ["Ember"],
    cost: { generic: 1, aspect: { Ember: 1 } },
    tags: ["Technique", "Damage"],
    keywords: [],
    abilities: [],
    technique: {
      combatChargeCost: 1,
      trigger: { type: "AfterSeconds", seconds: 1 },
      target: { type: "NearestEnemy" },
      effect: { type: "DealDamage", amount: 2 }
    },
    rulesText: "After a short delay, damages the nearest enemy.",
    design: design("interaction", ["ember_scrappers"], 1, ["technique", "damage"])
  },
  {
    id: asCardDefId("foundry_foreman"),
    name: "Foundry Foreman",
    set: "ember_foundry",
    rarity: "rare",
    cardType: "Unit",
    aspects: ["Ember"],
    cost: { generic: 2, aspect: { Ember: 1 } },
    tags: ["Scrapper", "Tinkerer"],
    keywords: [],
    abilities: [
      {
        id: "foreman-rally",
        trigger: { type: "OnCombatStart" },
        condition: { type: "Always" },
        target: { type: "AdjacentAllied" },
        effect: { type: "ModifyStats", attack: 1 }
      }
    ],
    stats: { attack: 2, health: 3, attackSpeed: 0.8, range: 1 },
    rulesText: "At combat start, gives adjacent allies +1 attack.",
    design: design("payoff", ["ember_scrappers"], 2, ["combat-start", "stats"])
  },
  {
    id: asCardDefId("hollow_caller"),
    name: "Hollow Caller",
    set: "rotbloom",
    rarity: "uncommon",
    cardType: "Unit",
    aspects: ["Shade"],
    cost: { generic: 1, aspect: { Shade: 1 } },
    tags: ["Husk", "Adept"],
    keywords: [],
    abilities: [
      {
        id: "hollow-caller-recall",
        trigger: { type: "OnEntry" },
        condition: { type: "AshesHasCard" },
        target: { type: "CardInAshes", maxChargeCost: 2 },
        effect: {
          type: "Recall",
          maxChargeCost: 2,
          healthOverride: 1,
          placement: "Backline"
        }
      }
    ],
    stats: { attack: 1, health: 3, attackSpeed: 0.9, range: 2 },
    rulesText: "On entry, recalls a small Unit from Ashes with 1 health.",
    design: design("payoff", ["shade_ashes"], 2, ["on-entry", "recall"])
  },
  {
    id: asCardDefId("ash_debt_runner"),
    name: "Ash Debt Runner",
    set: "rotbloom",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Shade"],
    cost: { generic: 1, aspect: { Shade: 1 } },
    tags: ["Husk", "Runner"],
    keywords: ["Quickstart"],
    abilities: [
      {
        id: "debt-runner-charge",
        trigger: { type: "OnDestroyed" },
        condition: { type: "Always" },
        target: { type: "Self" },
        effect: { type: "GainCombatCharge", amount: 1 }
      }
    ],
    stats: { attack: 1, health: 1, attackSpeed: 1.2, range: 1 },
    rulesText: "Quickstart. When destroyed, gain 1 combat Charge.",
    design: design("enabler", ["shade_ashes", "ember_scrappers"], 1, [
      "quickstart",
      "on-destroyed",
      "combat-charge"
    ])
  },
  {
    id: asCardDefId("contract_husk"),
    name: "Contract Husk",
    set: "rotbloom",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Shade"],
    cost: { generic: 1, aspect: { Shade: 1 } },
    tags: ["Husk"],
    keywords: ["Guard"],
    abilities: [],
    stats: { attack: 1, health: 4, attackSpeed: 0.7, range: 1 },
    rulesText: "Guard.",
    design: design("defense", ["shade_ashes"], 1, ["guard", "body"])
  },
  {
    id: asCardDefId("memory_wisp_echo"),
    name: "Memory Wisp Echo",
    set: "rotbloom",
    rarity: "common",
    cardType: "Echo",
    aspects: ["Shade"],
    cost: { generic: 1 },
    tags: ["Wisp", "Husk"],
    keywords: [],
    abilities: [],
    stats: { attack: 1, health: 1, attackSpeed: 1, range: 1 },
    rulesText: "Echoes vanish instead of entering Ashes.",
    design: design("enabler", ["shade_ashes"], 1, ["echo", "fodder"])
  },
  {
    id: asCardDefId("shade_binder"),
    name: "Shade Binder",
    set: "rotbloom",
    rarity: "common",
    cardType: "Technique",
    aspects: ["Shade"],
    cost: { generic: 1, aspect: { Shade: 1 } },
    tags: ["Technique", "Recall"],
    keywords: [],
    abilities: [],
    technique: {
      combatChargeCost: 1,
      trigger: { type: "AfterSeconds", seconds: 1.5 },
      target: { type: "CardInAshes", maxChargeCost: 2 },
      effect: {
        type: "Recall",
        maxChargeCost: 2,
        healthOverride: 1,
        placement: "Backline"
      }
    },
    rulesText: "After a short delay, recalls a small Unit from Ashes.",
    design: design("engine", ["shade_ashes"], 2, ["technique", "recall"])
  },
  {
    id: asCardDefId("debt_siphon"),
    name: "Debt Siphon",
    set: "rotbloom",
    rarity: "uncommon",
    cardType: "Technique",
    aspects: ["Shade"],
    cost: { generic: 1, aspect: { Shade: 1 } },
    tags: ["Technique", "Damage"],
    keywords: [],
    abilities: [],
    technique: {
      combatChargeCost: 1,
      trigger: { type: "AfterSeconds", seconds: 2 },
      target: { type: "LowestHealthEnemy" },
      effect: { type: "DealDamage", amount: 1 }
    },
    rulesText: "After a delay, damages the lowest-health enemy.",
    design: design("interaction", ["shade_ashes"], 1, ["technique", "damage"])
  },
  {
    id: asCardDefId("due_marker_relic"),
    name: "Due Marker",
    set: "rotbloom",
    rarity: "uncommon",
    cardType: "Relic",
    aspects: ["Shade"],
    cost: { generic: 2, aspect: { Shade: 1 } },
    tags: ["Relic", "Offer"],
    keywords: [],
    abilities: [
      {
        id: "due-marker-offer",
        trigger: { type: "OnCombatStart" },
        condition: { type: "Always" },
        target: { type: "AdjacentAllied" },
        effect: { type: "Offer" }
      }
    ],
    supportSlots: 1,
    rulesText: "At combat start, offers an adjacent ally.",
    design: design("engine", ["shade_ashes"], 3, ["relic", "offer", "combat-start"])
  },
  {
    id: asCardDefId("sporeback_beast"),
    name: "Sporeback Beast",
    set: "rotbloom",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Bloom"],
    cost: { generic: 2, aspect: { Bloom: 1 } },
    tags: ["Beast", "Spore"],
    keywords: [],
    abilities: [],
    stats: { attack: 3, health: 4, attackSpeed: 0.7, range: 1 },
    rulesText: "A sturdy early body.",
    design: design("curve", ["bloom_bodies"], 1, ["body", "stats"])
  },
  {
    id: asCardDefId("rootbrace_guardian"),
    name: "Rootbrace Guardian",
    set: "rotbloom",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Bloom"],
    cost: { generic: 1, aspect: { Bloom: 1 } },
    tags: ["Root", "Guardian"],
    keywords: ["Guard"],
    abilities: [],
    stats: { attack: 1, health: 5, attackSpeed: 0.6, range: 1 },
    rulesText: "Guard.",
    design: design("defense", ["bloom_bodies"], 1, ["guard", "body"])
  },
  {
    id: asCardDefId("mossback_tender"),
    name: "Mossback Tender",
    set: "rotbloom",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Bloom", "Gleam"],
    cost: { generic: 1, aspect: { Bloom: 1 } },
    tags: ["Root", "Tender"],
    keywords: [],
    abilities: [
      {
        id: "mossback-mend",
        trigger: { type: "OnEntry" },
        condition: { type: "Always" },
        target: { type: "AdjacentAllied" },
        effect: { type: "Heal", amount: 1 }
      }
    ],
    stats: { attack: 1, health: 3, attackSpeed: 0.8, range: 2 },
    rulesText: "On entry, heals adjacent allies.",
    design: design("defense", ["bloom_bodies", "cloudspire_phase"], 2, [
      "on-entry",
      "heal"
    ])
  },
  {
    id: asCardDefId("wildbulk_grazer"),
    name: "Wildbulk Grazer",
    set: "rotbloom",
    rarity: "uncommon",
    cardType: "Unit",
    aspects: ["Bloom"],
    cost: { generic: 3, aspect: { Bloom: 1 } },
    tags: ["Beast"],
    keywords: [],
    abilities: [],
    stats: { attack: 3, health: 6, attackSpeed: 0.6, range: 1 },
    rulesText: "A large Bloom body.",
    design: design("enabler", ["bloom_bodies"], 1, ["body", "stats"])
  },
  {
    id: asCardDefId("growth_pulse"),
    name: "Growth Pulse",
    set: "rotbloom",
    rarity: "common",
    cardType: "Technique",
    aspects: ["Bloom"],
    cost: { generic: 1, aspect: { Bloom: 1 } },
    tags: ["Technique", "Growth"],
    keywords: [],
    abilities: [],
    technique: {
      combatChargeCost: 1,
      trigger: { type: "AfterSeconds", seconds: 2 },
      target: { type: "LowestHealthAlliedUnit" },
      effect: { type: "ModifyStats", health: 1 }
    },
    rulesText: "After a delay, gives a wounded ally +1 health.",
    design: design("engine", ["bloom_bodies"], 1, ["technique", "stats"])
  },
  {
    id: asCardDefId("greenwake_balms"),
    name: "Greenwake Balms",
    set: "rotbloom",
    rarity: "uncommon",
    cardType: "Technique",
    aspects: ["Bloom", "Gleam"],
    cost: { generic: 1, aspect: { Bloom: 1 } },
    tags: ["Technique", "Heal"],
    keywords: [],
    abilities: [],
    technique: {
      combatChargeCost: 1,
      trigger: { type: "AfterSeconds", seconds: 1 },
      target: { type: "LowestHealthAlliedUnit" },
      effect: { type: "Heal", amount: 2 }
    },
    rulesText: "After a short delay, heals the lowest-health ally.",
    design: design("defense", ["bloom_bodies", "cloudspire_phase"], 1, [
      "technique",
      "heal"
    ])
  },
  {
    id: asCardDefId("debt_bound_colossus"),
    name: "Debt-Bound Colossus",
    set: "rotbloom",
    rarity: "rare",
    cardType: "Unit",
    aspects: ["Shade", "Bloom"],
    cost: { generic: 3, aspect: { Shade: 1, Bloom: 1 } },
    tags: ["Husk", "Beast"],
    keywords: ["Guard"],
    abilities: [],
    stats: { attack: 4, health: 7, attackSpeed: 0.5, range: 1 },
    rulesText: "Guard. A heavy body for Ashes-focused boards.",
    design: design("payoff", ["shade_ashes", "bloom_bodies", "source_greed"], 1, [
      "guard",
      "body",
      "multi-aspect"
    ])
  },
  {
    id: asCardDefId("thicket_colossus"),
    name: "Thicket Colossus",
    set: "rotbloom",
    rarity: "rare",
    cardType: "Unit",
    aspects: ["Bloom", "Gleam"],
    cost: { generic: 4, aspect: { Bloom: 1 } },
    tags: ["Root", "Guardian"],
    keywords: ["Guard"],
    abilities: [],
    stats: { attack: 4, health: 8, attackSpeed: 0.45, range: 1 },
    rulesText: "Guard. A massive Bloom payoff.",
    design: design("payoff", ["bloom_bodies", "source_greed"], 1, ["guard", "body"])
  },
  {
    id: asCardDefId("cloudgate_adept"),
    name: "Cloudgate Adept",
    set: "cloudspire",
    rarity: "uncommon",
    cardType: "Unit",
    aspects: ["Tide", "Gleam"],
    cost: { generic: 1, aspect: { Tide: 1, Gleam: 1 } },
    tags: ["Adept", "Warden"],
    keywords: [],
    abilities: [
      {
        id: "cloudgate-barrier",
        trigger: { type: "OnEntry" },
        condition: { type: "Always" },
        target: { type: "AdjacentAllied" },
        effect: { type: "ApplyStatus", status: "Barrier" }
      }
    ],
    stats: { attack: 1, health: 4, attackSpeed: 0.8, range: 2 },
    rulesText: "On entry, gives adjacent allies Barrier.",
    design: design("enabler", ["cloudspire_phase"], 2, ["on-entry", "barrier"])
  },
  {
    id: asCardDefId("vanishing_warden"),
    name: "Vanishing Warden",
    set: "cloudspire",
    rarity: "rare",
    cardType: "Unit",
    aspects: ["Tide", "Gleam"],
    cost: { generic: 2, aspect: { Tide: 1, Gleam: 1 } },
    tags: ["Warden", "Phase"],
    keywords: ["Guard", "Barrier"],
    abilities: [],
    stats: { attack: 2, health: 6, attackSpeed: 0.7, range: 1 },
    rulesText: "Guard. Barrier.",
    design: design("payoff", ["cloudspire_phase", "source_greed"], 1, [
      "guard",
      "barrier"
    ])
  },
  {
    id: asCardDefId("phase_step"),
    name: "Phase Step",
    set: "cloudspire",
    rarity: "common",
    cardType: "Technique",
    aspects: ["Tide"],
    cost: { generic: 1, aspect: { Tide: 1 } },
    tags: ["Technique", "Phase"],
    keywords: [],
    abilities: [],
    technique: {
      combatChargeCost: 1,
      trigger: { type: "WhenFirstAllyBelowHealthPercent", percent: 40 },
      target: { type: "LowestHealthAlliedUnit" },
      effect: {
        type: "Phase",
        delayMs: 1000,
        clearNegativeStatuses: true,
        retriggerEntryEffects: true,
        returnPreference: "originalTile"
      }
    },
    rulesText: "Phases a low-health ally briefly, then returns it.",
    design: design("engine", ["cloudspire_phase"], 2, ["technique", "phase"])
  },
  {
    id: asCardDefId("mistwing_scout"),
    name: "Mistwing Scout",
    set: "cloudspire",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Tide"],
    cost: { generic: 1, aspect: { Tide: 1 } },
    tags: ["Scout", "Wisp"],
    keywords: ["Airborne"],
    abilities: [],
    stats: { attack: 1, health: 2, attackSpeed: 1, range: 2 },
    rulesText: "Airborne.",
    design: design("curve", ["cloudspire_phase"], 1, ["airborne", "curve"])
  },
  {
    id: asCardDefId("skyhook_lookout"),
    name: "Skyhook Lookout",
    set: "cloudspire",
    rarity: "common",
    cardType: "Unit",
    aspects: ["Gleam"],
    cost: { generic: 1, aspect: { Gleam: 1 } },
    tags: ["Scout", "Warden"],
    keywords: ["AntiAir"],
    abilities: [],
    stats: { attack: 1, health: 3, attackSpeed: 0.9, range: 3 },
    rulesText: "AntiAir.",
    design: design("interaction", ["cloudspire_phase"], 1, ["anti-air", "answer"])
  },
  {
    id: asCardDefId("gleam_lantern"),
    name: "Gleam Lantern",
    set: "cloudspire",
    rarity: "uncommon",
    cardType: "Relic",
    aspects: ["Gleam"],
    cost: { generic: 1, aspect: { Gleam: 1 } },
    tags: ["Relic", "Barrier"],
    keywords: [],
    abilities: [
      {
        id: "gleam-lantern-barrier",
        trigger: { type: "OnCombatStart" },
        condition: { type: "Always" },
        target: { type: "AdjacentAllied" },
        effect: { type: "ApplyStatus", status: "Barrier" }
      }
    ],
    supportSlots: 1,
    rulesText: "At combat start, gives adjacent allies Barrier.",
    design: design("defense", ["cloudspire_phase", "source_greed"], 2, [
      "relic",
      "barrier"
    ])
  },
  {
    id: asCardDefId("returning_glimmer"),
    name: "Returning Glimmer",
    set: "cloudspire",
    rarity: "uncommon",
    cardType: "Technique",
    aspects: ["Tide", "Gleam"],
    cost: { generic: 1, aspect: { Tide: 1 } },
    tags: ["Technique", "Phase"],
    keywords: [],
    abilities: [],
    technique: {
      combatChargeCost: 1,
      trigger: { type: "WhenFirstAllyBelowHealthPercent", percent: 50 },
      target: { type: "LowestHealthAlliedUnit" },
      effect: {
        type: "Phase",
        delayMs: 750,
        clearNegativeStatuses: true,
        retriggerEntryEffects: false,
        returnPreference: "nearestOpenTile"
      }
    },
    rulesText: "Phases a low-health ally briefly without retriggering entry.",
    design: design("defense", ["cloudspire_phase"], 2, ["technique", "phase"])
  },
  {
    id: asCardDefId("signal_wisp_echo"),
    name: "Signal Wisp Echo",
    set: "cloudspire",
    rarity: "common",
    cardType: "Echo",
    aspects: ["Tide"],
    cost: { generic: 1 },
    tags: ["Wisp"],
    keywords: ["Airborne"],
    abilities: [],
    stats: { attack: 1, health: 1, attackSpeed: 1, range: 2 },
    rulesText: "Airborne. Echoes vanish instead of entering Ashes.",
    design: design("enabler", ["ember_scrappers", "cloudspire_phase"], 1, [
      "echo",
      "airborne"
    ])
  },
  {
    id: asCardDefId("ember_source"),
    name: "Ember Source",
    set: "core_sources",
    rarity: "common",
    cardType: "Source",
    aspects: ["Ember"],
    tags: ["Source"],
    keywords: [],
    abilities: [],
    source: {
      boardChargeCapacity: 3,
      aspectAccess: ["Ember"],
      combatChargePerSecond: 0.35
    },
    design: design("fixing", ["ember_scrappers", "source_greed"], 1, [
      "source",
      "single-aspect"
    ])
  },
  {
    id: asCardDefId("shade_source"),
    name: "Shade Source",
    set: "core_sources",
    rarity: "common",
    cardType: "Source",
    aspects: ["Shade"],
    tags: ["Source"],
    keywords: [],
    abilities: [],
    source: {
      boardChargeCapacity: 3,
      aspectAccess: ["Shade"],
      combatChargePerSecond: 0.3
    },
    design: design("fixing", ["shade_ashes", "source_greed"], 1, [
      "source",
      "single-aspect"
    ])
  },
  {
    id: asCardDefId("bloom_source"),
    name: "Bloom Source",
    set: "core_sources",
    rarity: "common",
    cardType: "Source",
    aspects: ["Bloom"],
    tags: ["Source"],
    keywords: [],
    abilities: [],
    source: {
      boardChargeCapacity: 4,
      aspectAccess: ["Bloom"],
      combatChargePerSecond: 0.25
    },
    design: design("fixing", ["bloom_bodies", "source_greed"], 1, [
      "source",
      "single-aspect"
    ])
  },
  {
    id: asCardDefId("tide_source"),
    name: "Tide Source",
    set: "core_sources",
    rarity: "common",
    cardType: "Source",
    aspects: ["Tide"],
    tags: ["Source"],
    keywords: [],
    abilities: [],
    source: {
      boardChargeCapacity: 3,
      aspectAccess: ["Tide"],
      combatChargePerSecond: 0.4
    },
    design: design("fixing", ["cloudspire_phase", "source_greed"], 1, [
      "source",
      "single-aspect"
    ])
  },
  {
    id: asCardDefId("gleam_source"),
    name: "Gleam Source",
    set: "core_sources",
    rarity: "common",
    cardType: "Source",
    aspects: ["Gleam"],
    tags: ["Source"],
    keywords: [],
    abilities: [],
    source: {
      boardChargeCapacity: 3,
      aspectAccess: ["Gleam"],
      combatChargePerSecond: 0.28
    },
    design: design("fixing", ["cloudspire_phase", "source_greed"], 1, [
      "source",
      "single-aspect"
    ])
  },
  {
    id: asCardDefId("cracked_prism"),
    name: "Cracked Prism",
    set: "core_sources",
    rarity: "common",
    cardType: "Source",
    aspects: ["Ember", "Shade", "Bloom", "Tide", "Gleam"],
    tags: ["Source", "Fixing"],
    keywords: [],
    abilities: [],
    source: {
      boardChargeCapacity: 2,
      aspectAccess: ["Ember", "Shade", "Bloom", "Tide", "Gleam"],
      combatChargePerSecond: 0.15
    },
    rulesText: "A slow Source that grants every Aspect.",
    design: design("enabler", ["source_greed"], 2, ["source", "multi-aspect"])
  },
  {
    id: asCardDefId("ember_shade_conduit"),
    name: "Ember-Shade Conduit",
    set: "core_sources",
    rarity: "uncommon",
    cardType: "Source",
    aspects: ["Ember", "Shade"],
    tags: ["Source", "Fixing"],
    keywords: [],
    abilities: [],
    source: {
      boardChargeCapacity: 4,
      aspectAccess: ["Ember", "Shade"],
      combatChargePerSecond: 0.25
    },
    design: design("fixing", ["ember_scrappers", "shade_ashes", "source_greed"], 2, [
      "source",
      "dual-aspect"
    ])
  },
  {
    id: asCardDefId("tide_gleam_conduit"),
    name: "Tide-Gleam Conduit",
    set: "core_sources",
    rarity: "uncommon",
    cardType: "Source",
    aspects: ["Tide", "Gleam"],
    tags: ["Source", "Fixing"],
    keywords: [],
    abilities: [],
    source: {
      boardChargeCapacity: 4,
      aspectAccess: ["Tide", "Gleam"],
      combatChargePerSecond: 0.32
    },
    design: design("fixing", ["cloudspire_phase", "source_greed"], 2, [
      "source",
      "dual-aspect"
    ])
  },
  {
    id: asCardDefId("overgrowth_spring"),
    name: "Overgrowth Spring",
    set: "core_sources",
    rarity: "uncommon",
    cardType: "Source",
    aspects: ["Bloom", "Gleam"],
    tags: ["Source", "Fixing"],
    keywords: [],
    abilities: [],
    source: {
      boardChargeCapacity: 5,
      aspectAccess: ["Bloom", "Gleam"],
      combatChargePerSecond: 0.18
    },
    design: design("fixing", ["bloom_bodies", "source_greed"], 2, [
      "source",
      "dual-aspect"
    ])
  }
];

export const samplePacks: readonly PackDefinition[] = [
  {
    id: asPackId("ember_foundry_pack"),
    name: "Ember Foundry Pack",
    setWeights: {
      ember_foundry: 8,
      core_sources: 2
    },
    slots: [
      { rarity: "common", count: 3 },
      { rarity: "uncommon", count: 1 },
      { rarity: "rare", count: 1, mythicUpgradeChance: 0.125 },
      { slotType: "sourceOrSupport", count: 1 }
    ],
    tagBias: {
      Scrapper: 4,
      Tinkerer: 2,
      Relic: 2,
      Ember: 3,
      Source: 1
    }
  },
  {
    id: asPackId("rotbloom_pack"),
    name: "Rotbloom Pack",
    setWeights: {
      rotbloom: 8,
      core_sources: 2
    },
    slots: [
      { rarity: "common", count: 3 },
      { rarity: "uncommon", count: 1 },
      { rarity: "rare", count: 1, mythicUpgradeChance: 0.125 },
      { slotType: "sourceOrSupport", count: 1 }
    ],
    tagBias: {
      Shade: 3,
      Bloom: 3,
      Husk: 3,
      Beast: 2,
      Recall: 2,
      Source: 1
    }
  },
  {
    id: asPackId("cloudspire_pack"),
    name: "Cloudspire Pack",
    setWeights: {
      cloudspire: 8,
      core_sources: 2
    },
    slots: [
      { rarity: "common", count: 3 },
      { rarity: "uncommon", count: 1 },
      { rarity: "rare", count: 1, mythicUpgradeChance: 0.125 },
      { slotType: "sourceOrSupport", count: 1 }
    ],
    tagBias: {
      Tide: 3,
      Gleam: 3,
      Wisp: 3,
      Phase: 2,
      Barrier: 2,
      Source: 1
    }
  },
  {
    id: asPackId("source_pack"),
    name: "Source Pack",
    setWeights: {
      core_sources: 10,
      ember_foundry: 1,
      rotbloom: 1,
      cloudspire: 1
    },
    slots: [
      { slotType: "sourceOrSupport", count: 4 },
      { slotType: "foilWildcard", count: 1 }
    ],
    tagBias: {
      Source: 5,
      Fixing: 4,
      Relic: 2
    }
  }
];

const emberScrappersPlayer = starterKitPlayer("ember_scrappers");
const rotbloomRecallPlayer = starterKitPlayer("rotbloom_recall");
const cloudspirePhasePlayer = starterKitPlayer("cloudspire_phase");

export const sampleStarterKits: readonly StarterKitDefinition[] = [
  {
    id: "ember_scrappers",
    name: "Ember Scrappers",
    description: "A fast Ember opener with early pressure and a spare Relic.",
    aspects: ["Ember"],
    pool: [
      starterKitCard("ember_scrappers", emberScrappersPlayer, "signal_nest", "pool", 0),
      starterKitCard("ember_scrappers", emberScrappersPlayer, "cinder_scout", "pool", 1)
    ],
    board: {
      placements: [
        starterKitPlacement(
          "ember_scrappers",
          emberScrappersPlayer,
          "ember_scraprunner",
          0,
          2
        )
      ]
    },
    sourceRow: {
      maxSlots: 4,
      cards: [
        starterKitCard(
          "ember_scrappers",
          emberScrappersPlayer,
          "ember_source",
          "sourceRow",
          0
        )
      ]
    },
    spellrail: {
      maxSlots: 4,
      cards: [
        starterKitCard(
          "ember_scrappers",
          emberScrappersPlayer,
          "sparkfall",
          "spellrail",
          0
        )
      ]
    },
    tags: ["scrapper", "pressure"]
  },
  {
    id: "rotbloom_recall",
    name: "Rotbloom Recall",
    description: "Shade/Bloom sources with a small Ashes setup for Recall.",
    aspects: ["Shade", "Bloom"],
    pool: [
      starterKitCard(
        "rotbloom_recall",
        rotbloomRecallPlayer,
        "sporeback_beast",
        "pool",
        0
      ),
      starterKitCard("rotbloom_recall", rotbloomRecallPlayer, "contract_husk", "pool", 1)
    ],
    board: {
      placements: [
        starterKitPlacement(
          "rotbloom_recall",
          rotbloomRecallPlayer,
          "hollow_caller",
          0,
          2
        )
      ]
    },
    sourceRow: {
      maxSlots: 4,
      cards: [
        starterKitCard(
          "rotbloom_recall",
          rotbloomRecallPlayer,
          "shade_source",
          "sourceRow",
          0
        ),
        starterKitCard(
          "rotbloom_recall",
          rotbloomRecallPlayer,
          "bloom_source",
          "sourceRow",
          1
        )
      ]
    },
    spellrail: { maxSlots: 4, cards: [] },
    ashes: [
      starterKitCard(
        "rotbloom_recall",
        rotbloomRecallPlayer,
        "ember_scraprunner",
        "ashes",
        0
      )
    ],
    tags: ["ashes", "recall"]
  },
  {
    id: "cloudspire_phase",
    name: "Cloudspire Phase",
    description: "Tide/Gleam setup with Barrier support and Phase Step.",
    aspects: ["Tide", "Gleam"],
    pool: [
      starterKitCard(
        "cloudspire_phase",
        cloudspirePhasePlayer,
        "vanishing_warden",
        "pool",
        0
      ),
      starterKitCard(
        "cloudspire_phase",
        cloudspirePhasePlayer,
        "mistwing_scout",
        "pool",
        1
      )
    ],
    board: {
      placements: [
        starterKitPlacement(
          "cloudspire_phase",
          cloudspirePhasePlayer,
          "cloudgate_adept",
          0,
          2
        )
      ]
    },
    sourceRow: {
      maxSlots: 4,
      cards: [
        starterKitCard(
          "cloudspire_phase",
          cloudspirePhasePlayer,
          "tide_source",
          "sourceRow",
          0
        ),
        starterKitCard(
          "cloudspire_phase",
          cloudspirePhasePlayer,
          "gleam_source",
          "sourceRow",
          1
        )
      ]
    },
    spellrail: {
      maxSlots: 4,
      cards: [
        starterKitCard(
          "cloudspire_phase",
          cloudspirePhasePlayer,
          "phase_step",
          "spellrail",
          0
        )
      ]
    },
    tags: ["phase", "warden"]
  }
];

const earlyEmberPressurePlayer = encounterPlayer("early_ember_pressure");
const earlyBloomBodyPlayer = encounterPlayer("early_bloom_body");
const shadeAshesPlayer = encounterPlayer("shade_ashes_recall");
const cloudspirePhaseEncounterPlayer = encounterPlayer("cloudspire_phase_patrol");
const finalBossPlayer = encounterPlayer("ledger_champion");

export const sampleEncounters: readonly EncounterDefinition[] = [
  {
    id: "early_ember_pressure",
    name: "Ember Pressure Crew",
    kind: "normal",
    tier: "early",
    minRound: 1,
    maxRound: 2,
    difficulty: 1,
    loadout: {
      playerId: earlyEmberPressurePlayer,
      board: {
        placements: [
          encounterPlacement(
            "early_ember_pressure",
            earlyEmberPressurePlayer,
            "ember_scraprunner",
            0,
            3
          )
        ]
      },
      sourceRow: {
        maxSlots: 4,
        cards: [
          encounterCard(
            "early_ember_pressure",
            earlyEmberPressurePlayer,
            "ember_source",
            "sourceRow",
            0
          )
        ]
      },
      spellrail: {
        maxSlots: 4,
        cards: [
          encounterCard(
            "early_ember_pressure",
            earlyEmberPressurePlayer,
            "sparkfall",
            "spellrail",
            0
          )
        ]
      }
    },
    tags: ["pressure", "scrapper"],
    aspects: ["Ember"]
  },
  {
    id: "early_bloom_body",
    name: "Bloomhide Stomper",
    kind: "normal",
    tier: "early",
    minRound: 1,
    maxRound: 3,
    difficulty: 2,
    loadout: {
      playerId: earlyBloomBodyPlayer,
      board: {
        placements: [
          encounterPlacement(
            "early_bloom_body",
            earlyBloomBodyPlayer,
            "rootbrace_guardian",
            0,
            3
          )
        ]
      },
      sourceRow: {
        maxSlots: 4,
        cards: [
          encounterCard(
            "early_bloom_body",
            earlyBloomBodyPlayer,
            "bloom_source",
            "sourceRow",
            0
          )
        ]
      },
      spellrail: { maxSlots: 4, cards: [] }
    },
    tags: ["body", "guard"],
    aspects: ["Bloom"]
  },
  {
    id: "shade_ashes_recall",
    name: "Ash Debt Collector",
    kind: "elite",
    tier: "early",
    minRound: 2,
    maxRound: 4,
    difficulty: 3,
    loadout: {
      playerId: shadeAshesPlayer,
      board: {
        placements: [
          encounterPlacement(
            "shade_ashes_recall",
            shadeAshesPlayer,
            "hollow_caller",
            0,
            2
          ),
          encounterPlacement(
            "shade_ashes_recall",
            shadeAshesPlayer,
            "contract_husk",
            0,
            3,
            "ground",
            1
          )
        ]
      },
      sourceRow: {
        maxSlots: 4,
        cards: [
          encounterCard(
            "shade_ashes_recall",
            shadeAshesPlayer,
            "shade_source",
            "sourceRow",
            0
          ),
          encounterCard(
            "shade_ashes_recall",
            shadeAshesPlayer,
            "shade_source",
            "sourceRow",
            1
          )
        ]
      },
      spellrail: { maxSlots: 4, cards: [] },
      startingAshes: [
        encounterCard(
          "shade_ashes_recall",
          shadeAshesPlayer,
          "ember_scraprunner",
          "ashes",
          0
        )
      ]
    },
    tags: ["ashes", "recall", "guard"],
    aspects: ["Shade"]
  },
  {
    id: "cloudspire_phase_patrol",
    name: "Cloudspire Phase Patrol",
    kind: "normal",
    tier: "mid",
    minRound: 2,
    maxRound: 4,
    difficulty: 3,
    loadout: {
      playerId: cloudspirePhaseEncounterPlayer,
      board: {
        placements: [
          encounterPlacement(
            "cloudspire_phase_patrol",
            cloudspirePhaseEncounterPlayer,
            "cloudgate_adept",
            0,
            2,
            "ground",
            0
          ),
          encounterPlacement(
            "cloudspire_phase_patrol",
            cloudspirePhaseEncounterPlayer,
            "vanishing_warden",
            0,
            3,
            "ground",
            1
          ),
          encounterPlacement(
            "cloudspire_phase_patrol",
            cloudspirePhaseEncounterPlayer,
            "gleam_lantern",
            1,
            3,
            "support",
            2
          )
        ]
      },
      sourceRow: {
        maxSlots: 4,
        cards: [
          encounterCard(
            "cloudspire_phase_patrol",
            cloudspirePhaseEncounterPlayer,
            "tide_source",
            "sourceRow",
            0
          ),
          encounterCard(
            "cloudspire_phase_patrol",
            cloudspirePhaseEncounterPlayer,
            "gleam_source",
            "sourceRow",
            1
          ),
          encounterCard(
            "cloudspire_phase_patrol",
            cloudspirePhaseEncounterPlayer,
            "tide_gleam_conduit",
            "sourceRow",
            2
          )
        ]
      },
      spellrail: {
        maxSlots: 4,
        cards: [
          encounterCard(
            "cloudspire_phase_patrol",
            cloudspirePhaseEncounterPlayer,
            "phase_step",
            "spellrail",
            0
          )
        ]
      }
    },
    tags: ["phase", "warden", "barrier"],
    aspects: ["Tide", "Gleam"]
  },
  {
    id: "ledger_champion",
    name: "Ledger Champion",
    kind: "boss",
    tier: "final",
    minRound: 3,
    maxRound: 99,
    difficulty: 5,
    loadout: {
      playerId: finalBossPlayer,
      board: {
        placements: [
          encounterPlacement(
            "ledger_champion",
            finalBossPlayer,
            "debt_bound_colossus",
            0,
            3,
            "ground",
            0
          ),
          encounterPlacement(
            "ledger_champion",
            finalBossPlayer,
            "rustline_cannon",
            1,
            3,
            "support",
            1
          ),
          encounterPlacement(
            "ledger_champion",
            finalBossPlayer,
            "flare_foundry",
            1,
            2,
            "support",
            2
          )
        ]
      },
      sourceRow: {
        maxSlots: 4,
        cards: [
          encounterCard(
            "ledger_champion",
            finalBossPlayer,
            "shade_source",
            "sourceRow",
            0
          ),
          encounterCard(
            "ledger_champion",
            finalBossPlayer,
            "bloom_source",
            "sourceRow",
            1
          ),
          encounterCard(
            "ledger_champion",
            finalBossPlayer,
            "ember_shade_conduit",
            "sourceRow",
            2
          )
        ]
      },
      spellrail: {
        maxSlots: 4,
        cards: [
          encounterCard("ledger_champion", finalBossPlayer, "sparkfall", "spellrail", 0)
        ]
      }
    },
    tags: ["boss", "guard", "charge"],
    aspects: ["Shade", "Bloom", "Ember"],
    rewardProfile: {
      bonusGold: 3,
      packBias: [asPackId("rotbloom_pack")]
    }
  }
];

export const sampleCatalog = loadContentCatalog({
  cards: sampleCards,
  packs: samplePacks,
  encounters: sampleEncounters,
  starterKits: sampleStarterKits
});
