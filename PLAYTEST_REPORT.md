# Packbound Playtest Report

## 1. Executive Summary

Current prototype status: Packbound is still demoable as an internal systems
demo. The deterministic run loop, starter selection, battlefield-first layout,
combat preview, recorded summary, rewards, advancement, and upgrade-lab path all
worked during browser playthrough.

Range and movement made combat more understandable. The biggest improvement is
that `RNG`, `Melee`, and `Ranged` now describe real simulator behavior: melee
Units close distance, ranged Units can attack without closing as much, and the
combat summary explains movement with clear from/to coordinates.

Melee/ranged identity is now materially clearer. In Rotbloom, Hollow Caller
attacked from range while the recalled Ember Scraprunner walked several tiles
toward Rootbrace Guardian. In Cloudspire, Cloudgate Adept repeatedly attacked
from range without movement. In Upgrade Lab, the upgraded Cinder Scout clearly
moved one tile instead of attacking.

The battlefield feels more like the main game object than before. Occupied cells
stand out, default inspectors immediately show combatants, and side/frontline
labels help the player orient. It still feels like two separate submitted boards
plus a combat log rather than one fully legible shared arena.

Top 3 remaining blockers:

1. Movement is visible in summary text, but not as a compact timeline or board
   replay; long fights require reading many lines.
2. Ally Board and Enemy Board still read as adjacent debug grids, so shared
   distance is explainable but not visually obvious.
3. Range/target causality is not previewed on the board; players can see the
   stat and the result, but not the selected target or threat band before
   combat.

Recommended next task: `feat(client): add combat movement timeline`.

## 2. Environment And Commands

- Commit tested: `c8e6ddb`
- OS/environment: Windows, PowerShell, Codex desktop workspace
- Node version: `v24.14.0`
- pnpm version: `11.7.0`
- Browser/tool used: Playwright browser smoke plus Codex in-app browser control
  against local Vite
- Dev server URL: `http://127.0.0.1:5173/`
- Stale dev servers before testing: none found on ports `4173`,
  `5173-5180`
- Dev server cleanup: stopped Vite listener PID `9028`
- Common dev ports after cleanup: clear

| Command               | Status | Notes                                    |
| --------------------- | ------ | ---------------------------------------- |
| `pnpm format:check`   | Pass   | Prettier check passed before playtest.   |
| `pnpm lint`           | Pass   | ESLint passed.                           |
| `pnpm typecheck`      | Pass   | Workspace typecheck passed.              |
| `pnpm test`           | Pass   | 26 files, 258 tests passed.              |
| `pnpm build`          | Pass   | Workspace build and client Vite build.   |
| `pnpm balance:report` | Pass   | No warnings in printed smoke outcomes.   |
| `pnpm test:browser`   | Pass   | 2 Chromium smoke tests passed.           |
| `pnpm dev`            | Pass   | Served Vite at `http://127.0.0.1:5173/`. |

## 3. Coverage Summary

| Scenario         | Rounds reached | Combat recorded     | Movement observed                                                 | Range clarity | Notes                                                                                                                                                          |
| ---------------- | -------------- | ------------------- | ----------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ember Scrappers  | Round 2        | Round 1 and Round 2 | Yes, Round 2 enemy Ember Scraprunner moved toward the player Unit | Good          | Round 1 was adjacent and resolved immediately; Round 2 showed movement before later attack. Sparkcatch Apprentice in pool clearly showed `2 RNG` and `Ranged`. |
| Rotbloom Recall  | Round 2        | Round 1 and Round 2 | Yes, repeatedly                                                   | Strong        | Best range/movement demo. Recalled Ember Scraprunner crossed tiles while Hollow Caller attacked from range. Round 2 showed both sides closing.                 |
| Cloudspire Phase | Round 2        | Round 1 and Round 2 | No movement in observed summaries                                 | Good          | Cloudgate Adept showed ranged identity by attacking Rootbrace Guardian from `2 RNG` without needing to close. Phase behavior remained readable.                |
| Upgrade Lab      | Round 1        | Round 1             | Yes                                                               | Good          | Cinder Scout upgraded to Lv 1, placed legally, then moved from `r0 c0` to `r0 c1` toward Ember Scraprunner.                                                    |

## 4. Range And Movement Evaluation

