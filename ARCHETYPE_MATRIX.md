# Archetype Matrix

The first Packbound micro-set uses five small archetypes. Cards can belong to
more than one archetype through design metadata, but each archetype needs at
least one enabler, one payoff, and one interaction or defensive tool.

## `ember_scrappers`

- Aspects: Ember, sometimes Shade.
- Implemented trait IDs: `ember`, `scrapper`, `echo_fodder`, `relic_engine`.
- Game plan: Pressure, Relics, death sparks, cheap tempo, and Echo fodder.
- Enablers: `ember_scraprunner`, `cinder_scout`, `coal_wisp_echo`,
  `signal_wisp_echo`.
- Payoffs: `sparkcatch_apprentice`, `cinder_tally_relic`, `rustline_cannon`,
  `foundry_foreman`.
- Interaction: `sparkfall`, `slag_sparkler`.
- Defensive tools: Mostly tempo through Quickstart and damage; true defense is
  intentionally light.
- Starter kit implications: Starts with `ember_scraprunner`, `sparkfall`, and
  spare `signal_nest` / `sparkcatch_apprentice` choices to teach board capacity
  pressure and death sparks.
- Pack implications: Ember Foundry Pack biases Scrapper, Tinkerer, Relic, and
  Ember cards.
- Cross-trait partners: Shade Ashes uses Echo deaths, Offering, and destroyed
  triggers; Cloudspire Phase can protect fragile payoff Units or tempo bodies.
- Duplicate-upgrade candidates: `ember_scraprunner`, `coal_wisp_echo`,
  `signal_wisp_echo`, `sparkcatch_apprentice`, and simple death payoffs.
- Economy relationship: Wants cheap Bulk or Ember packs to find duplicates, but
  may buy Source/Fixing packs when Relic payoffs or off-aspect death engines
  appear.
- Potential board-resource relationship: Scrap piles and Ember forges reward
  Scrappers, support Relics, and Units that can survive long enough to harvest.
- Not implemented yet: Persistent Relic counters and movement-based tempo.

## `shade_ashes`

- Aspects: Shade, sometimes Bloom.
- Implemented trait IDs: `shade`, `ashes`, `offering`, `recall`, `husk`.
- Game plan: Ashes, Recall, Offer, disposable Units/Echoes, and grind.
- Enablers: `ash_debt_runner`, `memory_wisp_echo`, `coal_wisp_echo`,
  `ember_scraprunner`.
- Payoffs: `hollow_caller`, `ash_ledger_relic`, `last_word_broker`,
  `debt_bound_colossus`.
- Interaction: `debt_siphon`.
- Defensive tools: `contract_husk`, `mournscale_keeper`.
- Starter kit implications: Starts with `hollow_caller`, Shade/Bloom Sources,
  a small Unit in Ashes, and a spare `ash_ledger_relic` so Recall and ally-death
  payoffs are visible early.
- Pack implications: Rotbloom Pack biases Shade, Bloom, Husk, Beast, and Recall
  cards.
- Cross-trait partners: Ember Scrappers supplies disposable bodies and death
  triggers; Bloom Bodies supplies durable frontline for longer Recall and Offer
  loops.
- Duplicate-upgrade candidates: `hollow_caller`, `ash_ledger_relic`,
  `mournscale_keeper`, `memory_wisp_echo`, `due_marker_relic`, and Offer/Recall
  payoffs.
- Economy relationship: Can justify greed when Recall engines stabilize the
  board, but overbuying economy packs should leave it short on early bodies.
- Potential board-resource relationship: Ash vents reward deaths on or near key
  tiles and could fuel Recall, discounts, or temporary Husk Echo creation.
- Not implemented yet: MillToAshes and Void recursion.

## `bloom_bodies`

- Aspects: Bloom, sometimes Shade or Gleam.
- Implemented trait IDs: `bloom`, `beast`, `guardian`, `barrier`.
- Game plan: High-health Units, stat growth, Guard, healing, and stabilization.
- Enablers: `wildbulk_grazer`, `sporeback_beast`.
- Payoffs: `debt_bound_colossus`, `thicket_colossus`.
- Interaction: Bloom has little direct interaction in this set by design.
- Defensive tools: `rootbrace_guardian`, `mossback_tender`, `greenwake_balms`.
- Starter kit implications: Rotbloom can grow from Shade Recall into larger
  Bloom bodies without changing the starter's simple opener.
- Pack implications: Rotbloom Pack carries both Shade Ashes and Bloom Bodies so
  the pair can blend naturally.
- Cross-trait partners: Shade Ashes turns big bodies and Guards into time for
  recursion; Source Greed helps field heavy Bloom/Gleam payoffs earlier.
- Duplicate-upgrade candidates: `rootbrace_guardian`, `sporeback_beast`,
  `wildbulk_grazer`, `thicket_colossus`, and other large pets/frontliners.
