# Packbound Playtest Report

## 1. Executive Summary

Current prototype status: Packbound remains a demoable internal systems prototype.
The debug client supports a complete starter-to-combat-to-reward loop, reward
opening, latest reward markers, card inspection, upgrade visibility, and the
upgrade-lab scenario without observed runtime regressions.

Reward explanations improve pack choice. They turn the reward screen from "pick
a pack name" into a readable tactical choice with cost, gold after purchase,
trait fit, duplicate chase, fixing, pack bias, and warnings in one place.

Explanation density is close to right for an engine-first debug client. Five
reason lines is readable, but the content can lose distinctiveness when multiple
packs share the same headline or when off-family packs inherit active-trait
claims from broadly eligible Source/support cards.

Economy and pack choice now feel more meaningful than before because every
choice shows cost and post-purchase gold. The current first rewards were all
affordable, so the economy created mild tension rather than hard tradeoffs.

Top 3 remaining blockers:

1. Pack-family identity is not explicit enough. Off-family packs can truthfully
   say they match active traits through Sources or shared tags, but that makes
   them feel more aligned than their actual pack bias.
2. Headlines are sometimes too similar. In the Ember first reward screen,
   Cloudspire, Rotbloom, and Ember all said they were likely to support the
   current trait direction.
3. Economy pressure is still light in normal round-one rewards. Cost is clear,
   but affordability rarely forces a hard decision yet.

Recommended next task: `feat(content): add explicit pack family metadata`.

## 2. Environment And Commands

- Commit tested:
  `35974be9fdcffa20b70ba7ac319829541197e093`
- OS/environment: Windows, PowerShell, Codex desktop workspace
- Node version: `v24.14.0`
- pnpm version: `11.7.0`
- Browser/tool used: Playwright browser smoke through `pnpm test:browser`, then
  Codex in-app browser control against local Vite
- Dev server URL: `http://127.0.0.1:5173/`
- Stale dev servers before browser testing: none found on ports `4173`,
  `5173-5180`
- Dev server cleanup: stopped the Vite listener after playtesting
- Common dev ports after cleanup: clear

| Command               | Status | Notes                                          |
| --------------------- | ------ | ---------------------------------------------- |
| `pnpm format:check`   | Pass   | Prettier check passed before browser playtest. |
| `pnpm lint`           | Pass   | ESLint passed.                                 |
| `pnpm typecheck`      | Pass   | Workspace typecheck passed.                    |
| `pnpm test`           | Pass   | 24 files, 240 tests passed.                    |
| `pnpm build`          | Pass   | Workspace build and client Vite build passed.  |
| `pnpm balance:report` | Pass   | Report printed to console only.                |
| `pnpm test:browser`   | Pass   | 2 Chromium tests passed.                       |
| `pnpm dev`            | Pass   | Managed Vite server used at `127.0.0.1:5173`.  |

The first managed dev-server start attempt did not inherit the bundled Node
runtime path and exited before serving. It was restarted with the runtime path
set explicitly, then served successfully. No repo artifacts were kept.

## 3. Coverage Summary

| Scenario         | Rounds reached | Combat recorded     | Rewards inspected              | Reward chosen      | Notes                                                                                                      |
| ---------------- | -------------- | ------------------- | ------------------------------ | ------------------ | ---------------------------------------------------------------------------------------------------------- |
| Ember Scrappers  | Round 2        | Round 1 and Round 2 | First and second reward offers | Ember Foundry Pack | Placed Sparkcatch Apprentice, inspected all latest reward cards, duplicate chase appeared in round 2.      |
| Rotbloom Recall  | Round 2        | Round 1 and Round 2 | First and second reward offers | Rotbloom Pack      | Placed Sporeback Beast, inspected all latest reward cards, Source Pack was a credible cheaper alternative. |
| Cloudspire Phase | Round 2        | Round 1 and Round 2 | First and second reward offers | Cloudspire Pack    | Placed Mistwing Scout, inspected all latest reward cards, duplicate progress became clear.                 |
| Upgrade Lab      | Round 1        | Round 1             | Reward offers after upgrade    | Ember Foundry Pack | Cinder Scout upgraded to Lv 1, reward explanations appeared normally afterward.                            |

## 4. Reward Offer Explanation Evaluation

Reward explanations are easy to read in the debug UI. The cost line, post-buy
gold line, headline, and bullets create a clear decision stack.

They are not too long for the current prototype, but they are near the upper
edge. The density problem is less about bullet count and more about repeated
strategic claims across packs.

Cost and affordability are clear. Every inspected offer showed lines like
`Cost 4 gold` and `After purchase: 2 gold`. No first-offer pack was
unaffordable in the tested normal runs.

Pack bias is clear and honest. Wording like "Biased toward Scrapper, Ember,
Relic, and Spark cards" correctly avoids promising exact pulls.