Units did move when out of range. The clearest example was Rotbloom Recall:
`Your Ember Scraprunner moved from r3 c0 ground to r3 c1 ground toward
Rootbrace Guardian`, then continued through `r2 c1`, `r2 c2`, `r1 c2`, and
`r1 c3`.

Units attacked when in range. Hollow Caller attacked Rootbrace Guardian from
range while the recalled melee unit was still moving. Cloudgate Adept attacked
Rootbrace Guardian repeatedly without movement, which made its `2 RNG` identity
feel real.

Movement looked deterministic. Repeated combat previews and recorded summaries
matched, and movement steps were stable: horizontal progress first when
appropriate, then row progress toward the target.

Movement made positioning matter more than before. A melee unit starting far
away no longer magically hit across the board. It spent ready attack ticks
closing distance, which made starting row and column matter in the summary.

It was clear why a unit moved because movement lines include the mover, from/to
coordinates, and target. It was clear why a unit attacked when attack lines
followed once distance closed, though the UI does not explicitly say "now in
range."

No stuck units were observed in browser playthrough. Blocked occupied-cell
behavior was not directly observed in the manual scenarios, but the simulator
test coverage covers it.

Movement frequency felt about right for this MVP. It was sparse in quick Ember
and Cloudspire fights, and visible in Rotbloom where the board state actually
created distance. In longer Rotbloom fights, movement lines were useful but
mixed with many attack/damage lines.

Representative sequence:

- `Your Ember Scraprunner moved from r3 c0 ground to r3 c1 ground toward Rootbrace Guardian.`
- `Your Hollow Caller attacked Rootbrace Guardian.`
- `Your Ember Scraprunner moved from r2 c2 ground to r1 c2 ground toward Rootbrace Guardian.`
- `Enemy Rootbrace Guardian attacked Ember Scraprunner.`

## 5. Melee / Ranged Identity

Melee Units felt different from ranged Units. Ember Scraprunner, Cinder Scout,
Sporeback Beast, and Vanishing Warden all read as melee through `1 RNG` and
`Melee`. Ranged cards such as Sparkcatch Apprentice, Hollow Caller, Cloudgate
Adept, and Mistwing Scout read as ranged through `2 RNG` and `Ranged`.

The range text in the inspector made sense:
`Maximum Manhattan distance for basic attacks. Units outside range move one
ground tile toward their selected target when their attack timer is ready.`

Ranged Units attacked from farther away. Cloudgate Adept attacked Rootbrace
Guardian from range in Round 2 without closing. Hollow Caller attacked while its
recalled melee ally was still moving.

Melee Units closed distance. The upgraded Cinder Scout moved one tile at `0.1s`
instead of attacking. Recalled Ember Scraprunner spent multiple ticks moving
toward targets in Rotbloom.

ATK / HP / AS / RNG chips are enough to understand the basic unit shape. The
best quick-read pattern is now: ATK says damage, HP says durability, AS explains
timing, RNG explains whether the unit must move.

The UI still needs better range explanation on the board itself. Inspector text
is clear, but the grid does not preview which cells are in range or which target
the unit selected.

## 6. Battlefield Readability

The Ally Board and Enemy Board are easier to scan. Occupied cells have stronger
contrast, empty cells are quieter, and Unit/Relic cards stand apart from empty
space.

Side labels help. `Enemy side`, `Your side`, `Frontline r0`, `Backline r3`, and
the mirrored enemy labels made the debug board more understandable. They also
made it easier to interpret movement lines such as `r3 c0` to `r3 c1`.

Row and column labels remain useful for debug playtesting. They are necessary
right now because movement lines use `r/c` coordinates.

Support layer readability is acceptable for the current scope. Relics are
visually distinct, and support placement no longer competes as much with Unit
cards.

Upgraded unit display worked in Upgrade Lab. Cinder Scout showed `Lv 1`, `2 ATK
/ 3 HP / 1.1 speed / 1 range`, `1 RNG`, and `Melee`, then placed onto the board
legally.

The board now feels closer to the main game object, but it does not yet feel
like a single unified battlefield. The visual layout is still two board grids
with `vs` between them, while the simulator uses one coordinate interpretation
for distance and movement summaries.

## 7. Combat Summary Readability

Movement lines are readable and useful. They are not too noisy in short fights.
In Rotbloom, where movement is the point of the combat, multiple movement lines
felt appropriate.

