import { expect, type Locator, type Page, test } from "@playwright/test";

import {
  clickPixiCell,
  expectNoBrowserErrors,
  expectNoHorizontalScroll,
  gotoDefaultPlaytestRoute,
  openAdvancedDebugPanels,
  panel
} from "./helpers/browserSmokeHelpers";

const recordDefaultCombat = async (
  page: Page,
  {
    verifyPreview = false
  }: {
    readonly verifyPreview?: boolean;
  } = {}
) => {
  const decisionPanel = page.getByTestId("default-playtest-decision-panel");

  await expect(decisionPanel.getByTestId("default-playtest-upgrade-copy")).toContainText(
    "Cinder Scout"
  );
  await decisionPanel.getByTestId("default-playtest-upgrade-button").click();
  await expect(decisionPanel.getByText("No duplicate upgrade is ready.")).toBeVisible();

  await page.getByRole("button", { name: "Ready Combat" }).click();

  const previewPanel = panel(page, "Upcoming Combat Preview");
  await expect(previewPanel).toBeVisible();
  await expect(previewPanel).toContainText("Forecast:");
  await expect(previewPanel.getByTestId("default-combat-forecast")).toContainText(
    /Favored|Close fight|Danger/
  );
  await expect(previewPanel.getByText(/Winner:/)).toHaveCount(0);

  if (verifyPreview) {
    const previewKeyMoments = previewPanel
      .locator("details.combat-feed-details")
      .filter({ hasText: "Preview Key Moments" });
    await expect(previewKeyMoments.locator("summary")).toHaveText("Preview Key Moments");
    expect(
      await previewKeyMoments.evaluate((node) => (node as HTMLDetailsElement).open)
    ).toBe(false);
    await expect(previewPanel.getByRole("heading", { name: "Key Moments" })).toBeHidden();
  }

  await page.getByRole("button", { name: "Record Combat" }).click();
  await expect(panel(page, "Last Recorded Combat").getByText(/Winner:/)).toBeVisible();
};

const expectDefaultCombatPlayback = async (page: Page, rendererHost: Locator) => {
  const playbackPanel = page.getByTestId("default-combat-playback");
  await expect(
    playbackPanel.getByRole("heading", { name: "Combat Playback" })
  ).toBeVisible();
  const playbackStatus = playbackPanel.getByTestId("default-combat-playback-status");
  const playbackCommandIndex = playbackPanel.getByTestId(
    "default-combat-playback-command-index"
  );
  const playbackLatest = playbackPanel.getByTestId("default-combat-playback-latest");
  await expect(playbackStatus).toHaveText(/playing|complete/);
  await expect(playbackCommandIndex).toHaveText(/\d+ \/ [1-9]\d*/);
  await playbackPanel.getByRole("button", { name: "Reset Combat Playback" }).click();
  await expect(playbackStatus).toHaveText("idle");
  await expect(playbackCommandIndex).toHaveText(/0 \/ [1-9]\d*/);
  const beforeStep = await playbackCommandIndex.textContent();
  await playbackPanel.getByRole("button", { name: "Step Combat Playback" }).click();
  await expect(playbackCommandIndex).not.toHaveText(beforeStep ?? "");
  await expect(playbackStatus).toHaveText("paused");
  await expect(playbackLatest).not.toHaveText("No command visualized yet.");
  const afterStepIndex = await playbackCommandIndex.textContent();
  const afterStepStatus = await playbackStatus.textContent();
  await clickPixiCell(page, rendererHost, 4, 2);
  await expect(playbackCommandIndex).toHaveText(afterStepIndex ?? "");
  await expect(playbackStatus).toHaveText(afterStepStatus ?? "");
  await expect(
    page
      .locator(
        '[data-testid="default-pixi-selection-context"], [data-testid="default-pixi-replay-inspection-note"]'
      )
      .filter({ hasText: /Selected ally|Selected enemy|Replay token inspection/ })
      .first()
  ).toBeVisible();
  await playbackPanel.getByRole("button", { name: "Reset Combat Playback" }).click();
  await expect(playbackStatus).toHaveText("idle");
  await expect(playbackCommandIndex).toHaveText(/0 \/ [1-9]\d*/);
  await expect(rendererHost.locator("canvas")).toHaveCount(1);
};

