# Packbound Playtest Report

## 1. Executive Summary

Packbound remains demoable as an internal systems demo at commit
`35183ea153d730d46d7a75d50ec6f6e7dfaf8ad3`. The debug client still supports the
full deterministic loop: starter selection, card inspection, trait/teamup
review, Source Row review, legal loadout edits, combat preview, recorded combat,
gold rewards, priced reward packs, latest reward markers, round advancement,
normal-run duplicate visibility, and the upgrade lab.

The compact Player Board Grid and Enemy Board Grid materially improve board
readability. The old board list forced a mental translation from `r0 c2 ground`
text into a spatial board. The grid now makes occupied cells, empty cells, and
front-row spacing much easier to scan. It is not beautiful, but it is enough for
internal playtesting.

Layer readability is the biggest win. Same-coordinate ground/support pairs such
as Sparkcatch Apprentice plus Signal Nest, or Sporeback Beast plus Ash Ledger,
are now understandable without reading the list row-by-row. Grid inspection also
feels natural: clicking a board card in either grid routes to the existing Card
Inspector and keeps all detailed card text in one place.

The board grid is now good enough to move on. It still lacks direct placement
controls and richer threat badges, but those are not blocking the next internal
demo pass. The next task should be reward-offer explanations, because pack rows
still show cost and affordability without explaining expected contents, trait
fit, duplicate relevance, or strategic role.

Top 3 remaining blockers:

1. Reward offers still do not explain pack bias, likely roles, trait relevance,
   or duplicate relevance.
2. Grid placement is read-only; actual placement still depends on list order and
   default positions, which caused one easy misclick in the upgrade lab.
3. Enemy threat reading is better spatially, but still lacks compact ability,
   keyword, or danger summaries in-grid.

Recommended next task: `feat(client): improve reward offer explanations`.

## 2. Environment And Commands

- Commit hash tested: `35183ea153d730d46d7a75d50ec6f6e7dfaf8ad3`
- OS/environment: `Microsoft Windows NT 10.0.26200.0`, PowerShell, Codex desktop
- Node version: `v24.14.0`
- pnpm version: `11.7.0`
- Browser/tool used: Codex in-app Browser for manual playtest; Playwright
  Chromium for `pnpm test:browser`
- Dev server URL: `http://127.0.0.1:5173/`
- Browser console warnings/errors during manual pass: none captured
- Stale dev servers before testing: none found on ports `4173`, `5173`-`5180`
- Listeners after Playwright smoke: none found
- Dev server cleanup after manual playtest: stopped Vite listener on PID `26432`
- Common dev ports after cleanup: clear
- Temporary Vite logs: removed after cleanup

| Command               | Status | Notes                                          |
| --------------------- | ------ | ---------------------------------------------- |
| `pnpm format:check`   | Pass   | All matched files used Prettier style.         |
| `pnpm lint`           | Pass   | ESLint completed.                              |
| `pnpm typecheck`      | Pass   | All workspace typechecks completed.            |
| `pnpm test`           | Pass   | 23 test files, 230 tests.                      |
| `pnpm build`          | Pass   | Workspace build and Vite client bundle passed. |
| `pnpm balance:report` | Pass   | Deterministic report printed no warnings.      |
| `pnpm test:browser`   | Pass   | 2 Chromium smoke tests passed.                 |
| `pnpm dev`            | Pass   | Managed Vite start on `127.0.0.1:5173`.        |

## 3. Coverage Summary

| Scenario         | Rounds reached       | Combat recorded | Reward opened   | Grid inspected                    | Notes                                                                                          |
| ---------------- | -------------------- | --------------- | --------------- | --------------------------------- | ---------------------------------------------------------------------------------------------- |
| Ember Scrappers  | Round 2 reward phase | Yes, rounds 1-2 | Yes, round 1    | Player, enemy, support Relic      | Tide Source reward enabled Signal Nest; grid showed Sparkcatch plus Signal Nest at r0 c0.      |
| Rotbloom Recall  | Round 2 reward phase | Yes, rounds 1-2 | Yes, round 1    | Player, enemy, support Relic      | Grid made Sporeback Beast plus Ash Ledger at r0 c0 much clearer than the list.                 |
| Cloudspire Phase | Round 3 planning     | Yes, rounds 1-2 | Yes, rounds 1-2 | Player, enemy, latest reward card | Latest reward Signal Wisp Echo placed into grid at r0 c1; duplicate progress remained visible. |
| Upgrade Lab      | Round 1 reward phase | Yes, round 1    | No              | Upgraded Cinder Scout from grid   | Lv 1 badge appeared in Player Board Grid; grid inspection showed upgraded stats.               |