Attack, damage, destroyed, recall, phase, and trigger-source lines remained
readable. Barrier and Phase lines from existing systems still fit alongside the
new movement lines.

Movement lines are easier to understand than raw JSON. Raw JSON was not needed
to understand the observed movement behavior; the visible summary was enough.
Raw details are still useful for debugging exact event payloads.

Representative summary lines observed:

- `Your Cinder Scout moved from r0 c0 ground to r0 c1 ground toward Ember Scraprunner.`
- `Enemy Ember Scraprunner moved from r0 c0 ground to r0 c1 ground toward Ember Scraprunner.`
- `Your Ember Scraprunner moved from r3 c0 ground to r3 c1 ground toward Rootbrace Guardian.`
- `Your Hollow Caller attacked Rootbrace Guardian.`
- `Your Cloudgate Adept attacked Rootbrace Guardian.`

The summary is the right level for an engine-first debug client, but a compact
movement timeline would make it much easier to answer "who moved, then who
attacked" without scanning attack and damage lines.

Gold and reward context still worked. Recorded combats showed `Gold: +4`,
`+5`, or `+6`, reward choices were available afterward, and round advancement
continued normally.

## 8. Bugs Or Suspected Bugs

No confirmed functional bugs were found.

UX confusion: combat movement is not visible on the board.

- Steps to reproduce: Play Rotbloom Recall, ready combat, and read the combat
  summary after the recalled Ember Scraprunner moves several times.
- Observed behavior: The summary clearly lists movement, but the board remains a
  static planning grid.
- Expected behavior: A player should have a compact way to follow movement
  without mentally replaying coordinates.
- Reproducibility: Reproduced in Rotbloom Recall and Upgrade Lab.
- Severity: Medium UX clarity issue.

UX confusion: the two-board layout still weakens shared battlefield intuition.

- Steps to reproduce: Compare Ally Board and Enemy Board during any starter
  combat, then read movement lines using shared `r/c` coordinates.
- Observed behavior: Movement uses clear coordinates, but the visual board still
  feels like two separate debug boards joined by `vs`.
- Expected behavior: The player should more immediately understand that these
  boards participate in one tactical distance model.
- Reproducibility: Reproduced in all normal starters.
- Severity: Medium UX clarity issue.

UX confusion: long summaries mix movement with many attack/damage lines.

- Steps to reproduce: Play Rotbloom Recall Round 1 or Cloudspire Phase Round 2.
- Observed behavior: Movement lines are readable, but longer combats require
  scanning many attacks, damage lines, and destroyed lines.
- Expected behavior: Movement and attacks should be skimmable as a compact
  sequence before detailed damage text.
- Reproducibility: Reproduced in longer Round 2 summaries.
- Severity: Low.

No browser evidence was found of units moving into occupied cells, attacking out
of range, ranged Units behaving like melee, infinite movement loops,
max-duration failures, unexpected warnings, or reward/run-flow regressions.

## 9. Recommended Next Tasks

Do Next: `feat(client): add combat movement timeline`

Why: the simulator now produces meaningful movement events, and the summary text
is understandable. The next clarity jump is a compact event timeline that shows
movement and attacks together without requiring raw JSON or full visual replay.

Do Soon:

- `feat(client): add range/target preview overlays`
- `feat(client): improve battlefield stat display`
- `fix(sim): refine movement targeting` if playtests uncover unintuitive target
  choices after timeline visibility improves

Still Wait:

- Pixi
- drag/drop
- multiplayer
- backend
- broad card expansion
- full visual combat replay
- board resources
- deployment

## 10. Raw Notes

- Ember Scrappers Round 1: adjacent Scraprunner duel resolved immediately with
  no movement, which was correct but not a movement showcase.
- Ember Scrappers Round 2: enemy Ember Scraprunner moved once from `r0 c0` to
  `r0 c1` before later attacking.
- Rotbloom Recall Round 1: best demo; recalled Ember Scraprunner closed across
  several tiles while Hollow Caller attacked from range.
- Rotbloom Recall Round 2: both sides showed melee closing behavior.
- Cloudspire Phase Round 1 and Round 2: little/no movement, but Cloudgate Adept
  clearly attacked from range.
- Upgrade Lab: upgraded Cinder Scout placed legally, showed Lv 1 melee stats,
  and moved one tile toward Ember Scraprunner at `0.1s`.
- Browser console errors observed: none.
- Common dev ports were clear before testing and after cleanup.