const expectLastRecordedCombatSummary = async (page: Page) => {
  const recordedPanel = panel(page, "Last Recorded Combat");
  await expect(recordedPanel.getByText(/Winner:/)).toBeVisible();
  await expect(recordedPanel.locator("p.muted").first()).toContainText("Damage:");
  const combatRecap = recordedPanel.getByTestId("default-combat-recap");
  await expect(combatRecap).toBeVisible();
  await expect(combatRecap.getByRole("heading", { name: "Combat recap" })).toBeVisible();
  await expect(combatRecap).toContainText(/Result/);
  await expect(combatRecap).toContainText(/Victory|Draw|Defeat/);
  await expect(combatRecap).toContainText("Damage");
  await expect(combatRecap).toContainText("Gold gained");
  await expect(combatRecap).toContainText("Key moments");
  await expect(combatRecap).toContainText("Commander");
  await expect(
    recordedPanel.getByText("Skirmish damage resets after combat")
  ).toBeVisible();
  await expect(recordedPanel.getByText(/Events:/)).toBeVisible();
  await expect(recordedPanel.getByText(/Gold: \+/)).toBeVisible();
  await expect(recordedPanel.locator(".combat-result-strip")).toContainText(
    "No combat return"
  );
  await expect(recordedPanel.getByRole("heading", { name: "Key Moments" })).toBeVisible();
  await expect(recordedPanel.getByText(/Events shown: \d+ of \d+/)).toBeVisible();
  const combatFeed = recordedPanel.locator("details.combat-feed-details");
  await expect(combatFeed).toBeVisible();
  expect(await combatFeed.evaluate((node) => (node as HTMLDetailsElement).open)).toBe(
    false
  );
  await combatFeed.getByText("Combat Event Feed").click();
  await expect(combatFeed.getByText("Damage to you", { exact: true })).toBeVisible();
  await expect(combatFeed.getByText("Damage to enemy", { exact: true })).toBeVisible();
  await expect(combatFeed.getByText("Warnings", { exact: true })).toBeVisible();
};

const claimCombatTrainingUpgrade = async (page: Page) => {
  const commanderUpgradePanel = panel(page, "Commander Upgrades");
  await expect(
    commanderUpgradePanel.getByText(
      "Choose one Commander upgrade for this reward. It applies only to the Commander."
    )
  ).toBeVisible();
  await expect(
    commanderUpgradePanel.getByText("Combat Training", { exact: true })
  ).toBeVisible();
  await expect(
    commanderUpgradePanel.getByText("Rebind Calibration", { exact: true })
  ).toBeVisible();
  await expect(
    commanderUpgradePanel.getByTestId("commander-upgrade-panel-level")
  ).toHaveText("Lv 0");
  await commanderUpgradePanel
    .getByRole("button", { name: "Apply Combat Training" })
    .click();
  await expect(
    commanderUpgradePanel.getByTestId("commander-upgrade-panel-level")
  ).toHaveText("Lv 1");
  await expect(
    commanderUpgradePanel.getByText("Commander upgrade claimed for this reward.")
  ).toBeVisible();
  await expect(
    commanderUpgradePanel.getByTestId("commander-latest-upgrade")
  ).toContainText("Combat Training");
};

const openAndCommitFirstPackOffer = async (page: Page) => {
  const packMarketPanel = panel(page, "Pack Market");
  await expect(packMarketPanel.getByText(/Cost \d+ gold/).first()).toBeVisible();
  await expect(
    packMarketPanel.getByText(/After purchase: \d+ gold/).first()
  ).toBeVisible();
  await expect(
    packMarketPanel.getByRole("button", { name: "Open Pack Offer" }).first()
  ).toBeVisible();
  await packMarketPanel.getByRole("button", { name: "Open Pack Offer" }).first().click();

  await expect(page.getByTestId("post-pack-suggestions-panel")).toHaveCount(0);
  const packOffer = page.getByTestId("pack-offer-panel");
  await expect(packOffer.getByRole("heading", { name: "Pack Offer" })).toBeVisible();
  await expect(packOffer).toContainText(/pick 2 of 5/i);
  await expect(packOffer.getByTestId("pack-offer-card")).toHaveCount(5);
  await expect(packOffer.getByTestId("pack-offer-card-facts")).toHaveCount(5);
  await expect(packOffer.getByTestId("pack-offer-fit")).toHaveCount(5);
  await expect(packOffer.getByTestId("pack-offer-card-facts").first()).toContainText(
    /Unit|Echo|Source|Technique|Relic|Field/
  );
  await expect(packOffer.getByText(/Cost:|Stats:|Effect:/).first()).toBeVisible();
  await expect(packOffer.getByTestId("pack-offer-fit").first()).toContainText(
    /Board Charge|Source|Spellrail|If picked|Likely blocked/
  );
  await expect(packOffer.getByTestId("pack-offer-pick-count")).toHaveText(
    "Selected 0 / 2"
  );
  await expect(page.getByRole("button", { name: "Advance" })).toBeDisabled();
  await packOffer.getByTestId("pack-offer-card").nth(0).getByRole("checkbox").check();
  await packOffer.getByTestId("pack-offer-card").nth(1).getByRole("checkbox").check();
  await expect(packOffer.getByTestId("pack-offer-pick-count")).toHaveText(
    "Selected 2 / 2"
  );
  await packOffer.getByRole("button", { name: "Commit Pack Picks" }).click();

  const postPackSuggestions = page.getByTestId("post-pack-suggestions-panel");
  await expect(postPackSuggestions).toBeVisible();
  await expect(
    postPackSuggestions.getByRole("heading", { name: "Suggested next edits" })
  ).toBeVisible();
  await expect(postPackSuggestions.getByText(/Latest pack:/)).toBeVisible();
  await expect(
    postPackSuggestions.getByText(
      "New cards are in your pool. Advance to the next planning round to edit your loadout."
    )
  ).toBeVisible();

  return postPackSuggestions;
};

