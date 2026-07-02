import { describe, expect, it } from "vitest";

import { sampleCatalog } from "@packbound/content";
import { asCardDefId, asPackId, asPlayerId } from "@packbound/shared";
import type { CardDefinition, PackDefinition } from "@packbound/shared";

import { openPack } from "../packOpening";

const ownerId = asPlayerId("player");
const expectedPackArchetypes: Readonly<Record<string, readonly string[]>> = {
  ember_foundry_pack: ["ember_scrappers"],
  rotbloom_pack: ["shade_ashes", "bloom_bodies"],
  cloudspire_pack: ["cloudspire_phase"],
  source_pack: ["source_greed"]
};
const smokeSeeds = [
  "smoke-a",
  "smoke-b",
  "smoke-c",
  "smoke-d",
  "smoke-e",
  "smoke-f"
] as const;
const destroyedTriggerPackCards: Readonly<Record<string, readonly string[]>> = {
  ember_foundry_pack: ["sparkcatch_apprentice", "coal_wisp_echo", "cinder_tally_relic"],
  rotbloom_pack: ["mournscale_keeper", "ash_ledger_relic", "last_word_broker"]
};

const cardMatchesAnyPackSlot = (card: CardDefinition, pack: PackDefinition): boolean =>
  pack.slots.some((slot) => {
    if ("rarity" in slot) {
      return (
        card.rarity === slot.rarity ||
        (slot.rarity === "rare" && card.rarity === "mythic")
      );
    }
    if (slot.slotType === "sourceOrSupport") {
      return card.cardType === "Source" || card.cardType === "Relic";
    }
    return slot.slotType === "foilWildcard";
  });

describe("pack opening", () => {
  it("opens the same pack for the same seed", () => {
    const first = openPack({
      catalog: sampleCatalog,
      packId: asPackId("ember_foundry_pack"),
      seed: "run-1-pack-1",
      ownerId
    });
    const second = openPack({
      catalog: sampleCatalog,
      packId: asPackId("ember_foundry_pack"),
      seed: "run-1-pack-1",
      ownerId
    });

    expect(second).toEqual(first);
  });

  it.each(sampleCatalog.packs)("opens $id deterministically", (pack) => {
    const first = openPack({
      catalog: sampleCatalog,
      packId: pack.id,
      seed: `deterministic-${pack.id}`,
      ownerId
    });
    const second = openPack({
      catalog: sampleCatalog,
      packId: pack.id,
      seed: `deterministic-${pack.id}`,
      ownerId
    });

    expect(second).toEqual(first);
  });

  it.each(sampleCatalog.packs)(
    "can produce cards for $id's intended archetypes",
    (pack) => {
      const expectedArchetypes = expectedPackArchetypes[pack.id];
      if (!expectedArchetypes) {
        throw new Error(`Missing archetype expectation for pack ${pack.id}`);
      }

      const eligibleCards = sampleCatalog.cards.filter(
        (card) =>
          Object.prototype.hasOwnProperty.call(pack.setWeights, card.set) &&
          cardMatchesAnyPackSlot(card, pack)
      );
      const matchingCard = eligibleCards.find((card) =>
        expectedArchetypes.some((archetype) =>
          card.design?.archetypes.includes(archetype)
        )
      );

      expect(matchingCard?.id, pack.id).toBeDefined();
    }
  );

  it("respects slot counts and source/support slots", () => {
    const opened = openPack({
      catalog: sampleCatalog,
      packId: asPackId("source_pack"),
      seed: "source-check",
      ownerId
    });

    expect(opened.cards).toHaveLength(5);
    expect(
      opened.slots.filter((slot) => slot.slotType === "sourceOrSupport")
    ).toHaveLength(4);
  });

  it.each(sampleCatalog.packs)(
    "opens usable aggregate rewards for $id across fixed seeds",
    (pack) => {
      const openedCards = smokeSeeds.flatMap((seed) =>
        openPack({
          catalog: sampleCatalog,
          packId: pack.id,
          seed,
          ownerId
        }).cards.map((card) => {
          const def = sampleCatalog.cardsById.get(card.defId);
          if (!def) {
            throw new Error(`Missing opened card definition ${card.defId}`);
          }
          return def;
        })
      );
      const expectedArchetypes = expectedPackArchetypes[pack.id];
      if (!expectedArchetypes) {
        throw new Error(`Missing archetype expectation for pack ${pack.id}`);
      }

      expect(openedCards.length, pack.id).toBeGreaterThan(0);
      expect(
        openedCards.every((card) => card.design),
        pack.id
      ).toBe(true);
      expect(
        openedCards.some((card) =>
          expectedArchetypes.some((archetype) =>
            card.design?.archetypes.includes(archetype)
          )
        ),
        pack.id
      ).toBe(true);

      if (pack.id === "source_pack") {
        expect(openedCards.some((card) => card.cardType === "Source")).toBe(true);
        expect(
          openedCards.some(
            (card) => card.design?.role === "fixing" || card.tags.includes("Fixing")
          )
        ).toBe(true);
      }
    }
  );

  it("keeps destroyed-trigger payoffs eligible in their archetype packs", () => {
    for (const [packId, cardIds] of Object.entries(destroyedTriggerPackCards)) {
      const pack = sampleCatalog.packsById.get(asPackId(packId));
      if (!pack) {
        throw new Error(`Missing pack ${packId}`);
      }

      for (const cardId of cardIds) {
        const card = sampleCatalog.cardsById.get(asCardDefId(cardId));
        if (!card) {
          throw new Error(`Missing destroyed-trigger card ${cardId}`);
        }

        expect(pack.setWeights[card.set] ?? 0, `${packId}:${cardId}:set`).toBeGreaterThan(
          0
        );
        expect(cardMatchesAnyPackSlot(card, pack), `${packId}:${cardId}:slot`).toBe(true);
      }
    }
  });
});