## 4. Player Board Grid Evaluation

The Player Board Grid is easier to understand than the Board list. The list is
still precise, but the grid makes spatial state visible immediately: initial
starters appear as a single ground card near the front, added Units fill earlier
cells, and support Relics stack inside the same coordinate instead of becoming
another abstract line.

Occupied and empty cells are clear enough. Empty cells are quiet and labelled,
which helps the grid read as a board rather than a sparse list. The coordinate
labels are useful for internal testing, especially when comparing the grid to
combat summary lines, but they are still technical. They should not be mistaken
for final player-facing board language.

Ground/support layers are clear. The best examples were:

- Ember: Sparkcatch Apprentice at `r0 c0 ground` plus Signal Nest at
  `r0 c0 support`.
- Rotbloom: Sporeback Beast at `r0 c0 ground` plus Ash Ledger at
  `r0 c0 support`.

Support cards are visually associated with their coordinate. This finally makes
Relics feel like board objects instead of side-list entries.

Upgraded cards are visible. In the upgrade lab, Cinder Scout appeared in the
Player Board Grid at `r0 c0 ground` with an `Lv 1` badge, and inspecting it from
the grid showed `2 ATK / 3 HP / 1.1 speed / 1 range`.

The grid updates correctly after loadout changes. It updated after placing
Sparkcatch Apprentice, Sporeback Beast, Ash Ledger, Mistwing Scout, Signal Nest,
Signal Wisp Echo, and upgraded Cinder Scout. Grid inspection feels natural and
should remain the primary way to inspect active board cards.

## 5. Enemy Board Grid Evaluation

The Enemy Board Grid makes encounter threats easier to read than the old
encounter board list. Early encounters are simple, but even a single enemy Unit
at `r0 c3 ground` reads better spatially than a list row. It was easier to
anticipate how Ember Scraprunner, Rootbrace Guardian, and later Shade boards
lined up against the player board.

Enemy card inspection works easily. Inspecting enemy grid cards selected the
same Card Inspector with zone `encounter`, no legal actions, and normal card
details. This is a good pattern: the grid answers "where is it?" and the
inspector answers "what does it do?"

Enemy positioning is clearer, but threat reading is still incomplete. The grid
does not yet show compact keyword or danger markers, so the player still needs
to inspect Rootbrace Guardian for Guard, Ember Scraprunner for Quickstart, and
Cloudspire or boss Relics for support effects. That is acceptable for internal
iteration, but future enemy-grid badges would help.

## 6. Layer And Positioning Readability

The ground layer is clear. Units read as board occupants, and adding new Units
visibly fills the grid. This made Mistwing Scout, Sporeback Beast, Sparkcatch
Apprentice, Signal Wisp Echo, and upgraded Cinder Scout easier to understand.

The support layer is the main improvement. Signal Nest and Ash Ledger were much
easier to reason about once they appeared as support cards inside a coordinate.
Due Marker was also easier to evaluate after the grid made the support-layer
concept obvious, even when not placed in every run.

Same-cell ground/support pairs are now understandable. They still need the
small layer labels, but they no longer look like accidental duplicate card rows.

Adjacency is better but not solved. The grid helps explain "adjacent" because
cells are visible, yet there is no hover, highlight, or placement preview. For
now that is fine. A compact grid is enough before Pixi; direct grid placement
controls can wait until reward explanations are done.

Row/column language remains technical. It is useful for debugging and
cross-checking logs, but final UI should eventually communicate front/back and
neighbor relationships more naturally.

## 7. Reward, Trait, Upgrade, And Economy Context

Pack costs and gold still read clearly. Reward rows show `Cost N gold` and
`After purchase: N gold`, and Run State shows current gold. The economy remains
generous in these early runs; every observed reward offer was affordable.

Reward markers still work. New pool cards showed `new` badges after each opened
pack, and latest reward rows were easy to find. Cloudspire's second reward
produced latest reward cards including Signal Wisp Echo, Skyhook Lookout, Gleam
Lantern, Vanishing Warden, and Tide-Gleam Conduit; placing Signal Wisp Echo from
a latest reward row updated the Player Board Grid.