const advanceToNextPlanningAfterRewards = async (page: Page) => {
  await page.getByRole("button", { name: "Advance" }).click();
  await openAdvancedDebugPanels(page);
  const runStatePanel = panel(page, "What now?");
  const poolPanel = panel(page, "Pool Cards");
  await expect(runStatePanel.getByText("2 / 3")).toBeVisible();
  await expect(runStatePanel.getByText(/Next:/)).toBeVisible();
  await expect(poolPanel.getByText(/Latest pack:/)).toBeVisible();
  await expect(poolPanel.getByText(/Paid \d+ gold/)).toBeVisible();
  await expect(poolPanel.getByText("new").first()).toBeVisible();
};

const applyFirstPostPackSuggestion = async (page: Page, postPackSuggestions: Locator) => {
  const firstSuggestion = postPackSuggestions.getByTestId("post-pack-suggestion").first();
  await firstSuggestion.scrollIntoViewIfNeeded();
  await expect(
    firstSuggestion.getByRole("button", { name: /Apply suggested edit:/ })
  ).toBeVisible();
  const suggestedCardName =
    (await firstSuggestion.getByTestId("post-pack-suggestion-card-name").textContent()) ??
    "";
  const suggestedBaseCardName = suggestedCardName.replace(/\sx\d+$/, "").trim();
  const suggestedAction =
    (await firstSuggestion.getByTestId("post-pack-suggestion-action").textContent()) ??
    "";
  expect(suggestedBaseCardName.length).toBeGreaterThan(0);
  await expect(firstSuggestion.getByText(/High|Medium|Low/).first()).toBeVisible();
  await firstSuggestion.getByRole("button", { name: /Apply suggested edit:/ }).click();
  if (suggestedAction.includes("Source Row")) {
    await expect(
      panel(page, "Source Row").getByText(suggestedBaseCardName, { exact: true })
    ).toBeVisible();
  } else if (suggestedAction.includes("Spellrail")) {
    await expect(
      panel(page, "Spellrail").getByText(suggestedBaseCardName, { exact: true })
    ).toBeVisible();
  } else if (suggestedAction.includes("Board")) {
    await expect(
      panel(page, "Board").getByText(suggestedBaseCardName, { exact: true })
    ).toBeVisible();
  }
};

