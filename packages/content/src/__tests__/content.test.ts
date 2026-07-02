import { describe, expect, it } from "vitest";

import { asCardDefId, asPackId } from "@packbound/shared";
import type {
  AbilityEffect,
  CardDefinition,
  CardInstance,
  Trigger
} from "@packbound/shared";

import {
  sampleCards,
  sampleEncounters,
  samplePacks,
  sampleStarterKits
} from "../sampleContent";
import { ContentValidationError, loadContentCatalog } from "../catalog";
import { parseCardDefinitions } from "../schemas";

const archetypes = [
  "ember_scrappers",
  "shade_ashes",
  "bloom_bodies",
  "cloudspire_phase",
  "source_greed"
] as const;

const schemaReservedEffects = new Set<AbilityEffect["type"]>([
  "SendToVoid",
  "ReturnFromVoid",
  "MoveUnit",
  "Attach",
  "Detach",
  "CopyTechnique",
  "InterruptTechnique",
  "MillToAshes"
]);

const schemaReservedTriggers = new Set<Trigger["type"]>([
  "OnCombatEnd",
  "OnLeaveBoard",
  "OnOffered",
  "OnAllyDestroyed",
  "OnEnemyDestroyed",
  "OnSummoned",
  "OnTechniqueUsed",
  "OnTakeDamage",
  "OnDealDamage",
  "OnAttack",
  "OnKill",
  "OnCombatChargeGained",
  "WhenFirstAllyDestroyed",
  "WhenFirstEnemyDestroyed",
  "WhenFirstEnemyUsesTechnique"
]);

const effectsForCard = (card: CardDefinition): readonly AbilityEffect[] => [
  ...card.abilities.map((ability) => ability.effect),
  ...(card.cardType === "Technique" ? [card.technique.effect] : [])
];

const triggersForCard = (card: CardDefinition): readonly Trigger[] => [
  ...card.abilities.map((ability) => ability.trigger),
  ...(card.cardType === "Technique" ? [card.technique.trigger] : [])
];

const instanceIdsForCards = (cards: readonly CardInstance[]): readonly string[] =>
  cards.map((card) => card.instanceId);

