# Packbound Playtest Report

## 1. Executive Summary

Current prototype status: Packbound remains demoable as an internal systems demo.
The deterministic debug loop, starter selection, battlefield-first layout,
combat preview, combat recording, rewards, round advancement, and upgrade-lab
path all worked during the browser pass.

Hex topology improved the mental model, but the current presentation needs one
more readability pass. The odd-r stagger makes the board feel less like a flat
spreadsheet, and the combat model is easier to believe when range, adjacency,
and movement use neighboring hexes. The biggest visual issue is that the hex
cells are very large in the current browser viewport, so the board starts with a
wide horizontal scroll and the first visible slice can show mostly empty c0/c1
cells while the placed units are off to the right.

Range and movement are clearer on hexes. Movement lines now say "moved one hex,"
and the observed steps in Rotbloom Recall and Upgrade Lab were deterministic and
understandable. Melee/ranged identity remains clear through the ATK/HP/AS/RNG
chips, `Melee`/`Ranged` labels, and inspector text.

The board feels less like a spreadsheet than before because the cell silhouettes
and odd-row offsets create a more tactical visual language. It still does not
yet feel like one shared autobattler battlefield: Ally Hex Board and Enemy Hex
Board remain separate grids joined by a `vs` divider, and range/target causality
is still mostly learned from the inspector and combat summary.

Top 3 remaining blockers:

1. The hex board is too wide in the current first viewport; starter units can be
   offscreen behind horizontal scroll.
2. Ally and Enemy boards still feel like two submitted boards, not one tactical
   arena.
3. Range and target selection are not previewed on the board, so hex range is
   clear after reading text but not visually obvious before combat.

Recommended next task: `feat(client): improve hex battlefield readability`.

## 2. Environment And Commands

- Commit tested: `a66e841902716a4ab5efca97a27c03bbf02727de`
- OS/environment: Windows, PowerShell, Codex desktop workspace
- Node version: `v24.14.0`
- pnpm version: `11.7.0`
- Browser/tool used: Codex in-app browser control against local Vite, plus
  Playwright browser smoke
- Dev server URL: `http://127.0.0.1:5173/`
- Screenshot path: `C:\Code Projects\Packbound\playtest-notes\latest-ui.png`
- Screenshot created: yes, full-page screenshot overwritten at the required path
- Stale dev servers before testing: none found on ports `4173`, `5173-5180`
- Dev server cleanup: stopped Vite listener PID `27616`
- Common dev ports after cleanup: clear
- Report file behavior: `PLAYTEST_REPORT.md` was overwritten, not duplicated

| Command               | Status | Notes                                         |
| --------------------- | ------ | --------------------------------------------- |
| `pnpm format:check`   | Pass   | Prettier check passed before playtest.        |
| `pnpm lint`           | Pass   | ESLint passed.                                |
| `pnpm typecheck`      | Pass   | Workspace typecheck passed.                   |
| `pnpm test`           | Pass   | 27 files, 268 tests passed.                   |
| `pnpm build`          | Pass   | Workspace build and client Vite build passed. |
| `pnpm balance:report` | Pass   | No warnings in printed smoke outcomes.        |
| `pnpm test:browser`   | Pass   | 2 Chromium smoke tests passed.                |
| `pnpm dev`            | Pass   | Served Vite at `http://127.0.0.1:5173/`.      |

## 3. Coverage Summary

| Scenario         | Rounds reached | Combat recorded     | Hex movement observed             | Hex readability | Notes                                                                                                                                                                                                                                              |
| ---------------- | -------------- | ------------------- | --------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ember Scrappers  | Round 2        | Round 1 and Round 2 | Yes, Round 2                      | Mixed           | Hex labels and odd rows were visible. Round 1 was adjacent and resolved immediately. Round 2 showed an enemy Ember Scraprunner moving one hex from `r0 c0` to `r0 c1`. Sparkcatch Apprentice was inspected from the pool as a `2 RNG` Ranged unit. |
| Rotbloom Recall  | Round 2        | Round 1 and Round 2 | Yes, repeatedly                   | Good            | Best movement showcase. Recalled Ember Scraprunner advanced one hex at a time while Hollow Caller attacked from `2 RNG`. Odd-row movement from `r3 c1` to `r2 c2` read naturally as a hex step.                                                    |
| Cloudspire Phase | Round 2        | Round 1 and Round 2 | No movement in observed summaries | Good            | Cloudgate Adept and Mistwing Scout preserved ranged identity. Cloudgate Adept attacked Rootbrace Guardian from range in Round 2 without needing to close.                                                                                          |
| Upgrade Lab      | Round 1        | Round 1             | Yes                               | Mixed           | Upgraded Cinder Scout was inspected, placed legally, and moved one hex from `r0 c0` to `r0 c1`. The board layout stayed readable after placement, but the wide board made the first screenshot feel too zoomed in.                                 |