test("default playtest route starts with concise Pixi play surface", async ({ page }) => {
  const {
    allyInspector,
    battlefield,
    decisionPanel,
    enemyInspector,
    errors,
    playtestRoute,
    rendererHost
  } = await gotoDefaultPlaytestRoute(page);

  const dashboard = page.getByTestId("default-playtest-dashboard");
  await expect(dashboard).toBeVisible();
  await expectNoHorizontalScroll(playtestRoute);
  await expect(
    page.getByRole("heading", { name: "Current Decision", exact: true })
  ).toBeVisible();
  await expect(decisionPanel.getByTestId("default-playtest-decision")).toBeVisible();
  await expect(decisionPanel.getByText("Round")).toBeVisible();
  await expect(decisionPanel.getByText("Phase")).toBeVisible();
  await expect(decisionPanel.getByText("Board Charge")).toBeVisible();
  await expect(decisionPanel.getByTestId("default-playtest-upgrade-copy")).toContainText(
    "Cinder Scout"
  );
  await expect(page.getByTestId("post-pack-suggestions-panel")).toHaveCount(0);
  await expect(page.getByTestId("default-combat-preview-status")).toBeVisible();
  await expect(panel(page, "Last Recorded Combat")).toHaveCount(0);
  const loadoutTray = page.getByTestId("default-loadout-tray");
  await expect(loadoutTray).toBeVisible();
  await expect(
    loadoutTray.getByRole("heading", { name: "Loadout Tray", exact: true })
  ).toBeVisible();
  await expect(loadoutTray.getByTestId("default-loadout-tray-pool")).toContainText(
    "Pool"
  );
  await expect(loadoutTray.getByTestId("default-loadout-tray-board")).toContainText(
    "Board"
  );
  await expect(loadoutTray.getByTestId("default-loadout-tray-sources")).toContainText(
    "Sources"
  );
  await expect(loadoutTray.getByTestId("default-loadout-tray-spellrail")).toContainText(
    "Spellrail"
  );
  await expect(loadoutTray).toContainText(
    "Select, place, and move the cards that shape your next fight."
  );
  await expect(loadoutTray.getByText(/Advanced Debug/)).toHaveCount(0);
  const advancedDebug = page.getByTestId("advanced-debug-panels");
  await expect(advancedDebug).toBeVisible();
  expect(await advancedDebug.evaluate((node) => (node as HTMLDetailsElement).open)).toBe(
    false
  );
  await expect(advancedDebug.getByText("Advanced Debug Panels")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "What now?", exact: true })
  ).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Battlefield", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Ally Inspector", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Enemy Inspector", exact: true })
  ).toBeVisible();
  const sideLegend = page.getByTestId("default-pixi-side-legend");
  await expect(sideLegend.getByText("Your side", { exact: true })).toBeVisible();
  await expect(sideLegend.getByText("Engagement line", { exact: true })).toBeVisible();
  await expect(sideLegend.getByText("Enemy side", { exact: true })).toBeVisible();
  await expect(page.getByTestId("default-pixi-selection-context")).toContainText(
    "Selected ally: Ember Scraprunner. Selected enemy: Ember Scraprunner."
  );

  await expect(rendererHost).toBeVisible();
  await expect(rendererHost.locator("canvas")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Play Replay" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Step Replay" })).toHaveCount(0);
  await expect(page.getByText("Renderer Feed")).toHaveCount(0);
  const debugFallback = battlefield.locator("details.renderer-debug-board");
  await expect(debugFallback).toBeVisible();
  await expect(debugFallback.getByText("React/CSS Debug Board")).toBeVisible();
  expect(await debugFallback.evaluate((node) => (node as HTMLDetailsElement).open)).toBe(
    false
  );
  await expect(page.getByTestId("hex-arena")).toBeHidden();
  await expect(
    allyInspector.getByRole("heading", { name: "Ember Scraprunner" })
  ).toBeVisible();
  await expect(allyInspector.getByText("Your side", { exact: true })).toBeVisible();
  await expect(allyInspector.getByTestId("compact-inspector-rules")).toContainText(
    "Quickstart. When destroyed, sparks the nearest enemy."
  );
  await expect(enemyInspector.getByText(/\| encounter \|/)).toBeVisible();
  await expect(enemyInspector.getByText("Enemy side", { exact: true })).toBeVisible();
  await expect(enemyInspector.getByTestId("compact-inspector-rules")).toContainText(
    "Quickstart. When destroyed, sparks the nearest enemy."
  );
  await expect(allyInspector.getByText("Full card details")).toBeVisible();
  const engagementPreview = battlefield.locator(
    ".default-pixi-stage > [data-testid='engagement-preview']"
  );
  await expect(
    engagementPreview.getByRole("heading", { name: "Engagement Preview" })
  ).toBeVisible();
  await expect(engagementPreview.getByText("Ember Scraprunner").first()).toBeVisible();
  await expect(
    engagementPreview.getByText("Your Ember Scraprunner cannot attack yet.")
  ).toBeVisible();
  await expect(
    engagementPreview.getByText("Target is 2 hexes away, range 1.")
  ).toBeVisible();
  await expect(engagementPreview.getByText("Next move: r4 c2 to r4 c3.")).toBeVisible();
  await expect(
    engagementPreview.getByText("Out of range", { exact: true })
  ).toBeVisible();
  await expectNoHorizontalScroll(rendererHost);

  expectNoBrowserErrors(errors);
});

test("default compact inspector can reveal full card details", async ({ page }) => {
  const { allyInspector, enemyInspector, errors, rendererHost } =
    await gotoDefaultPlaytestRoute(page);

  await clickPixiCell(page, rendererHost, 4, 2);
  await expect(
    allyInspector.getByRole("heading", { name: "Ember Scraprunner" })
  ).toBeVisible();
  await expect(allyInspector.getByText(/Unit \| board \| Ember/)).toBeVisible();
  await expect(allyInspector.getByTestId("compact-inspector-rules")).toContainText(
    "Quickstart. When destroyed, sparks the nearest enemy."
  );
  const allyCardDetails = allyInspector.locator("details.card-inspector-details-toggle");
  await expect(allyCardDetails).toBeVisible();
  expect(
    await allyCardDetails.evaluate((node) => (node as HTMLDetailsElement).open)
  ).toBe(false);
  await allyCardDetails.locator("summary").click();
  await expect(allyCardDetails.getByText("Cost")).toBeVisible();
  await expect(allyCardDetails.getByText(/Charge/)).toBeVisible();
  await expect(
    allyCardDetails.getByRole("heading", { name: "Legal Actions" })
  ).toBeVisible();

  await clickPixiCell(page, rendererHost, 3, 3);
  await expect(
    enemyInspector.getByRole("heading", { name: "Ember Scraprunner" })
  ).toBeVisible();
  await expect(enemyInspector.getByText(/Unit \| encounter \| Ember/)).toBeVisible();
  await expect(enemyInspector.getByTestId("compact-inspector-rules")).toContainText(
    "Quickstart. When destroyed, sparks the nearest enemy."
  );
  await expect(page.getByTestId("default-pixi-selection-context")).toContainText(
    "Selected enemy: Ember Scraprunner."
  );

  expectNoBrowserErrors(errors);
});