Trait/teamup relevance is useful, but it can over-broaden the decision. In the
Ember first reward screen, Cloudspire and Rotbloom both claimed active Ember or
Echo Fodder relevance even though their visible pack families pointed elsewhere.
That looks technically explainable through eligible Sources/shared content, but
it weakens pack identity.

Duplicate/upgrade relevance is one of the strongest reason types. The second
Ember offer saying Ember Foundry can contain Ember Scraprunner at `2 / 3` pool
copies immediately made the duplicate-chase choice legible.

Source/fixing relevance is useful. Source Pack explanations such as "May help
play expensive or off-Aspect cards already in your pool" and "Cheaper fixing
option" helped identify it as a real alternative rather than a generic cheap
pack.

Warning reasons help. "You have active copies that must return to pool before
upgrading" and "Duplicate Sources are not upgradeable yet" were honest and
prevented overpromising.

Good observed text:

- "Matches active Ember, Echo Fodder, and Scrapper traits."
- "Can contain Ember Scraprunner, currently 2 / 3 pool copies toward an
  upgrade."
- "May help play expensive or off-Aspect cards already in your pool."
- "Biased toward Gleam, Tide, Wisp, and Barrier cards."

Confusing observed text:

- Cloudspire Pack on the Ember run: "Matches active Ember and Echo Fodder
  traits." This is probably true through eligible cross-pack cards, but it makes
  the pack sound more Ember-aligned than its family and bias imply.
- Several off-family packs used the same headline, "Likely to support your
  current trait direction," which reduced scanability.

No reason looked dishonest in the sense of promising guaranteed pulls. The main
issue is emphasis, not truthfulness.

## 5. Pack Choice Decision Quality

Ember Scrappers:

- Offered packs: Cloudspire Pack, Rotbloom Pack, Ember Foundry Pack.
- Chosen pack: Ember Foundry Pack.
- Why chosen: it had the clearest match to active Ember, Echo Fodder, and
  Scrapper, plus the expected Scrapper/Ember/Relic/Spark bias.
- Explanation influence: high. The chosen pack had the strongest family fit.
- Cost influence: low. All three cost 4 and left 2 gold.
- Trait influence: high.
- Duplicate influence: low on the first offer, high on round 2 when Ember
  Foundry showed Ember Scraprunner at `2 / 3`.
- Source/fixing influence: low on the first offer, clearer in round 2 when
  Source Pack appeared.
- Broad match after opening: yes. The pack produced Ember Scraprunner copies,
  Ember Source, Cinder Tally, Rustline Cannon, and Cracked Prism. The new cards
  supported Ember/Scrapper/Relic and exposed duplicate progress.

Rotbloom Recall:

- Offered packs: Rotbloom Pack, Source Pack, Cloudspire Pack.
- Chosen pack: Rotbloom Pack.
- Why chosen: it matched active Bloom, Shade, and Source Greed, pushed Ashes,
  Beast, and Husk, and named duplicate potential for Hollow Caller and
  Sporeback Beast.
- Explanation influence: high.
- Cost influence: medium. Source Pack was cheaper and left 3 gold, making it a
  credible alternative.
- Trait influence: high.
- Duplicate influence: medium. Duplicate potential text helped, though the
  chosen open produced more Relic/Source duplicate clarity than Unit upgrade
  readiness.
- Source/fixing influence: medium. Source Pack looked useful but not more
  important than Rotbloom family fit.
- Broad match after opening: yes. The pack produced Shade Binder, Bloom Source,
  Cracked Prism, Due Marker copies, and Thicket Colossus, matching Shade/Bloom,
  Ashes/Offer, and Source/fixing expectations.

Cloudspire Phase:

- Offered packs: Rotbloom Pack, Cloudspire Pack, Source Pack.
- Chosen pack: Cloudspire Pack.
- Why chosen: it matched active Tide, Phase, and Gleam, pushed Source Greed,
  Barrier, and Warden, and named duplicate potential for Cloudgate Adept and
  Mistwing Scout.
- Explanation influence: high.
- Cost influence: medium. Source Pack was cheaper and had fixing relevance, but
  Cloudspire had the better strategic fit.
- Trait influence: high.
- Duplicate influence: high. The first Cloudspire open immediately produced
  Mistwing Scout duplicates, Cloudgate Adept progress, and Vanishing Warden
  progress.
- Source/fixing influence: medium. The pack also produced off-aspect Sources,
  which broadly matched the source/fixing side of the system.
- Broad match after opening: yes. The pack produced Mistwing Scout copies,
  Cloudgate Adept, Vanishing Warden, Ember Source, and Shade Source. It matched
  duplicate and family bias, while also showing how broad Source pulls can blur
  family identity.

## 6. Economy Evaluation

Current gold is visible enough. Run State shows current gold, combat summaries
show gold earned, and each reward choice shows post-purchase gold.

Gold earned after combat is clear. The Last Recorded Combat panel showed
`Gold: +6` or `Gold: +5` depending on outcome.