## 4. Hex Board Readability

Staggered rows did read as a hex board. The full-page screenshot showed odd rows
visibly offset, and DOM measurements confirmed odd rows started about 58 pixels
to the right of even rows in the default viewport. The labels `Odd-r hex` and
`Odd rows offset` helped connect the visible stagger to the simulator model.

Hex-shaped cells were readable, but oversized. Empty cells are quiet and the
hex silhouettes are clear, yet the current board row width pushes the important
occupied cells offscreen in the first visible slice. On the default debug route,
the screenshot showed large empty c0/c1 hexes first; the starter units at c2/c3
required horizontal board scroll to see visually.

Row/column labels are still useful for debug playtesting. They make summary
lines like `r3 c1` to `r2 c2` interpretable. However, row/column labels alone
do not explain odd-r neighbor relationships to a new viewer. The labels are
acceptable for an internal systems demo, but the board itself needs better
range and target visualization.

Occupied cells stand out once visible. Unit cards show layer, name, card type,
stat chips, keywords, upgrade badges, and Inspect controls. Support-layer cards
remained readable in the board-grid style during prior smoke coverage, and the
current pass did not reveal a support readability regression.

Ally Hex Board and Enemy Hex Board still feel like two separate boards rather
than one battlefield. The `vs` divider and mirrored panels are understandable
for debugging, but they do not yet communicate a single shared arena. The hex
layout feels more tactical than the previous square grid, but presentation still
needs tighter framing and less horizontal scrolling.

## 5. Hex Range And Movement Evaluation

Units moved when out of hex range. The clearest example was Rotbloom Recall:

- `Your Ember Scraprunner moved one hex from r3 c0 ground to r3 c1 ground toward Rootbrace Guardian.`
- `Your Ember Scraprunner moved one hex from r3 c1 ground to r2 c2 ground toward Rootbrace Guardian.`
- `Your Ember Scraprunner moved one hex from r2 c2 ground to r1 c2 ground toward Rootbrace Guardian.`

Units attacked when in range. Hollow Caller attacked Rootbrace Guardian from
`2 RNG` while the recalled Ember Scraprunner was still closing. Cloudgate Adept
attacked Rootbrace Guardian repeatedly from range in Cloudspire Round 2 without
movement.

Movement looked deterministic. The repeated Rotbloom path was stable across
preview and recorded summaries. The diagonal-looking move from `r3 c1` to
`r2 c2` made sense in the odd-r layout and was easier to accept on a hex board
than it would have been on a square grid.

Movement made positioning matter. Melee units no longer feel like they are
magically attacking across the board; they spend attack-ready moments closing
distance. It was clear when a unit moved instead of attacking because movement
lines use the `move` kind and say "moved one hex." It was clear when a unit
attacked because attack and damage lines follow separately.

No unit appeared stuck. No unit attacked out of hex range in the observed
summaries. No unit appeared to move into an occupied ground cell. No infinite
movement loop or max-duration warning appeared in the commands or browser
playthrough.

Movement was sometimes noisy in long summaries. Rotbloom Round 1 had enough
movement and attack lines to prove the model, but Cloudspire Round 2 reached
123 events and became difficult to scan. One-hex movement makes sense, but the
summary needs a compact timeline or filtering before longer combats feel easy
to read.

## 6. Melee / Ranged Identity

Melee Units felt different from ranged Units. Ember Scraprunner and Cinder
Scout showed `1 RNG` and `Melee`, and their out-of-range examples moved instead
of attacking. Hollow Caller, Sparkcatch Apprentice, Mistwing Scout, and
Cloudgate Adept showed `2 RNG` and `Ranged`.

The range text in the inspector made sense:

`Maximum hex distance for basic attacks. Units outside range move one neighboring ground hex toward their selected target when their attack timer is ready.`

Ranged Units attacked from farther away. Hollow Caller attacked while its
recalled melee ally was still moving. Cloudgate Adept attacked Rootbrace
Guardian from range in Round 2 without closing.

ATK / HP / AS / RNG chips are still enough for internal comprehension. They are
compact and scannable on cards and in inspectors. The UI still needs better
range explanations on the board itself: range rings, target preview, or threat
bands would let players understand why a unit is safe, threatened, moving, or
attacking without reading the inspector first.

## 7. Combat Summary Readability

Movement lines improved with hex wording. The phrase "moved one hex" is more
accurate and more evocative than "moved from/to" alone. It reinforces that the
board topology is not square Manhattan movement anymore.

Representative lines observed:

- `Your Cinder Scout moved one hex from r0 c0 ground to r0 c1 ground toward Ember Scraprunner.`
- `Your Ember Scraprunner moved one hex from r3 c1 ground to r2 c2 ground toward Rootbrace Guardian.`
- `Your Hollow Caller attacked Rootbrace Guardian.`
- `Cloudgate Adept dealt 1 attack damage to Rootbrace Guardian.`
- `Enemy Ember Scraprunner attacked Cloudgate Adept.`