Traits/teamups remain useful but dense. The grid helps trait context indirectly
because active board contributors are easier to locate, but the trait panel
still carries most of that explanation.

Duplicate progress remains visible. Cloudspire showed Vanishing Warden at
`2 / 3`, and the upgrade lab still showed Cinder Scout ready to upgrade. The
grid improved upgrade visibility once an upgraded card moved to the board, but
pool duplicate decisions still rely on badges and the Upgrade Progress panel.

The board grid helps understand Relics and support placement more than it helps
pack choice. Reward-offer explanations are now the clearer next gap.

## 8. Combat And Card Readability

Combat summaries remain readable. Winner, damage, event count, warnings, gold,
and concise event lines are enough for normal internal reading. Trigger-source
lines are still valuable; Ember and Rotbloom runs showed destroyed-trigger,
Recall, and support-generated summon behavior without requiring raw event JSON.

Card inspection from the grid works naturally. Player board cards, enemy board
cards, support Relics, latest reward board cards, and upgraded Cinder Scout all
used the existing Card Inspector. There is no need for a second inspector.

Remaining wording confusion is minor. The phrase "grid" itself is not
player-facing, and row/column labels remain debug-ish. Raw JSON is still not
needed for normal internal reading, though the debug details remain useful when
checking exact event metadata.

## 9. Bugs Or Suspected Bugs

No gameplay or rules bugs were found in this pass.

UX confusion:

- Title: Generic `Place on Board` list buttons can target the wrong card.
- Steps to reproduce: Open `/?scenario=upgrade-lab`, upgrade Cinder Scout, then
  click the first global `Place on Board` action without reading the row.
- Observed behavior: Sparkcatch Apprentice is placed first because it appears
  earlier in the Pool Cards list, consuming the remaining Board Charge.
- Expected behavior: This is legal, but the player intent was to place upgraded
  Cinder Scout.
- Reproducibility: Reproducible when using unscoped/generic action clicks.
- Severity: Low UX confusion, not a bug. Direct grid placement or stronger row
  affordances can address it later.

UX confusion:

- Title: Reward cards cannot be used until advancing back to planning.
- Steps to reproduce: Record combat, open a reward pack, then look for loadout
  actions before pressing Advance.
- Observed behavior: New cards are visible, but actions are unavailable because
  the phase is `combatResolved`.
- Expected behavior: Rules are correct; loadout edits only happen during
  planning.
- Reproducibility: Always.
- Severity: Low. The phase guidance says to advance, but the reward-to-planning
  transition is still easy to forget during a playtest checklist.

## 10. Recommended Next Tasks

Do Next: `feat(client): improve reward offer explanations`

Why: board readability is good enough for internal playtesting, while reward
offers still do not explain why one pack is strategically better than another.
The next iteration should add concise pack-bias, trait-fit, duplicate-fit, and
role hints to reward choices.

Do Soon:

- Improve enemy-grid threat badges for keywords, Relics, and likely danger.
- Add optional grid placement affordances after reward explanations.
- Make row/column language friendlier once the board UX moves beyond debug
  tooling.
- Consider compact support/adjacency hints for Relics such as Due Marker, Cinder
  Tally, Ash Ledger, Signal Nest, and Gleam Lantern.

Still Wait:

- Pixi
- drag/drop
- multiplayer
- backend
- broad card expansion
- full visual combat replay
- board resources
- deployment
- economy tuning, until reward explanations make pack choice intent clearer

## 11. Raw Notes

- No stale dev-port listeners were found before testing.
- `pnpm test:browser` passed before the manual browser pass.
- Dev server ran at `http://127.0.0.1:5173/` and was stopped afterward.
- Browser console errors/warnings captured during manual testing: none.
- Ember: placed Sparkcatch Apprentice, added a reward Tide Source, then placed
  Signal Nest as support over Sparkcatch's coordinate.
- Rotbloom: placed Sporeback Beast and Ash Ledger into the same coordinate,
  making ground/support layering clear.
- Cloudspire: placed Mistwing Scout, later placed latest-reward Signal Wisp Echo
  into the grid, and saw Vanishing Warden duplicate progress.
- Upgrade lab: upgraded Cinder Scout, placed it intentionally from its row, saw
  `Lv 1` in the Player Board Grid, inspected upgraded stats from the grid, and
  recorded combat.