describe("content validation", () => {
  it("loads the starter Packbound content catalog", () => {
    const catalog = loadContentCatalog({
      cards: sampleCards,
      packs: samplePacks,
      encounters: sampleEncounters,
      starterKits: sampleStarterKits
    });

    expect(catalog.cardsById.get(asCardDefId("ember_scraprunner"))).toMatchObject({
      name: "Ember Scraprunner",
      cardType: "Unit"
    });
    expect(catalog.packsById.get(asPackId("ember_foundry_pack"))?.name).toBe(
      "Ember Foundry Pack"
    );
    expect(catalog.encountersById.get("early_ember_pressure")).toMatchObject({
      name: "Ember Pressure Crew",
      kind: "normal"
    });
    expect(catalog.starterKitsById.get("ember_scrappers")).toMatchObject({
      name: "Ember Scrappers",
      aspects: ["Ember"]
    });
  });

  it("rejects invalid card definitions clearly", () => {
    const invalidCard = {
      ...sampleCards[0],
      aspects: ["Copper"]
    };

    expect(() => parseCardDefinitions([invalidCard])).toThrow();
  });

  it("rejects duplicate card ids during catalog loading", () => {
    const duplicateCards = [sampleCards[0], sampleCards[0]];

    expect(() =>
      loadContentCatalog({ cards: duplicateCards, packs: samplePacks })
    ).toThrow(ContentValidationError);
  });

  it("rejects effect references to missing card definitions", () => {
    const brokenCards = sampleCards.map((card) =>
      card.id === asCardDefId("signal_nest")
        ? {
            ...card,
            abilities: [
              {
                ...card.abilities[0],
                effect: {
                  type: "SummonEcho",
                  cardDefId: asCardDefId("missing_echo"),
                  placement: "Backline"
                }
              }
            ]
          }
        : card
    );

    expect(() => loadContentCatalog({ cards: brokenCards, packs: samplePacks })).toThrow(
      ContentValidationError
    );
  });

  it("rejects summon effects that reference non-unit content", () => {
    const brokenCards = sampleCards.map((card) =>
      card.id === asCardDefId("signal_nest")
        ? {
            ...card,
            abilities: [
              {
                ...card.abilities[0],
                effect: {
                  type: "SummonEcho",
                  cardDefId: asCardDefId("ember_source"),
                  placement: "Backline"
                }
              }
            ]
          }
        : card
    );

    expect(() => loadContentCatalog({ cards: brokenCards, packs: samplePacks })).toThrow(
      ContentValidationError
    );
  });

  it("rejects duplicate encounter ids during catalog loading", () => {
    expect(() =>
      loadContentCatalog({
        cards: sampleCards,
        packs: samplePacks,
        encounters: [sampleEncounters[0], sampleEncounters[0]]
      })
    ).toThrow(ContentValidationError);
  });

  it("rejects encounter references to missing card definitions", () => {
    const encounter = sampleEncounters[0];
    if (!encounter) {
      throw new Error("Expected a sample encounter");
    }
    const placement = encounter.loadout.board.placements[0];
    if (!placement) {
      throw new Error("Expected a sample encounter placement");
    }

    const brokenEncounter = {
      ...encounter,
      loadout: {
        ...encounter.loadout,
        board: {
          placements: [
            {
              ...placement,
              defId: asCardDefId("missing_encounter_card")
            }
          ]
        }
      }
    };

    expect(() =>
      loadContentCatalog({
        cards: sampleCards,
        packs: samplePacks,
        encounters: [brokenEncounter]
      })
    ).toThrow(ContentValidationError);
  });

  it.each([
    {
      name: "board",
      update: () => {
        const encounter = sampleEncounters[0];
        const placement = encounter?.loadout.board.placements[0];
        if (!encounter || !placement) {
          throw new Error("Expected a sample encounter placement");
        }
        return {
          ...encounter,
          loadout: {
            ...encounter.loadout,
            board: {
              placements: [
                {
                  ...placement,
                  defId: asCardDefId("ember_source")
                }
              ]
            }
          }
        };
      }
    },
    {
      name: "source row",
      update: () => {
        const encounter = sampleEncounters[0];
        const source = encounter?.loadout.sourceRow.cards[0];
        if (!encounter || !source) {
          throw new Error("Expected a sample encounter source");
        }
        return {
          ...encounter,
          loadout: {
            ...encounter.loadout,
            sourceRow: {
              ...encounter.loadout.sourceRow,
              cards: [{ ...source, defId: asCardDefId("ember_scraprunner") }]
            }
          }
        };
      }
    },
    {
      name: "spellrail",
      update: () => {
        const encounter = sampleEncounters[0];
        const technique = encounter?.loadout.spellrail.cards[0];
        if (!encounter || !technique) {
          throw new Error("Expected a sample encounter technique");
        }
        return {
          ...encounter,
          loadout: {
            ...encounter.loadout,
            spellrail: {
              ...encounter.loadout.spellrail,
              cards: [{ ...technique, defId: asCardDefId("ember_scraprunner") }]
            }
          }
        };
      }
    }
  ])("rejects invalid encounter $name cards", ({ update }) => {
    expect(() =>
      loadContentCatalog({
        cards: sampleCards,
        packs: samplePacks,
        encounters: [update()]
      })
    ).toThrow(ContentValidationError);
  });

  it("rejects duplicate starter kit ids during catalog loading", () => {
    expect(() =>
      loadContentCatalog({
        cards: sampleCards,
        packs: samplePacks,
        starterKits: [sampleStarterKits[0], sampleStarterKits[0]]
      })
    ).toThrow(ContentValidationError);
  });

  it("rejects starter kit references to missing card definitions", () => {
    const starterKit = sampleStarterKits[0];
    const placement = starterKit?.board.placements[0];
    if (!starterKit || !placement) {
      throw new Error("Expected a sample starter kit placement");
    }

    expect(() =>
      loadContentCatalog({
        cards: sampleCards,
        packs: samplePacks,
        starterKits: [
          {
            ...starterKit,
            board: {
              placements: [
                {
                  ...placement,
                  defId: asCardDefId("missing_starter_card")
                }
              ]
            }
          }
        ]
      })
    ).toThrow(ContentValidationError);
  });

  it.each([
    {
      name: "board",
      update: () => {
        const starterKit = sampleStarterKits[0];
        const placement = starterKit?.board.placements[0];
        if (!starterKit || !placement) {
          throw new Error("Expected a sample starter kit placement");
        }
        return {
          ...starterKit,
          board: {
            placements: [{ ...placement, defId: asCardDefId("ember_source") }]
          }
        };
      }
    },
    {
      name: "source row",
      update: () => {
        const starterKit = sampleStarterKits[0];
        const source = starterKit?.sourceRow.cards[0];
        if (!starterKit || !source) {
          throw new Error("Expected a sample starter kit source");
        }
        return {
          ...starterKit,
          sourceRow: {
            ...starterKit.sourceRow,
            cards: [{ ...source, defId: asCardDefId("ember_scraprunner") }]
          }
        };
      }
    },
    {
      name: "spellrail",
      update: () => {
        const starterKit = sampleStarterKits[0];
        const technique = starterKit?.spellrail.cards[0];
        if (!starterKit || !technique) {
          throw new Error("Expected a sample starter kit technique");
        }
        return {
          ...starterKit,
          spellrail: {
            ...starterKit.spellrail,
            cards: [{ ...technique, defId: asCardDefId("ember_scraprunner") }]
          }
        };
      }
    }
  ])("rejects invalid starter kit $name cards", ({ update }) => {
    expect(() =>
      loadContentCatalog({
        cards: sampleCards,
        packs: samplePacks,
        starterKits: [update()]
      })
    ).toThrow(ContentValidationError);
  });

  it("rejects starter kits that reuse an instance id across zones", () => {
    const starterKit = sampleStarterKits[0];
    const poolCard = starterKit?.pool[0];
    const placement = starterKit?.board.placements[0];
    if (!starterKit || !poolCard || !placement) {
      throw new Error("Expected a sample starter kit");
    }

    expect(() =>
      loadContentCatalog({
        cards: sampleCards,
        packs: samplePacks,
        starterKits: [
          {
            ...starterKit,
            board: {
              placements: [
                {
                  ...placement,
                  cardInstanceId: poolCard.instanceId
                }
              ]
            }
          }
        ]
      })
    ).toThrow(ContentValidationError);
  });

  it("sample cards have unique card ids", () => {
    const ids = sampleCards.map((card) => card.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("playable sample cards declare valid serializable design metadata", () => {
    for (const card of sampleCards) {
      expect(card.design, card.id).toBeDefined();
      expect(card.design?.archetypes.length, card.id).toBeGreaterThan(0);
      expect(card.design?.mechanicTags.length, card.id).toBeGreaterThan(0);
      expect(card.design?.complexity, card.id).toBeGreaterThanOrEqual(1);
      expect(card.design?.complexity, card.id).toBeLessThanOrEqual(3);
      expect(JSON.parse(JSON.stringify(card.design))).toEqual(card.design);
    }
  });

  it("playable sample cards use implemented effects and triggers only", () => {
    const reservedEffectUses = sampleCards.flatMap((card) =>
      effectsForCard(card)
        .filter((effect) => schemaReservedEffects.has(effect.type))
        .map((effect) => `${card.id}:${effect.type}`)
    );
    const reservedTriggerUses = sampleCards.flatMap((card) =>
      triggersForCard(card)
        .filter((trigger) => schemaReservedTriggers.has(trigger.type))
        .map((trigger) => `${card.id}:${trigger.type}`)
    );

    expect(reservedEffectUses).toEqual([]);
    expect(reservedTriggerUses).toEqual([]);
  });

  it("each first-set archetype has an enabler, payoff, and interaction or defense", () => {
    for (const archetype of archetypes) {
      const cards = sampleCards.filter((card) =>
        card.design?.archetypes.includes(archetype)
      );
      const roles = new Set(cards.map((card) => card.design?.role));

      expect(cards.length, archetype).toBeGreaterThan(0);
      expect(roles.has("enabler"), archetype).toBe(true);
      expect(roles.has("payoff"), archetype).toBe(true);
      expect(roles.has("interaction") || roles.has("defense"), archetype).toBe(true);
    }
  });

  it("sample starter kits and encounters do not reuse instance ids", () => {
    for (const starterKit of sampleStarterKits) {
      const ids = [
        ...instanceIdsForCards(starterKit.pool),
        ...starterKit.board.placements.map((placement) => placement.cardInstanceId),
        ...instanceIdsForCards(starterKit.sourceRow.cards),
        ...instanceIdsForCards(starterKit.spellrail.cards),
        ...instanceIdsForCards(starterKit.ashes ?? []),
        ...instanceIdsForCards(starterKit.void ?? [])
      ];

      expect(new Set(ids).size, starterKit.id).toBe(ids.length);
    }

    for (const encounter of sampleEncounters) {
      const ids = [
        ...encounter.loadout.board.placements.map(
          (placement) => placement.cardInstanceId
        ),
        ...instanceIdsForCards(encounter.loadout.sourceRow.cards),
        ...instanceIdsForCards(encounter.loadout.spellrail.cards),
        ...instanceIdsForCards(encounter.loadout.startingAshes ?? [])
      ];

      expect(new Set(ids).size, encounter.id).toBe(ids.length);
    }
  });

  it("rejects encounters that reuse an instance id across zones", () => {
    const encounter = sampleEncounters[0];
    const placement = encounter?.loadout.board.placements[0];
    const source = encounter?.loadout.sourceRow.cards[0];
    if (!encounter || !placement || !source) {
      throw new Error("Expected a sample encounter board and source card");
    }

    expect(() =>
      loadContentCatalog({
        cards: sampleCards,
        packs: samplePacks,
        encounters: [
          {
            ...encounter,
            loadout: {
              ...encounter.loadout,
              sourceRow: {
                ...encounter.loadout.sourceRow,
                cards: [{ ...source, instanceId: placement.cardInstanceId }]
              }
            }
          }
        ]
      })
    ).toThrow(ContentValidationError);
  });
});
