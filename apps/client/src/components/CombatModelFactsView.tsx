import { COMBAT_MODEL_FACTS } from "@packbound/rules";

export const CombatModelFactsView = () => (
  <div className="combat-model-facts">
    <h3>Combat Model</h3>
    <ul className="message-list compact">
      {COMBAT_MODEL_FACTS.map((fact) => (
        <li key={fact.label}>
          <strong>{fact.label}:</strong> {fact.text}
        </li>
      ))}
    </ul>
  </div>
);