Attack, damage, destroyed, and trigger-source lines remain readable in short
combats. They become noisy in long combats. Cloudspire Round 2 was mechanically
useful but produced 123 events, which is too much for a player to scan without
collapsing, filtering, grouping, or a compact timeline.

A compact movement timeline is still needed, but not before the hex board
readability pass. The board currently needs to fit and foreground occupied
cells better so the timeline has a reliable visual anchor.

## 8. Bugs Or Suspected Bugs

No confirmed gameplay or simulator bugs were found.

### UX Confusion: Hex Board Is Too Wide In The First Viewport

- Steps to reproduce: Open `http://127.0.0.1:5173/`, wait for Battlefield, view
  the default Ember Scrappers board, and inspect the full-page screenshot at
  `playtest-notes/latest-ui.png`.
- Observed behavior: The hex cells are large and the board starts with a
  horizontal scroll. The first visible board slice can show mostly empty c0/c1
  cells while the actual starter units at c2/c3 are offscreen.
- Expected behavior: The first battlefield viewport should show the relevant
  occupied cells, or the board should be scaled/framed so the player immediately
  sees both sides' combatants.
- Reproducibility: Reproduced on the default route during this pass.
- Severity: Medium UX issue. It does not break simulation, but it weakens the
  value of the new hex topology.

### UX Confusion: Two Hex Boards Still Do Not Feel Like One Arena

- Steps to reproduce: Play any normal starter through combat preview and record.
- Observed behavior: Ally Hex Board and Enemy Hex Board are clear individually,
  but they still feel like separate submitted boards joined by a `vs` divider.
- Expected behavior: The battlefield should communicate that both boards
  participate in one shared tactical distance model.
- Reproducibility: Reproduced in Ember Scrappers, Rotbloom Recall, Cloudspire
  Phase, and Upgrade Lab.
- Severity: Medium UX issue.

### UX Confusion: Range Is Still Text-First

- Steps to reproduce: Inspect melee and ranged units, then read combat preview
  before and after movement.
- Observed behavior: Range is clear in stat chips, inspector text, and summary
  lines. The board itself does not show range, target, or threat bands.
- Expected behavior: The board should preview selected targets and reachable
  hex ranges so movement and attacks are visually predictable.
- Reproducibility: Reproduced across all scenarios.
- Severity: Medium UX issue.

### Noise Risk: Long Combat Summaries Are Hard To Scan

- Steps to reproduce: Run Cloudspire Phase to Round 2 and record combat against
  Bloomhide Stomper.
- Observed behavior: The recorded summary reached 123 events. Attack/damage
  sequences were correct but dense.
- Expected behavior: Long fights should have a compact timeline or collapsible
  grouping so movement, attacks, phase, and outcomes can be read quickly.
- Reproducibility: Reproduced in Cloudspire Phase Round 2.
- Severity: Low to medium UX issue.

Smoke and balance report anomalies: none. No warnings appeared in the printed
balance outcomes. No units were observed moving into occupied ground cells,
failing to move when they should, attacking out of hex range, or looping until
max duration.

## 9. Recommended Next Tasks

Do Next: `feat(client): improve hex battlefield readability`

Why: the hex topology is conceptually better, but the current visual framing is
too wide and can hide occupied cells behind horizontal scroll. Before adding a
timeline or range overlays, the board should reliably show the relevant units
and preserve the odd-row hex read at normal desktop widths.

Do Soon:

- `feat(client): add combat movement timeline`
- `feat(client): add range and target preview overlays`
- `feat(client): unify ally and enemy board presentation`
- Add compact summary grouping for long attack/damage sequences
- Add a small board legend or hover/help affordance for odd-r row/col meaning

Still Wait:

- Pixi
- Drag/drop
- Multiplayer
- Backend
- Broad card expansion
- Full animated replay
- Board resources
- Deployment

## 10. Raw Notes

- Screenshot created at `C:\Code Projects\Packbound\playtest-notes\latest-ui.png`.
- Default route screenshot confirmed `Enemy Hex Board`, `Ally Hex Board`,
  `Odd-r hex`, and `Odd rows offset` labels.
- Odd rows were visibly offset in the DOM and screenshot.
- The screenshot also showed oversized hex cells and horizontal board scroll.
- Ember Scrappers Round 1 resolved immediately with adjacent attacks and no
  movement, which was expected.
- Ember Scrappers Round 2 showed enemy Ember Scraprunner moving one hex after
  Recall.
- Rotbloom Recall was the clearest hex movement showcase.
- Cloudspire Phase was the clearest ranged-identity showcase.
- Upgrade Lab confirmed upgraded Cinder Scout stats and one-hex movement.
- No raw logs, screenshots, traces, or local artifacts were committed.
