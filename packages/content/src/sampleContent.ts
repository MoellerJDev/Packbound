import {
  asCardDefId,
  asPackId,
  type CardDefinition,
  type PackDefinition
} from "@packbound/shared";

import { loadContentCatalog } from "./catalog";

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
    rulesText: "Quickstart. When destroyed, sparks the nearest enemy."
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
    rulesText: "At combat start, creates a Signal Wisp Echo."
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
    rulesText: "At combat start, fires at the nearest enemy."
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
    rulesText: "After a short delay, damages the nearest enemy."
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
    rulesText: "On entry, recalls a small Unit from Ashes with 1 health."
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
    keywords: ["Pierce"],
    abilities: [],
    stats: { attack: 3, health: 4, attackSpeed: 0.7, range: 1 },
    rulesText: "Pierce."
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
    rulesText: "Guard. A heavy body for Ashes-focused boards."
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
    rulesText: "On entry, gives adjacent allies Barrier."
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
    rulesText: "Guard. Barrier."
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
    rulesText: "Phases a low-health ally briefly, then returns it."
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
    rulesText: "Airborne. Echoes vanish instead of entering Ashes."
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
    }
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
    }
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
    }
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
    }
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
    }
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
      Ember: 3
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
      Spore: 2
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
      Phase: 2
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
      Relic: 2
    }
  }
];

export const sampleCatalog = loadContentCatalog({
  cards: sampleCards,
  packs: samplePacks
});
