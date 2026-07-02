import { describe, expect, it } from "vitest";

import { ASPECTS, CARD_DESIGN_ROLES, asCardDefId, asPackId } from "@packbound/shared";
import type {
  AbilityEffect,
  CardDefinition,
  CardInstance,
  Trigger
} from "@packbound/shared";

import {
  sampleCatalog,
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
const expectedStarterArchetypes: Readonly<Record<string, readonly string[]>> = {
  ember_scrappers: ["ember_scrappers"],
  rotbloom_recall: ["shade_ashes", "bloom_bodies"],
  cloudspire_phase: ["cloudspire_phase"]
};
const expectedNonSourcePackArchetypes: Readonly<Record<string, readonly string[]>> = {
  ember_foundry_pack: ["ember_scrappers"],
  rotbloom_pack: ["shade_ashes", "bloom_bodies"],
  cloudspire_pack: ["cloudspire_phase"]
};

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

const cardDefsById = new Map(sampleCards.map((card) => [card.id, card]));

const requireCardDef = (defId: CardDefinition["id"]): CardDefinition => {
  const def = cardDefsById.get(defId);
  if (!def) {
    throw new Error(`Missing sample card ${defId}`);
  }
  return def;
};

const starterKitCardDefs = (
  starterKit: (typeof sampleStarterKits)[number]
): readonly CardDefinition[] => [
  ...starterKit.pool.map((card) => requireCardDef(card.defId)),
  ...starterKit.board.placements.map((placement) => requireCardDef(placement.defId)),
  ...starterKit.sourceRow.cards.map((card) => requireCardDef(card.defId)),
  ...starterKit.spellrail.cards.map((card) => requireCardDef(card.defId)),
  ...(starterKit.ashes ?? []).map((card) => requireCardDef(card.defId)),
  ...(starterKit.void ?? []).map((card) => requireCardDef(card.defId))
];

const encounterCardDefs = (
  encounter: (typeof sampleEncounters)[number]
): readonly CardDefinition[] => [
  ...encounter.loadout.board.placements.map((placement) =>
    requireCardDef(placement.defId)
  ),
  ...encounter.loadout.sourceRow.cards.map((card) => requireCardDef(card.defId)),
  ...encounter.loadout.spellrail.cards.map((card) => requireCardDef(card.defId)),
  ...(encounter.loadout.startingAshes ?? []).map((card) => requireCardDef(card.defId))
];

const normalized = (value: string): string => value.toLowerCase();

const cardMatchesPackBias = (
  card: CardDefinition,
  tagBias: Readonly<Record<string, number>>
): boolean =>
  Object.keys(tagBias).some(
    (bias) =>
      card.tags.some((tag) => tag === bias) ||
      card.aspects.some((aspect) => aspect === bias) ||
      card.cardType === bias
  );

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

  it("every design role appears in the first micro-set", () => {
    const roles = new Set(sampleCards.map((card) => card.design?.role));

    for (const role of CARD_DESIGN_ROLES) {
      expect(roles.has(role), role).toBe(true);
    }
  });

  it("every Aspect has at least five non-Source playable cards", () => {
    for (const aspect of ASPECTS) {
      const matchingCards = sampleCards.filter(
        (card) => card.cardType !== "Source" && card.aspects.includes(aspect)
      );

      expect(matchingCards.length, aspect).toBeGreaterThanOrEqual(5);
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

  it("starter kits contain cards from their intended archetypes", () => {
    for (const starterKit of sampleStarterKits) {
      const expectedArchetypes = expectedStarterArchetypes[starterKit.id];
      if (!expectedArchetypes) {
        throw new Error(`Missing starter archetype expectation for ${starterKit.id}`);
      }

      const nonSourceCards = starterKitCardDefs(starterKit).filter(
        (card) => card.cardType !== "Source"
      );

      for (const archetype of expectedArchetypes) {
        expect(
          nonSourceCards.some((card) => card.design?.archetypes.includes(archetype)),
          `${starterKit.id}:${archetype}`
        ).toBe(true);
      }
    }
  });

  it("starter kit and encounter card references exist with design metadata", () => {
    for (const starterKit of sampleStarterKits) {
      for (const card of starterKitCardDefs(starterKit)) {
        expect(
          sampleCatalog.cardsById.get(card.id),
          `${starterKit.id}:${card.id}`
        ).toEqual(card);
        expect(card.design, `${starterKit.id}:${card.id}`).toBeDefined();
      }
    }

    for (const encounter of sampleEncounters) {
      for (const card of encounterCardDefs(encounter)) {
        expect(
          sampleCatalog.cardsById.get(card.id),
          `${encounter.id}:${card.id}`
        ).toEqual(card);
        expect(card.design, `${encounter.id}:${card.id}`).toBeDefined();
      }
    }
  });

  it("encounters include cards matching their listed tags or aspects", () => {
    for (const encounter of sampleEncounters) {
      const encounterTags = new Set((encounter.tags ?? []).map(normalized));
      const encounterAspects = new Set(encounter.aspects ?? []);
      const cards = encounterCardDefs(encounter).filter(
        (card) => card.cardType !== "Source"
      );

      expect(
        cards.some(
          (card) =>
            card.tags.some((tag) => encounterTags.has(normalized(tag))) ||
            card.keywords.some((keyword) => encounterTags.has(normalized(keyword))) ||
            card.design?.mechanicTags.some((tag) => encounterTags.has(normalized(tag))) ||
            card.aspects.some((aspect) => encounterAspects.has(aspect))
        ),
        encounter.id
      ).toBe(true);
    }
  });

  it("non-Source packs represent their intended archetypes in biased pools", () => {
    for (const pack of samplePacks) {
      const expectedArchetypes = expectedNonSourcePackArchetypes[pack.id];
      if (!expectedArchetypes) {
        continue;
      }

      const biasedCards = sampleCards.filter(
        (card) =>
          card.cardType !== "Source" &&
          Object.prototype.hasOwnProperty.call(pack.setWeights, card.set) &&
          cardMatchesPackBias(card, pack.tagBias)
      );

      expect(
        biasedCards.some((card) =>
          expectedArchetypes.some((archetype) =>
            card.design?.archetypes.includes(archetype)
          )
        ),
        pack.id
      ).toBe(true);
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
