# Archetype Matrix

The first Packbound micro-set uses five small archetypes. Cards can belong to
more than one archetype through design metadata, but each archetype needs at
least one enabler, one payoff, and one interaction or defensive tool.

## `ember_scrappers`

- Aspects: Ember, sometimes Shade.
- Game plan: Pressure, Relics, death sparks, cheap tempo, and Echo fodder.
- Enablers: `ember_scraprunner`, `cinder_scout`, `signal_wisp_echo`.
- Payoffs: `rustline_cannon`, `foundry_foreman`.
- Interaction: `sparkfall`, `slag_sparkler`.
- Defensive tools: Mostly tempo through Quickstart and damage; true defense is
  intentionally light.
- Starter kit implications: Starts with `ember_scraprunner`, `sparkfall`, and a
  spare `signal_nest` to teach board capacity pressure.
- Pack implications: Ember Foundry Pack biases Scrapper, Tinkerer, Relic, and
  Ember cards.
- Not implemented yet: Persistent Relic counters and movement-based tempo.

## `shade_ashes`

- Aspects: Shade, sometimes Bloom.
- Game plan: Ashes, Recall, Offer, disposable Units/Echoes, and grind.
- Enablers: `ash_debt_runner`, `memory_wisp_echo`, `ember_scraprunner`.
- Payoffs: `hollow_caller`, `debt_bound_colossus`.
- Interaction: `debt_siphon`.
- Defensive tools: `contract_husk`.
- Starter kit implications: Starts with `hollow_caller`, Shade/Bloom Sources,
  and a small Unit in Ashes so Recall is visible immediately.
- Pack implications: Rotbloom Pack biases Shade, Bloom, Husk, Beast, and Recall
  cards.
- Not implemented yet: MillToAshes and Void recursion.

## `bloom_bodies`

- Aspects: Bloom, sometimes Shade or Gleam.
- Game plan: High-health Units, stat growth, Guard, healing, and stabilization.
- Enablers: `wildbulk_grazer`, `sporeback_beast`.
- Payoffs: `debt_bound_colossus`, `thicket_colossus`.
- Interaction: Bloom has little direct interaction in this set by design.
- Defensive tools: `rootbrace_guardian`, `mossback_tender`, `greenwake_balms`.
- Starter kit implications: Rotbloom can grow from Shade Recall into larger
  Bloom bodies without changing the starter's simple opener.
- Pack implications: Rotbloom Pack carries both Shade Ashes and Bloom Bodies so
  the pair can blend naturally.
- Not implemented yet: Poison tick damage, full persistent growth engines, and
  battlefield Fields.

## `cloudspire_phase`

- Aspects: Tide and Gleam.
- Game plan: Phase, Barrier, OnEntry value, Airborne tempo, and AntiAir answers.
- Enablers: `cloudgate_adept`, `signal_wisp_echo`.
- Payoffs: `vanishing_warden`.
- Interaction: `skyhook_lookout`, `phase_step`.
- Defensive tools: `gleam_lantern`, `returning_glimmer`, `greenwake_balms`.
- Starter kit implications: Starts with `cloudgate_adept` and `phase_step` so
  Barrier and Phase are both visible without requiring a polished UI.
- Pack implications: Cloudspire Pack biases Tide, Gleam, Wisp, Phase, and
  Barrier cards.
- Not implemented yet: true repositioning, reactive interrupts, and richer
  Airborne/AntiAir combat events.

## `source_greed`

- Aspects: multi-aspect.
- Game plan: Flexible Sources, splashes, higher board Charge, and slower starts.
- Enablers: `cracked_prism`.
- Payoffs: `debt_bound_colossus`, `thicket_colossus`, `vanishing_warden`,
  `rustline_cannon`.
- Interaction: Access to off-aspect Techniques such as `sparkfall`.
- Defensive tools: `gleam_lantern`, `overgrowth_spring`.
- Starter kit implications: No starter kit begins as full Source Greed; it is a
  run-growth direction supported by pack rewards.
- Pack implications: Source Pack biases Source, Fixing, and Relic cards.
- Not implemented yet: choose-one Sources, Source exhaustion, and dynamic Aspect
  conversion.