test("default loadout tray exposes first-fold loadout edits", async ({ page }) => {
  const { battlefield, errors, rendererHost } = await gotoDefaultPlaytestRoute(page);

  const advancedDebug = page.getByTestId("advanced-debug-panels");
  await expect(advancedDebug).toBeVisible();
  expect(await advancedDebug.evaluate((node) => (node as HTMLDetailsElement).open)).toBe(
    false
  );

  const loadoutTray = page.getByTestId("default-loadout-tray");
  const poolTray = loadoutTray.getByTestId("default-loadout-tray-pool");
  const boardTray = loadoutTray.getByTestId("default-loadout-tray-board");
  const sourcesTray = loadoutTray.getByTestId("default-loadout-tray-sources");
  const spellrailTray = loadoutTray.getByTestId("default-loadout-tray-spellrail");
  const defaultPlacementHint = battlefield.getByTestId("default-pixi-placement-hint");

  await expect(loadoutTray).toBeVisible();
  await expect(poolTray.getByText("Sparkcatch Apprentice")).toBeVisible();
  await expect(loadoutTray.getByTestId("default-loadout-tray-education")).toContainText(
    "Board Charge limits deployed board cards"
  );
  await expect(loadoutTray.getByTestId("default-loadout-tray-education")).toContainText(
    "Spellrail slots hold Techniques"
  );
  const resourceBasics = loadoutTray.getByTestId("default-loadout-resource-basics");
  await expect(resourceBasics.locator("summary")).toHaveText("Resource basics");
  expect(await resourceBasics.evaluate((node) => (node as HTMLDetailsElement).open)).toBe(
    false
  );
  await resourceBasics.locator("summary").click();
  await expect(resourceBasics).toContainText(
    "Board Charge limits how many Board cards you can deploy."
  );
  await expect(resourceBasics).toContainText(
    "Sources are active resource cards in the Source Row"
  );
  await expect(resourceBasics).toContainText("Combat Charge/sec is combat energy");
  await expect(resourceBasics).toContainText("Spellrail holds active Techniques");
  await expect(poolTray).toContainText("Cards waiting to be assigned");
  await expect(boardTray.getByText("Ember Scraprunner")).toBeVisible();
  await expect(boardTray).toContainText("Units/Echoes use ground");
  await expect(boardTray).toContainText("Relics/Fields use support");
  await expect(sourcesTray.getByText("Ember Source")).toBeVisible();
  await expect(sourcesTray).toContainText("Source slots");
  await expect(sourcesTray).toContainText("Combat Charge/sec");
  await expect(spellrailTray.getByText("Sparkfall")).toBeVisible();
  await expect(spellrailTray).toContainText("Techniques use Spellrail slots");
  await expect(page.getByText("Renderer Feed")).toHaveCount(0);

  const sparkcatchPoolRow = poolTray
    .getByRole("listitem")
    .filter({ hasText: "Sparkcatch Apprentice" });
  await expect(
    sparkcatchPoolRow.getByRole("button", { name: "Place on Board" })
  ).toBeVisible();
  await expect(
    sparkcatchPoolRow.getByRole("button", { name: "Select Board Cell" })
  ).toHaveCount(0);
  await sparkcatchPoolRow.getByRole("button", { name: "Place on Board" }).click();
  await expect(defaultPlacementHint).toHaveText(
    "Placing Sparkcatch Apprentice. Click a highlighted Pixi cell."
  );
  await clickPixiCell(page, rendererHost, 4, 0);
  await expect(
    boardTray.getByRole("listitem").filter({ hasText: "Sparkcatch Apprentice" }).first()
  ).toBeVisible();

  const emberSourceTrayRow = sourcesTray
    .getByRole("listitem")
    .filter({ hasText: "Ember Source" });
  await emberSourceTrayRow.getByRole("button", { name: "Return to Pool" }).click();
  await expect(sourcesTray.getByText("No Source Row cards.")).toBeVisible();

  await openAdvancedDebugPanels(page);
  await expect(panel(page, "Pool Cards")).toBeVisible();
  await expect(panel(page, "Source Row")).toBeVisible();
  await expect(panel(page, "Spellrail")).toBeVisible();
  await expect(rendererHost.locator("canvas")).toHaveCount(1);

  expectNoBrowserErrors(errors);
});

