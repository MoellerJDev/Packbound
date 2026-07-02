import { useMemo, useState } from "react";

import { sampleCatalog } from "@packbound/content";
import { createCardInstance, openPack, validatePlanningState } from "@packbound/rules";
import {
  asCardDefId,
  asCardInstanceId,
  asPackId,
  asPlayerId,
  type BoardState,
  type CardDefId,
  type SourceRowState,
  type SpellrailState
} from "@packbound/shared";
import { resolveCombat } from "@packbound/sim";

const playerId = asPlayerId("debug-player");
const opponentId = asPlayerId("debug-opponent");

const cardName = (defId: CardDefId): string =>
  sampleCatalog.cardsById.get(defId)?.name ?? defId;

const makeInstance = (
  ownerId: ReturnType<typeof asPlayerId>,
  defId: string,
  zone: "sourceRow" | "spellrail"
) =>
  createCardInstance({
    ownerId,
    defId: asCardDefId(defId),
    zone,
    instanceId: asCardInstanceId(`${ownerId}:${defId}:${zone}`)
  });

const debugSourceRow = (
  ownerId: ReturnType<typeof asPlayerId>,
  ...defIds: string[]
): SourceRowState => ({
  maxSlots: 4,
  cards: defIds.map((defId, index) =>
    createCardInstance({
      ownerId,
      defId: asCardDefId(defId),
      zone: "sourceRow",
      instanceId: asCardInstanceId(`${ownerId}:${defId}:source:${index}`)
    })
  )
});

const debugSpellrail = (
  ownerId: ReturnType<typeof asPlayerId>,
  ...defIds: string[]
): SpellrailState => ({
  maxSlots: 2,
  cards: defIds.map((defId) => makeInstance(ownerId, defId, "spellrail"))
});

const playerBoard: BoardState = {
  placements: [
    {
      cardInstanceId: asCardInstanceId("debug-player:ember_scraprunner:board"),
      defId: asCardDefId("ember_scraprunner"),
      ownerId: playerId,
      position: { row: 0, col: 2, layer: "ground" }
    },
    {
      cardInstanceId: asCardInstanceId("debug-player:signal_nest:board"),
      defId: asCardDefId("signal_nest"),
      ownerId: playerId,
      position: { row: 1, col: 2, layer: "support" }
    }
  ]
};

const opponentBoard: BoardState = {
  placements: [
    {
      cardInstanceId: asCardInstanceId("debug-opponent:sporeback_beast:board"),
      defId: asCardDefId("sporeback_beast"),
      ownerId: opponentId,
      position: { row: 0, col: 3, layer: "ground" }
    }
  ]
};

export function App() {
  const [packIndex, setPackIndex] = useState(1);
  const packSeed = `debug-run-pack-${packIndex}`;

  const openedPack = useMemo(
    () =>
      openPack({
        catalog: sampleCatalog,
        packId: asPackId("ember_foundry_pack"),
        seed: packSeed,
        ownerId: playerId
      }),
    [packSeed]
  );

  const sourceRow = useMemo(
    () => debugSourceRow(playerId, "ember_source", "ember_source"),
    []
  );
  const spellrail = useMemo(() => debugSpellrail(playerId, "sparkfall"), []);

  const validation = useMemo(
    () =>
      validatePlanningState({
        catalog: sampleCatalog,
        board: playerBoard,
        sourceRow,
        spellrail
      }),
    [sourceRow, spellrail]
  );

  const combat = useMemo(
    () =>
      resolveCombat({
        catalog: sampleCatalog,
        seed: "client-debug-combat",
        playerA: {
          playerId,
          board: playerBoard,
          sourceRow,
          spellrail
        },
        playerB: {
          playerId: opponentId,
          board: opponentBoard,
          sourceRow: debugSourceRow(opponentId, "bloom_source"),
          spellrail: debugSpellrail(opponentId)
        }
      }),
    [sourceRow, spellrail]
  );

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <h1>Packbound</h1>
          <p>Deterministic engine debug</p>
        </div>
        <button type="button" onClick={() => setPackIndex((value) => value + 1)}>
          Open Pack
        </button>
      </section>

      <section className="debug-grid">
        <div className="panel">
          <h2>Sample Pack</h2>
          <p className="muted">{packSeed}</p>
          <ol className="card-list">
            {openedPack.slots.map((slot) => (
              <li key={slot.cardInstanceId}>
                <span>{cardName(slot.cardDefId)}</span>
                <small>{slot.actualRarity}</small>
              </li>
            ))}
          </ol>
        </div>

        <div className="panel">
          <h2>Planning Check</h2>
          <div className={validation.ok ? "status ok" : "status error"}>
            {validation.ok ? "Legal" : "Illegal"}
          </div>
          <ul className="message-list">
            {validation.errors.map((error) => (
              <li key={`${error.code}:${error.cardInstanceId ?? "state"}`}>
                {error.message}
              </li>
            ))}
          </ul>
        </div>

        <div className="panel wide">
          <h2>Combat Event Log</h2>
          <p className="muted">
            Winner: {combat.winner} | Events: {combat.events.length}
          </p>
          <pre>{JSON.stringify(combat.events.slice(0, 28), null, 2)}</pre>
        </div>
      </section>
    </main>
  );
}