- Economy relationship: Likes Source/Fixing and economy rewards that increase
  Board Charge, but must still buy enough bodies to avoid slow-start losses.
- Potential board-resource relationship: Roots and growth nodes reward Units
  that hold tiles over time, with Bloom Relics or Sources amplifying extraction.
- Not implemented yet: Poison tick damage, full persistent growth engines, and
  battlefield Fields.

## `cloudspire_phase`

- Aspects: Tide and Gleam.
- Implemented trait IDs: `tide`, `gleam`, `phase`, `barrier`, `wisp`,
  `warden`.
- Game plan: Phase, Barrier, OnEntry value, Airborne tempo, and AntiAir answers.
- Enablers: `cloudgate_adept`, `signal_wisp_echo`.
- Payoffs: `vanishing_warden`.
- Interaction: `skyhook_lookout`, `phase_step`.
- Defensive tools: `gleam_lantern`, `returning_glimmer`, `greenwake_balms`.
- Starter kit implications: Starts with `cloudgate_adept` and `phase_step` so
  Barrier and Phase are both visible without requiring a polished UI.
- Pack implications: Cloudspire Pack biases Tide, Gleam, Wisp, Phase, and
  Barrier cards.
- Cross-trait partners: Ember Scrappers appreciates Phase/Barrier protection
  for fragile engines; Bloom Bodies and Gleam tools create sturdier formations
  for OnEntry value.
- Duplicate-upgrade candidates: `mistwing_scout`, `signal_wisp_echo`,
  `cloudgate_adept`, `vanishing_warden`, and protective Phase or Barrier
  payoffs.
- Economy relationship: Can splash through Source Greed, but expensive
  multi-aspect cards make early fixing and pack timing important.
- Potential board-resource relationship: Tide currents and Gleam lenses reward
  repositioning, Airborne/Wisp Units, and support Relics that project protection.
- Not implemented yet: true repositioning, reactive interrupts, and richer
  Airborne/AntiAir combat events.

## `source_greed`

- Aspects: multi-aspect.
- Implemented trait IDs: `source_greed`, plus the five Aspect trait IDs.
- Game plan: Flexible Sources, splashes, higher board Charge, and slower starts.
- Enablers: `cracked_prism`.
- Payoffs: `debt_bound_colossus`, `thicket_colossus`, `vanishing_warden`,
  `rustline_cannon`.
- Interaction: Access to off-aspect Techniques such as `sparkfall`.
- Defensive tools: `gleam_lantern`, `overgrowth_spring`.
- Starter kit implications: No starter kit begins as full Source Greed; it is a
  run-growth direction supported by pack rewards.
- Pack implications: Source Pack biases Source, Fixing, and Relic cards.
- Cross-trait partners: Partners with everything by turning off-aspect pulls
  into playable splashes and making expensive payoffs easier to field.
- Duplicate-upgrade candidates: `cracked_prism`, dual Sources, future economy
  Sources, fixing cards, and high-value Relics that reward extra capacity.
- Economy relationship: Natural home for pack-pricing decisions, discounts,
  rerolls, and greed cards, but it should pay with weaker immediate combat.
- Potential board-resource relationship: Multi-resource extraction can let
  Sources define or convert tile resources without replacing normal pack
  evaluation.
- Not implemented yet: choose-one Sources, Source exhaustion, and dynamic Aspect
  conversion.

## Future Commander / Signature Relic Mapping

Commanders are future run-identity pieces, not current starter-kit content. When
the Command Zone and Rebind lifecycle exist, each starter archetype can map to a
Commander promise without rewriting the current pack matrix.

- `ember_scrappers`: Commander likely starts as a fragile pressure Unit or Relic
  engineer. Signature Relic direction could reward support-layer projectiles or
  controlled death sparks, but should still need packs for bodies and Sources.
- `shade_ashes`: Commander likely cares about Ashes, Recall, or Offering.
  Signature Relic direction could track the first allied death or Recall each
  skirmish, but must avoid becoming a self-contained recursion engine.
- `bloom_bodies`: Commander likely anchors stabilization, Guard, growth, or
  board-resource holding. Signature Relic direction could reward durable tile
  control without replacing heavy Unit pulls.
- `cloudspire_phase`: Commander likely plays around Phase, Barrier, or
  Airborne/Wisp tempo. Signature Relic direction could improve safe returns or
  support positioning, but should not add broad reactive interrupts yet.
- `source_greed`: Commander should be especially constrained. It can help read
  or bridge pack choices, but must not provide universal fixing, universal
  scaling, and universal answers in one piece.

Good mapping rule: the Commander tells the player what kind of run they are
trying to assemble; packs decide whether that run becomes clean, strange, greedy,
or improvised.