test("default Pixi zone controls support Source and Spellrail round trips", async ({
  page
}) => {
  const { battlefield, errors, rendererHost } = await gotoDefaultPlaytestRoute(page);
  await openAdvancedDebugPanels(page);

  const sourceRowPanel = panel(page, "Source Row");
  const spellrailPanel = panel(page, "Spellrail");
  const poolPanel = panel(page, "Pool Cards");
  const defaultZoneEditControls = battlefield.getByTestId(
    "default-pixi-zone-edit-controls"
  );

  await expect(rendererHost).toBeVisible();
  await expect(rendererHost.locator("canvas")).toHaveCount(1);

  const emberSourceSourceRow = sourceRowPanel
    .getByRole("listitem")
    .filter({ hasText: "Ember Source" });
  await emberSourceSourceRow.getByRole("button", { name: "Inspect" }).click();
  await expect(
    defaultZoneEditControls.getByTestId("default-pixi-zone-edit-selected")
  ).toHaveText("Ember Source");
  await expect(
    defaultZoneEditControls.getByTestId("default-pixi-zone-edit-selected-zone")
  ).toHaveText("Source Row");
  await expect(
    defaultZoneEditControls.getByTestId("default-pixi-zone-edit-status")
  ).toHaveText("Send Ember Source back to Pool.");
  await defaultZoneEditControls.getByRole("button", { name: "Return to Pool" }).click();
  const emberSourcePoolRow = poolPanel
    .getByRole("listitem")
    .filter({ hasText: "Ember Source" });
  await expect(emberSourcePoolRow).toBeVisible();
  await expect(
    defaultZoneEditControls.getByTestId("default-pixi-zone-edit-selected-zone")
  ).toHaveText("Pool");
  await expect(
    defaultZoneEditControls.getByRole("button", { name: "Add to Source Row" })
  ).toBeVisible();
  await expect(
    defaultZoneEditControls.getByRole("button", { name: "Add to Spellrail" })
  ).toHaveCount(0);
  await defaultZoneEditControls
    .getByRole("button", { name: "Add to Source Row" })
    .click();
  await expect(
    sourceRowPanel.getByRole("listitem").filter({ hasText: "Ember Source" })
  ).toBeVisible();
  await expect(
    defaultZoneEditControls.getByTestId("default-pixi-zone-edit-status")
  ).toHaveText("Send Ember Source back to Pool.");

  const sparkfallSpellrailRow = spellrailPanel
    .getByRole("listitem")
    .filter({ hasText: "Sparkfall" });
  await sparkfallSpellrailRow.getByRole("button", { name: "Inspect" }).click();
  await expect(
    defaultZoneEditControls.getByTestId("default-pixi-zone-edit-selected")
  ).toHaveText("Sparkfall");
  await expect(
    defaultZoneEditControls.getByTestId("default-pixi-zone-edit-selected-zone")
  ).toHaveText("Spellrail");
  await defaultZoneEditControls.getByRole("button", { name: "Return to Pool" }).click();
  const sparkfallPoolRow = poolPanel
    .getByRole("listitem")
    .filter({ hasText: "Sparkfall" });
  await expect(sparkfallPoolRow).toBeVisible();
  await expect(
    defaultZoneEditControls.getByTestId("default-pixi-zone-edit-status")
  ).toHaveText("Send Sparkfall to Source Row or Spellrail.");
  await expect(
    defaultZoneEditControls.getByRole("button", { name: "Add to Spellrail" })
  ).toBeVisible();
  await expect(
    defaultZoneEditControls.getByRole("button", { name: "Add to Source Row" })
  ).toHaveCount(0);
  await defaultZoneEditControls.getByRole("button", { name: "Add to Spellrail" }).click();
  await expect(
    spellrailPanel.getByRole("listitem").filter({ hasText: "Sparkfall" })
  ).toBeVisible();
  await expect(
    defaultZoneEditControls.getByTestId("default-pixi-zone-edit-status")
  ).toHaveText("Send Sparkfall back to Pool.");
  await expect(rendererHost.locator("canvas")).toHaveCount(1);

  expectNoBrowserErrors(errors);
});