Pack costs create some tension, especially when Source Pack is offered at 3
gold against archetype packs at 4. The tested first reward screens did not
produce unaffordable choices, so the tension was mostly "which plan is worth the
remaining gold" rather than "what can I afford."

When all packs were affordable, explanations still created meaningful choices.
Trait fit, duplicate progress, and fixing relevance mattered more than cost on
the first normal reward screens.

Economy feels about right for this prototype, leaning generous. Economy tuning
should wait until pack-family metadata and explanation emphasis are refined.
Changing prices now could mask the more important clarity issue.

## 7. Trait / Upgrade / Source Relevance

Reward explanations connect strongly to active and near traits. The best cases
were Rotbloom and Cloudspire, where the chosen archetype pack explained both
current active traits and near-tier pushes.

Duplicate progress is surfaced well. Round 2 made this especially clear:
Ember Foundry called out Ember Scraprunner at `2 / 3`, and Cloudspire called
out Cloudgate Adept progress.

Unit/Echo upgrade relevance is understandable. Inspector checks on reward cards
also reinforced why active copies do not count and why combat-resolved state
blocks upgrading until planning.

Non-upgradeable duplicate cards are handled honestly. Source and Relic
duplicates showed warnings instead of pretending every duplicate is upgrade
progress.

Source Pack and fixing explanations are useful. They explain both immediate
off-Aspect pressure and future board Charge access. The remaining problem is
that Source eligibility can also cause off-family archetype packs to claim
current-trait relevance too loudly.

## 8. Board, Combat, And Inspector Regression Check

Board grid remains useful. It made starter board state and enemy board state
easy to verify before combat.

Card inspector remains useful. Newly opened cards were inspected in all three
normal starter runs. Inspector text showed cost, stats, upgrade status, Source
details, traits, rules text, and legal actions.

Combat summaries remain readable. Winner, damage, event count, warnings, and
gold gained were clear. Trigger-source lines were still readable, including
destroyed-trigger reactions.

Upgrade lab still works. Cinder Scout upgraded from three Lv 0 pool copies into
one Lv 1 pool card, and the upgrade progress row disappeared afterward.

No functional regression from reward explanation changes was observed.

## 9. Bugs Or Suspected Bugs

No confirmed functional bugs were found.

UX confusion: off-family packs can overstate trait relevance.

- Steps to reproduce: Start Ember Scrappers, place Sparkcatch Apprentice, record
  combat, inspect first reward choices.
- Observed behavior: Cloudspire Pack and Rotbloom Pack both said they matched
  active Ember or Echo Fodder traits and used the same "Likely to support your
  current trait direction" headline as the Ember pack.
- Expected behavior: Off-family packs should still mention honest overlap, but
  the primary headline should make the pack family and bias feel distinct.
- Reproducibility: Reproduced in the deterministic Ember first reward screen.
- Severity: Medium UX clarity issue.

UX confusion: repeated warnings can make duplicate Sources feel noisy.

- Steps to reproduce: Open archetype packs that add duplicate Sources, advance,
  record another combat, inspect reward choices.
- Observed behavior: Multiple offers include "Duplicate Sources are not
  upgradeable yet."
- Expected behavior: The warning is true, but it may need lower emphasis once
  better pack-family metadata exists.
- Reproducibility: Seen after Ember and Rotbloom openings.
- Severity: Low.

## 10. Recommended Next Tasks

Do Next: `feat(content): add explicit pack family metadata`

Why: the helper is already useful, readable, and honest. The biggest remaining
clarity gap is that inferred pack identity can blur because the rules helper is
deriving fit from eligible cards, shared tags, and Sources. Explicit pack family
metadata would let the UI say "this is the Ember/Scrapper pack" or "this is the
Tide/Gleam Phase pack" before listing secondary overlaps.

Do Soon:

- `feat(client): tune reward explanation density`
- `feat(rules): tune economy and affordability pressure`
- `feat(client): add direct grid placement controls`
- Improve warning priority once pack-family metadata exists.

Still Wait:

- Pixi
- Drag/drop
- Multiplayer
- Backend
- Broad card expansion
- Full visual combat replay
- Board resources
- Deployment

## 11. Raw Notes

- Ember: placed Sparkcatch Apprentice, chose Ember Foundry Pack, opened Ember
  Scraprunner x2, Ember Source, Cinder Tally, Rustline Cannon, and Cracked
  Prism.
- Rotbloom: placed Sporeback Beast, chose Rotbloom Pack, opened Shade Binder,
  Bloom Source, Cracked Prism, Due Marker x2, and Thicket Colossus.
- Cloudspire: placed Mistwing Scout, chose Cloudspire Pack, opened Ember
  Source, Mistwing Scout x2, Cloudgate Adept, Vanishing Warden, and Shade
  Source.
- Upgrade lab: Cinder Scout upgraded successfully to Lv 1, then reward
  explanations appeared normally after combat.
- Browser console errors observed: none.
- Managed dev server was stopped after testing, and common Packbound dev ports
  were clear afterward.