test("default Pixi board placement supports cancel blocked and legal cells", async ({
  page
}) => {
  const { battlefield, errors, rendererHost } = await gotoDefaultPlaytestRoute(page);
  await openAdvancedDebugPanels(page);

  const boardPanel = panel(page, "Board");
  const poolPanel = panel(page, "Pool Cards");
  const defaultPlacementHint = battlefield.getByTestId("default-pixi-placement-hint");
  const defaultEditControls = battlefield.getByTestId("default-pixi-board-edit-controls");
  const defaultZoneEditControls = battlefield.getByTestId(
    "default-pixi-zone-edit-controls"
  );

  const sparkcatchPoolRow = poolPanel
    .getByRole("listitem")
    .filter({ hasText: "Sparkcatch Apprentice" });
  await expect(rendererHost).toBeVisible();
  await expect(rendererHost.locator("canvas")).toHaveCount(1);
  await sparkcatchPoolRow.getByRole("button", { name: "Select Board Cell" }).click();
  await expect(
    defaultZoneEditControls.getByTestId("default-pixi-zone-edit-selected")
  ).toHaveText("Sparkcatch Apprentice");
  await expect(
    defaultZoneEditControls.getByTestId("default-pixi-zone-edit-status")
  ).toHaveText("Sparkcatch Apprentice has no legal Source Row or Spellrail move.");
  await expect(
    defaultEditControls.getByTestId("default-pixi-board-edit-mode")
  ).toHaveText("Place");
  await expect(
    defaultEditControls.getByTestId("default-pixi-board-edit-selected")
  ).toHaveText("Sparkcatch Apprentice");
  await expect(
    defaultEditControls.getByTestId("default-pixi-board-edit-status")
  ).toHaveText("Click a highlighted Pixi cell to place this card.");
  await expect(
    defaultEditControls.getByRole("button", { name: "Cancel Placement" })
  ).toBeVisible();
  await expect(defaultPlacementHint).toHaveText(
    "Placing Sparkcatch Apprentice. Click a highlighted Pixi cell."
  );
  await defaultEditControls.getByRole("button", { name: "Cancel Placement" }).click();
  await expect(
    defaultEditControls.getByTestId("default-pixi-board-edit-mode")
  ).toHaveText("Inspect");
  await clickPixiCell(page, rendererHost, 4, 0);
  await expect(
    boardPanel.getByRole("listitem").filter({ hasText: "Sparkcatch Apprentice" })
  ).toHaveCount(0);
  await sparkcatchPoolRow.getByRole("button", { name: "Select Board Cell" }).click();
  await clickPixiCell(page, rendererHost, 4, 2, { x: 0, y: -47 });
  await expect(defaultPlacementHint).toContainText(
    "Cannot place Sparkcatch Apprentice at r0 c2 ground:"
  );
  await expect(defaultPlacementHint).toContainText("occupied tile");
  await expect(
    defaultEditControls.getByTestId("default-pixi-board-edit-status")
  ).toHaveText("Choose a highlighted cell or cancel placement.");
  await defaultEditControls.getByRole("button", { name: "Cancel Placement" }).click();
  await expect(
    defaultEditControls.getByTestId("default-pixi-board-edit-mode")
  ).toHaveText("Inspect");
  await sparkcatchPoolRow.getByRole("button", { name: "Select Board Cell" }).click();
  await clickPixiCell(page, rendererHost, 4, 0);
  await expect(defaultPlacementHint).toHaveText(
    "Select a board-placeable Pool card below, then click a highlighted Pixi cell."
  );
  await expect(
    boardPanel.getByRole("listitem").filter({ hasText: "Sparkcatch Apprentice" }).first()
  ).toBeVisible();
  await expect(
    defaultZoneEditControls.getByTestId("default-pixi-zone-edit-selected-zone")
  ).toHaveText("Board");
  await expect(rendererHost.locator("canvas")).toHaveCount(1);

  expectNoBrowserErrors(errors);
});

test("default Pixi board return-to-pool works after placement", async ({ page }) => {
  const { battlefield, errors, rendererHost } = await gotoDefaultPlaytestRoute(page);
  await openAdvancedDebugPanels(page);

  const boardPanel = panel(page, "Board");
  const poolPanel = panel(page, "Pool Cards");
  const defaultZoneEditControls = battlefield.getByTestId(
    "default-pixi-zone-edit-controls"
  );

  const sparkcatchPoolRow = poolPanel
    .getByRole("listitem")
    .filter({ hasText: "Sparkcatch Apprentice" });
  await expect(rendererHost).toBeVisible();
  await expect(rendererHost.locator("canvas")).toHaveCount(1);
  await sparkcatchPoolRow.getByRole("button", { name: "Select Board Cell" }).click();
  await clickPixiCell(page, rendererHost, 4, 0);
  await expect(
    boardPanel.getByRole("listitem").filter({ hasText: "Sparkcatch Apprentice" }).first()
  ).toBeVisible();
  await expect(
    defaultZoneEditControls.getByTestId("default-pixi-zone-edit-selected-zone")
  ).toHaveText("Board");
  const returnToPool = defaultZoneEditControls.getByRole("button", {
    name: "Return to Pool"
  });
  await returnToPool.scrollIntoViewIfNeeded();
  await returnToPool.click();
  await expect(
    poolPanel.getByRole("listitem").filter({ hasText: "Sparkcatch Apprentice" }).first()
  ).toBeVisible();
  await expect(
    boardPanel.getByRole("listitem").filter({ hasText: "Sparkcatch Apprentice" })
  ).toHaveCount(0);
  await expect(
    defaultZoneEditControls.getByTestId("default-pixi-zone-edit-selected-zone")
  ).toHaveText("Pool");
  await expect(
    defaultZoneEditControls.getByTestId("default-pixi-zone-edit-status")
  ).toHaveText("Sparkcatch Apprentice has no legal Source Row or Spellrail move.");
  await expect(rendererHost.locator("canvas")).toHaveCount(1);

  expectNoBrowserErrors(errors);
});

test("default Commander controls support inspect deploy and return", async ({ page }) => {
  const { allyInspector, battlefield, errors, rendererHost } =
    await gotoDefaultPlaytestRoute(page);
  await openAdvancedDebugPanels(page);

  const commandZonePanel = panel(page, "Command Zone");
  const defaultCommanderControls = battlefield.getByTestId(
    "default-pixi-commander-edit-controls"
  );

  await expect(rendererHost.locator("canvas")).toHaveCount(1);
  await expect(commandZonePanel).toBeVisible();
  await expect(commandZonePanel.getByTestId("command-zone-card-name")).toHaveText(
    "Sparkcatch Apprentice"
  );
  await expect(commandZonePanel.getByTestId("command-zone-location")).toHaveText(
    "command"
  );
  await expect(commandZonePanel.getByTestId("commander-rebind-tax")).toHaveText(
    "+0 Charge"
  );
  await expect(commandZonePanel.getByTestId("commander-deploy-cost")).toHaveText(
    "1 base + 0 tax = 1 Charge"
  );
  await expect(
    commandZonePanel.getByTestId("commander-board-charge-after-deploy")
  ).toHaveText("3 / 3");
  await expect(
    commandZonePanel.getByRole("button", { name: "Deploy Commander" })
  ).toBeEnabled();

  const commanderHistory = commandZonePanel.getByTestId("commander-lifecycle-panel");
  await expect(commanderHistory).toBeVisible();
  expect(
    await commanderHistory.evaluate((node) => (node as HTMLDetailsElement).open)
  ).toBe(false);
  await commanderHistory.getByText("Commander History").click();
  await expect(
    commandZonePanel.getByTestId("commander-lifecycle-entry").first()
  ).toContainText("Commander initialized in Command Zone.");
  await expect(
    commandZonePanel.getByTestId("commander-lifecycle-entry").first()
  ).toContainText("Round 1 | Starter | Phase planning | to command");

  await expect(defaultCommanderControls).toBeVisible();
  await expect(
    defaultCommanderControls.getByTestId("default-pixi-commander-edit-mode")
  ).toHaveText("Commander");
  await expect(
    defaultCommanderControls.getByTestId("default-pixi-commander-edit-selected")
  ).toHaveText("Sparkcatch Apprentice");
  await expect(
    defaultCommanderControls.getByTestId("default-pixi-commander-edit-zone")
  ).toHaveText("Command Zone");
  await expect(
    defaultCommanderControls.getByTestId("default-pixi-commander-edit-status")
  ).toHaveText("Commander is ready to deploy.");
  await defaultCommanderControls
    .getByRole("button", { name: "Inspect Commander" })
    .click();
  await expect(
    allyInspector.getByRole("heading", { name: "Sparkcatch Apprentice" })
  ).toBeVisible();
  await defaultCommanderControls
    .getByRole("button", { name: "Deploy Commander" })
    .click();
  await expect(commandZonePanel.getByTestId("command-zone-location")).toHaveText("board");
  await expect(
    defaultCommanderControls.getByTestId("default-pixi-commander-edit-zone")
  ).toHaveText("Board");
  await expect(
    defaultCommanderControls.getByTestId("default-pixi-commander-edit-status")
  ).toHaveText("Commander is deployed and can return to Command.");
  await defaultCommanderControls
    .getByRole("button", { name: "Return to Command" })
    .click();
  await expect(commandZonePanel.getByTestId("command-zone-location")).toHaveText(
    "command"
  );
  await expect(commandZonePanel.getByTestId("commander-rebind-tax")).toHaveText(
    "+1 Charge"
  );
  await expect(
    defaultCommanderControls.getByTestId("default-pixi-commander-edit-zone")
  ).toHaveText("Command Zone");
  await expect(
    defaultCommanderControls.getByTestId("default-pixi-commander-edit-status")
  ).toContainText("Deploy blocked:");

  expectNoBrowserErrors(errors);
});

test("default combat smoke records combat and exposes playback summary", async ({
  page
}) => {
  const { errors, rendererHost } = await gotoDefaultPlaytestRoute(page);

  await recordDefaultCombat(page, { verifyPreview: true });
  await expectDefaultCombatPlayback(page, rendererHost);
  await expectLastRecordedCombatSummary(page);

  expectNoBrowserErrors(errors);
});

test("default rewards gate Pack Offers before advance", async ({ page }) => {
  const { errors } = await gotoDefaultPlaytestRoute(page);

  await recordDefaultCombat(page);
  await claimCombatTrainingUpgrade(page);
  await openAndCommitFirstPackOffer(page);
  await expect(page.getByRole("button", { name: "Advance" })).toBeEnabled();

  expectNoBrowserErrors(errors);
});

test("default post-pack suggestions apply after reward advance", async ({ page }) => {
  const { errors } = await gotoDefaultPlaytestRoute(page);

  await recordDefaultCombat(page);
  await claimCombatTrainingUpgrade(page);
  const postPackSuggestions = await openAndCommitFirstPackOffer(page);
  await advanceToNextPlanningAfterRewards(page);
  await expect(
    postPackSuggestions.getByTestId("post-pack-suggestion").first()
  ).toBeVisible();
  await applyFirstPostPackSuggestion(page, postPackSuggestions);

  expectNoBrowserErrors(errors);
});
