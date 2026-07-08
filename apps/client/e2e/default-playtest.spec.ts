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
  const actionRail = page.getByTestId("default-action-rail");

  await expect(actionRail.getByTestId("default-playtest-upgrade-copy")).toContainText(
    "Cinder Scout"
  );
  await actionRail.getByTestId("default-playtest-upgrade-button").click();
  await expect(actionRail.getByText("No duplicate upgrade is ready.")).toBeVisible();

  await page.getByRole("button", { name: "Ready Combat" }).click();

  const previewPanel = page.getByTestId("default-action-combat-preview");
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
  await expect(actionRail.getByTestId("default-action-recap")).toContainText(/Winner:/);
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
  const recordedPanel = page.getByTestId("default-action-recap");
  await expect(
    recordedPanel.getByRole("heading", { name: "Last Recorded Combat" })
  ).toBeVisible();
  await expect(recordedPanel.getByText(/Winner:/)).toBeVisible();
  await expect(recordedPanel.locator("p.muted")).toContainText("Damage:");
  await expect(recordedPanel.locator("details.combat-feed-details summary")).toHaveText(
    "Key Moments"
  );
  await expect(recordedPanel.getByText(/Events:/)).toBeVisible();
  await expect(recordedPanel.getByText(/Gold: \+/)).toBeVisible();
  const combatFeed = recordedPanel.locator("details.combat-feed-details");
  await expect(combatFeed).toBeVisible();
  expect(await combatFeed.evaluate((node) => (node as HTMLDetailsElement).open)).toBe(
    false
  );
  await combatFeed.locator("summary").click();
  await expect(combatFeed.getByText("Damage to you", { exact: true })).toBeVisible();
  await expect(combatFeed.getByText("Damage to enemy", { exact: true })).toBeVisible();
  await expect(combatFeed.getByText("Warnings", { exact: true })).toBeVisible();
};

const unlockFirstCommanderDoctrine = async (page: Page) => {
  const actionRail = page.getByTestId("default-action-rail");
  await expect(actionRail.getByTestId("default-action-rail-progress")).toHaveText(
    "Step 3 of 3"
  );
  const commanderDoctrinePanel = actionRail.getByTestId("commander-doctrine-panel");
  await expect(
    commanderDoctrinePanel.getByText(
      "Spend one doctrine point to unlock a Commander doctrine for this reward."
    )
  ).toBeVisible();
  await expect(
    commanderDoctrinePanel.getByText("Ash Ledger", { exact: true })
  ).toBeVisible();
  await expect(
    commanderDoctrinePanel.getByText("Edge Mason", { exact: true })
  ).toBeVisible();
  await expect(
    commanderDoctrinePanel.getByText("Queued Trigger", { exact: true })
  ).toBeVisible();
  await expect(
    commanderDoctrinePanel.getByTestId("commander-doctrine-points")
  ).toHaveText("1");
  await commanderDoctrinePanel.getByRole("button", { name: "Unlock Ash Ledger" }).click();
  await expect(actionRail.getByTestId("default-action-rail-progress")).toHaveText(
    "Ready"
  );
  await expect(actionRail.getByRole("heading", { name: "Advance" })).toBeVisible();
};

const openAndCommitFirstPackOffer = async (page: Page) => {
  const actionRail = page.getByTestId("default-action-rail");
  const packMarketPanel = actionRail.getByTestId("default-action-pack-market");
  await expect(actionRail.getByTestId("default-action-rail-progress")).toHaveText(
    "Step 1 of 3"
  );
  await expect(packMarketPanel.getByText(/Cost \d+ gold/).first()).toBeVisible();
  await expect(
    packMarketPanel.getByText(/After purchase: \d+ gold/).first()
  ).toBeVisible();
  await expect(
    packMarketPanel.getByRole("button", { name: "Open Pack Offer" }).first()
  ).toBeVisible();
  await packMarketPanel.getByRole("button", { name: "Open Pack Offer" }).first().click();
  await expect(actionRail.getByTestId("default-action-rail-progress")).toHaveText(
    "Step 2 of 3"
  );

  await expect(page.getByTestId("post-pack-suggestions-panel")).toHaveCount(0);
  const packOffer = actionRail.getByTestId("pack-offer-panel");
  await expect(packOffer.getByRole("heading", { name: "Pack Offer" })).toBeVisible();
  await expect(packOffer).toContainText(/pick 2 of 5/i);
  await expect(packOffer.getByTestId("pack-offer-card")).toHaveCount(5);
  await expect(packOffer.getByText(/Cost:/).first()).toBeVisible();
  await expect(packOffer.getByTestId("pack-offer-fit")).toHaveCount(5);
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
  await expect(actionRail.getByTestId("default-action-rail-progress")).toHaveText(
    "Step 3 of 3"
  );
  await expect(page.getByTestId("post-pack-suggestions-panel")).toHaveCount(0);
};

const expectPostPackSuggestions = async (page: Page): Promise<Locator> => {
  const postPackSuggestions = page.getByTestId("post-pack-suggestions-panel");
  await expect(postPackSuggestions).toBeVisible();
  await expect(
    postPackSuggestions.getByRole("heading", { name: "Suggested next edits" })
  ).toBeVisible();
  await expect(postPackSuggestions.getByText(/Latest pack:/)).toBeVisible();
  await expect(
    postPackSuggestions.getByTestId("post-pack-suggestion").first()
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

const waitForAnimationFrames = async (page: Page, frameCount = 2) => {
  for (let index = 0; index < frameCount; index += 1) {
    await page.evaluate(
      () => new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
    );
  }
};

const expectPixiCanvasWithinHost = async (rendererHost: Locator) => {
  await expect(rendererHost).toBeVisible();
  await expect(rendererHost.locator("canvas")).toHaveCount(1);
  const bounds = await rendererHost.evaluate((host) => {
    const canvas = host.querySelector("canvas");
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error("Missing Pixi canvas.");
    }

    const hostBox = host.getBoundingClientRect();
    const canvasBox = canvas.getBoundingClientRect();
    return {
      canvasHeight: canvasBox.height,
      canvasInsideHost:
        canvasBox.top >= hostBox.top - 1 &&
        canvasBox.left >= hostBox.left - 1 &&
        canvasBox.right <= hostBox.right + 1 &&
        canvasBox.bottom <= hostBox.bottom + 1,
      canvasWidth: canvasBox.width,
      hostHeight: hostBox.height,
      hostWidth: hostBox.width
    };
  });

  expect(bounds.hostWidth).toBeGreaterThan(0);
  expect(bounds.hostHeight).toBeGreaterThan(0);
  expect(bounds.canvasWidth).toBeGreaterThan(0);
  expect(bounds.canvasHeight).toBeGreaterThan(0);
  expect(bounds.canvasInsideHost).toBe(true);
  return bounds;
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
  const cockpitLayout = await dashboard.evaluate((element) => {
    const leftRail = element.querySelector(".default-playtest-dashboard-left");
    const centerRail = element.querySelector(".default-playtest-dashboard-center");
    const rightRail = element.querySelector(".default-playtest-dashboard-right");
    const boardArea = element.querySelector('[data-testid="default-pixi-board-area"]');
    const fitStage = element.querySelector('[data-testid="default-pixi-fit-stage"]');
    const rendererHost = element.querySelector('[data-testid="pixi-renderer-host"]');
    const loadoutTray = element.querySelector('[data-testid="default-loadout-tray"]');
    const loadoutZoneHeadings = [
      ...element.querySelectorAll(".default-loadout-tray-zone h3")
    ];
    if (!(leftRail instanceof HTMLElement)) {
      throw new Error("Missing default left rail.");
    }
    if (!(centerRail instanceof HTMLElement)) {
      throw new Error("Missing default center rail.");
    }
    if (!(rightRail instanceof HTMLElement)) {
      throw new Error("Missing default right rail.");
    }
    if (!(boardArea instanceof HTMLElement)) {
      throw new Error("Missing default Pixi board area.");
    }
    if (!(fitStage instanceof HTMLElement)) {
      throw new Error("Missing default Pixi fit stage.");
    }
    if (!(rendererHost instanceof HTMLElement)) {
      throw new Error("Missing Pixi renderer host.");
    }
    if (!(loadoutTray instanceof HTMLElement)) {
      throw new Error("Missing default loadout tray.");
    }

    const centerBox = centerRail.getBoundingClientRect();
    const boardAreaBox = boardArea.getBoundingClientRect();
    const fitStageBox = fitStage.getBoundingClientRect();
    const rendererBox = rendererHost.getBoundingClientRect();
    const loadoutTrayBox = loadoutTray.getBoundingClientRect();
    const headingBoxes = loadoutZoneHeadings.map((heading) =>
      heading.getBoundingClientRect()
    );

    return {
      centerOverflowY: getComputedStyle(centerRail).overflowY,
      dashboardHeight: Math.round(element.getBoundingClientRect().height),
      dashboardOverflowY: getComputedStyle(element).overflowY,
      fitStageInsideBoardArea:
        fitStageBox.top >= boardAreaBox.top - 1 &&
        fitStageBox.left >= boardAreaBox.left - 1 &&
        fitStageBox.right <= boardAreaBox.right + 1 &&
        fitStageBox.bottom <= boardAreaBox.bottom + 1,
      fitStageNonzero: fitStageBox.width > 0 && fitStageBox.height > 0,
      loadoutHeadingsInsideTray: headingBoxes.every(
        (box) =>
          box.top >= loadoutTrayBox.top - 1 && box.bottom <= loadoutTrayBox.bottom + 1
      ),
      loadoutTrayFits: loadoutTray.scrollHeight <= loadoutTray.clientHeight + 1,
      leftOverflowY: getComputedStyle(leftRail).overflowY,
      rendererInsideCenter:
        rendererBox.top >= centerBox.top - 1 &&
        rendererBox.bottom <= centerBox.bottom + 1,
      rendererInsideFitStage:
        rendererBox.top >= fitStageBox.top - 1 &&
        rendererBox.left >= fitStageBox.left - 1 &&
        rendererBox.right <= fitStageBox.right + 1 &&
        rendererBox.bottom <= fitStageBox.bottom + 1,
      rendererNonzero: rendererBox.width > 0 && rendererBox.height > 0,
      rendererShapeRatio: Number((rendererBox.width / rendererBox.height).toFixed(2)),
      rightOverflowY: getComputedStyle(rightRail).overflowY,
      rightRailFits: rightRail.scrollHeight <= rightRail.clientHeight + 1,
      sidecarOverflowY: getComputedStyle(
        document.querySelector('[data-testid="default-pixi-sidecar"]')!
      ).overflowY,
      sidecarFits:
        document.querySelector('[data-testid="default-pixi-sidecar"]')!.scrollHeight <=
        document.querySelector('[data-testid="default-pixi-sidecar"]')!.clientHeight + 1,
      viewportHeight: window.innerHeight
    };
  });
  expect(cockpitLayout.dashboardOverflowY).toBe("visible");
  expect(cockpitLayout.leftOverflowY).toBe("hidden");
  expect(cockpitLayout.centerOverflowY).toBe("visible");
  expect(cockpitLayout.rightOverflowY).toBe("hidden");
  expect(cockpitLayout.sidecarOverflowY).toBe("hidden");
  expect(cockpitLayout.dashboardHeight).toBeGreaterThanOrEqual(
    Math.min(560, cockpitLayout.viewportHeight - 160)
  );
  expect(cockpitLayout.fitStageInsideBoardArea).toBe(true);
  expect(cockpitLayout.fitStageNonzero).toBe(true);
  expect(cockpitLayout.loadoutHeadingsInsideTray).toBe(true);
  expect(cockpitLayout.loadoutTrayFits).toBe(true);
  expect(cockpitLayout.rendererInsideCenter).toBe(true);
  expect(cockpitLayout.rendererInsideFitStage).toBe(true);
  expect(cockpitLayout.rendererNonzero).toBe(true);
  expect(cockpitLayout.rendererShapeRatio).toBeGreaterThan(1.05);
  expect(cockpitLayout.rendererShapeRatio).toBeLessThan(1.09);
  expect(cockpitLayout.rightRailFits).toBe(true);
  expect(cockpitLayout.sidecarFits).toBe(true);
  await expect(page.locator(".app-shell").filter({ has: playtestRoute })).toBeVisible();
  await expect(battlefield).toHaveClass(/default-pixi-battlefield-section/);
  await expect(battlefield.getByTestId("default-pixi-cockpit")).toBeVisible();
  await expect(battlefield.getByTestId("default-pixi-sidecar")).toBeVisible();
  await expectNoHorizontalScroll(playtestRoute);
  await expect(
    page.getByRole("heading", { name: "Action Rail", exact: true })
  ).toBeVisible();
  await expect(decisionPanel.getByTestId("default-action-rail-message")).toBeVisible();
  await expect(decisionPanel.getByTestId("default-action-rail-progress")).toHaveText(
    "Planning"
  );
  await expect(decisionPanel.getByTestId("default-playtest-upgrade-copy")).toContainText(
    "Cinder Scout"
  );
  await expect(page.getByTestId("post-pack-suggestions-panel")).toHaveCount(0);
  await expect(page.getByTestId("default-combat-preview-status")).toHaveCount(0);
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
  await expect(page.getByTestId("advanced-debug-panels")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "What now?", exact: true })
  ).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Battlefield", exact: true })
  ).toBeVisible();
  const layersPanel = battlefield.getByTestId("battlefield-layers-panel");
  await expect(layersPanel).toBeVisible();
  await expect(
    layersPanel.getByRole("heading", { name: "Battlefield Layers" })
  ).toBeVisible();
  await expect(layersPanel).toContainText("Ashes");
  await expect(layersPanel).toContainText("No Ashes yet.");
  await expect(layersPanel).toContainText("Walls / Edges");
  await expect(layersPanel).toContainText("No walls or edge terrain yet.");
  await expect(
    allyInspector.getByRole("heading", { name: "Ally Selected" })
  ).toBeVisible();
  await expect(
    enemyInspector.getByRole("heading", { name: "Enemy Selected" })
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
  await expect(battlefield.getByTestId("default-pixi-board-edit-controls")).toHaveCount(
    0
  );
  await expect(battlefield.getByTestId("default-pixi-zone-edit-controls")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Play Replay" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Step Replay" })).toHaveCount(0);
  await expect(page.getByText("Renderer Feed")).toHaveCount(0);
  await expect(battlefield.locator("details.renderer-debug-board")).toHaveCount(0);
  await expect(page.getByText("React/CSS Debug Board")).toHaveCount(0);
  await expect(page.getByText("Combat Model Notes")).toHaveCount(0);
  await expect(page.getByTestId("hex-arena")).toHaveCount(0);
  await expect(
    allyInspector.getByRole("heading", { name: "Ember Scraprunner" })
  ).toBeVisible();
  await expect(
    allyInspector.getByTestId("default-pixi-selected-card-context")
  ).toHaveText("Your side");
  await expect(allyInspector.getByTestId("compact-inspector-rules")).toContainText(
    "Quickstart. When destroyed, sparks the nearest enemy."
  );
  await expect(
    enemyInspector.getByTestId("default-pixi-selected-card-meta")
  ).toContainText("| encounter |");
  await expect(
    enemyInspector.getByTestId("default-pixi-selected-card-context")
  ).toHaveText("Enemy side");
  await expect(enemyInspector.getByTestId("compact-inspector-rules")).toContainText(
    "Quickstart. When destroyed, sparks the nearest enemy."
  );
  await expect(
    allyInspector.getByTestId("default-pixi-selected-card-details")
  ).toBeVisible();
  const engagementPreview = battlefield.locator(
    ".default-pixi-sidecar [data-testid='engagement-preview']"
  );
  await expect(
    engagementPreview.getByRole("heading", { name: "Engagement Preview" })
  ).toBeVisible();
  await expect(engagementPreview.getByText("Ember Scraprunner").first()).toBeVisible();
  await expect(
    engagementPreview.getByText("Your Ember Scraprunner cannot attack yet.")
  ).toBeVisible();
  await expect(engagementPreview).toContainText("Target is 2 hexes away, range 1.");
  await expect(engagementPreview).toContainText("Next move: r4 c2 to r4 c3.");
  await expect(
    engagementPreview.getByText("Out of range", { exact: true })
  ).toBeVisible();
  await expectNoHorizontalScroll(rendererHost);

  expectNoBrowserErrors(errors);
});

test("default Pixi board refits after viewport resize", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { battlefield, errors, rendererHost } = await gotoDefaultPlaytestRoute(page);

  const initialBounds = await expectPixiCanvasWithinHost(rendererHost);
  expect(initialBounds.hostWidth + initialBounds.hostHeight).toBeGreaterThan(0);

  await page.setViewportSize({ width: 1280, height: 720 });
  await waitForAnimationFrames(page, 3);
  const resizedBounds = await expectPixiCanvasWithinHost(rendererHost);
  expect(resizedBounds.hostWidth + resizedBounds.hostHeight).toBeGreaterThan(0);

  const loadoutTray = page.getByTestId("default-loadout-tray");
  const poolTray = loadoutTray.getByTestId("default-loadout-tray-pool");
  const boardTray = loadoutTray.getByTestId("default-loadout-tray-board");
  const defaultPlacementHint = battlefield.getByTestId("default-pixi-placement-hint");
  const sparkcatchPoolRow = poolTray
    .getByRole("listitem")
    .filter({ hasText: "Sparkcatch Apprentice" });

  await sparkcatchPoolRow.scrollIntoViewIfNeeded();
  await sparkcatchPoolRow.getByRole("button", { name: "Place on Board" }).click();
  await expect(defaultPlacementHint).toHaveText(
    "Placing Sparkcatch Apprentice. Click a highlighted Pixi cell."
  );
  await clickPixiCell(page, rendererHost, 4, 0);
  await expect(boardTray).toContainText("+1 more card");
  await expect(rendererHost.locator("canvas")).toHaveCount(1);

  expectNoBrowserErrors(errors);
});

test("default debug query exposes diagnostic panels without replacing Pixi", async ({
  page
}) => {
  const { battlefield, errors, rendererHost } = await gotoDefaultPlaytestRoute(page, {
    debug: true
  });

  const advancedDebug = page.getByTestId("advanced-debug-panels");
  await expect(advancedDebug).toBeVisible();
  expect(await advancedDebug.evaluate((node) => (node as HTMLDetailsElement).open)).toBe(
    false
  );
  await expect(advancedDebug.getByText("Advanced Debug Panels")).toBeVisible();

  const debugFallback = battlefield.locator("details.renderer-debug-board");
  await expect(debugFallback).toBeVisible();
  await expect(debugFallback.getByText("React/CSS Debug Board")).toBeVisible();
  expect(await debugFallback.evaluate((node) => (node as HTMLDetailsElement).open)).toBe(
    false
  );
  await expect(battlefield.getByText("Combat Model Notes")).toBeVisible();
  await expect(rendererHost).toBeVisible();
  await expect(rendererHost.locator("canvas")).toHaveCount(1);
  await expect(battlefield.getByTestId("default-pixi-board-edit-controls")).toBeVisible();
  await expect(battlefield.getByTestId("default-pixi-zone-edit-controls")).toBeVisible();
  await expect(battlefield.getByTestId("default-pixi-board-edit-mode")).toHaveText(
    "Inspect"
  );
  await expect(battlefield.getByTestId("default-pixi-zone-edit-mode")).toHaveText(
    "Loadout"
  );

  await openAdvancedDebugPanels(page);
  await expect(panel(page, "What now?")).toBeVisible();
  await expect(panel(page, "Pool Cards")).toBeVisible();
  await expect(panel(page, "Source Row")).toBeVisible();
  await expect(panel(page, "Spellrail")).toBeVisible();

  expectNoBrowserErrors(errors);
});

test("default compact inspector can reveal full card details", async ({ page }) => {
  const { allyInspector, enemyInspector, errors, rendererHost } =
    await gotoDefaultPlaytestRoute(page);

  await clickPixiCell(page, rendererHost, 4, 2);
  await expect(
    allyInspector.getByRole("heading", { name: "Ember Scraprunner" })
  ).toBeVisible();
  await expect(
    allyInspector.getByTestId("default-pixi-selected-card-meta")
  ).toContainText("Unit | board | Ember");
  await expect(allyInspector.getByTestId("compact-inspector-rules")).toContainText(
    "Quickstart. When destroyed, sparks the nearest enemy."
  );
  const allyCardDetails = allyInspector.getByTestId("default-pixi-selected-card-details");
  await expect(allyCardDetails).toBeVisible();
  expect(
    await allyCardDetails.evaluate((node) => (node as HTMLDetailsElement).open)
  ).toBe(false);
  await expect(
    allyCardDetails.getByTestId("default-pixi-selected-card-details-summary")
  ).toHaveText("Details");
  await allyCardDetails.getByTestId("default-pixi-selected-card-details-summary").click();
  await expect(allyCardDetails).toContainText("Cost");
  await expect(allyCardDetails).toContainText("Charge");

  await clickPixiCell(page, rendererHost, 3, 3);
  await expect(
    enemyInspector.getByRole("heading", { name: "Ember Scraprunner" })
  ).toBeVisible();
  await expect(
    enemyInspector.getByTestId("default-pixi-selected-card-meta")
  ).toContainText("Unit | encounter | Ember");
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

  await expect(page.getByTestId("advanced-debug-panels")).toHaveCount(0);

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
  await resourceBasics.locator("summary").click();
  await expect(poolTray).toContainText("Cards waiting to be assigned");
  const poolToggle = poolTray.getByTestId("default-loadout-tray-pool-toggle");
  await expect(poolToggle).toHaveText(/Show \+\d+ more cards?/);
  await expect(poolToggle).toHaveAttribute("aria-expanded", "false");
  await expect(poolTray.getByText("Cinder Scout", { exact: true })).toHaveCount(0);
  await poolToggle.click();
  await expect(poolToggle).toHaveText("Show less");
  await expect(poolToggle).toHaveAttribute("aria-expanded", "true");
  const cinderScoutPoolRows = poolTray
    .getByRole("listitem")
    .filter({ hasText: "Cinder Scout" });
  await expect(cinderScoutPoolRows).toHaveCount(3);
  await expect(cinderScoutPoolRows.getByRole("button", { name: "Inspect" })).toHaveCount(
    3
  );
  await poolToggle.click();
  await expect(poolToggle).toHaveText(/Show \+\d+ more cards?/);
  await expect(poolTray.getByText("Cinder Scout", { exact: true })).toHaveCount(0);
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
  await sparkcatchPoolRow.scrollIntoViewIfNeeded();
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
  await expect(boardTray).toContainText("+1 more card");
  const boardToggle = boardTray.getByTestId("default-loadout-tray-board-toggle");
  await expect(boardToggle).toHaveText("Show +1 more card");
  await boardToggle.click();
  await expect(boardToggle).toHaveText("Show less");
  const sparkcatchBoardRow = boardTray
    .getByRole("listitem")
    .filter({ hasText: "Sparkcatch Apprentice" });
  await expect(sparkcatchBoardRow).toBeVisible();
  await expect(
    sparkcatchBoardRow.getByRole("button", { name: "Return to Pool" })
  ).toBeVisible();
  await boardToggle.click();
  await expect(boardToggle).toHaveText("Show +1 more card");

  const emberSourceTrayRow = sourcesTray
    .getByRole("listitem")
    .filter({ hasText: "Ember Source" });
  await emberSourceTrayRow.getByRole("button", { name: "Return to Pool" }).click();
  await expect(sourcesTray.getByText("No Source Row cards.")).toBeVisible();

  await expect(rendererHost.locator("canvas")).toHaveCount(1);

  expectNoBrowserErrors(errors);
});

test("default Pixi zone controls support Source and Spellrail round trips", async ({
  page
}) => {
  const { battlefield, errors, rendererHost } = await gotoDefaultPlaytestRoute(page, {
    debug: true
  });
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
  const { battlefield, errors, rendererHost } = await gotoDefaultPlaytestRoute(page, {
    debug: true
  });
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
    .filter({ hasText: "Sparkcatch Apprentice" })
    .first();
  await expect(rendererHost).toBeVisible();
  await expect(rendererHost.locator("canvas")).toHaveCount(1);
  await sparkcatchPoolRow.getByRole("button", { name: "Place on Board" }).click();
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
  await sparkcatchPoolRow.getByRole("button", { name: "Place on Board" }).click();
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
  await sparkcatchPoolRow.getByRole("button", { name: "Place on Board" }).click();
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
  const { battlefield, errors, rendererHost } = await gotoDefaultPlaytestRoute(page, {
    debug: true
  });
  await openAdvancedDebugPanels(page);

  const boardPanel = panel(page, "Board");
  const poolPanel = panel(page, "Pool Cards");
  const defaultZoneEditControls = battlefield.getByTestId(
    "default-pixi-zone-edit-controls"
  );

  const sparkcatchPoolRow = poolPanel
    .getByRole("listitem")
    .filter({ hasText: "Sparkcatch Apprentice" })
    .first();
  await expect(rendererHost).toBeVisible();
  await expect(rendererHost.locator("canvas")).toHaveCount(1);
  await sparkcatchPoolRow.getByRole("button", { name: "Place on Board" }).click();
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
    await gotoDefaultPlaytestRoute(page, { debug: true });
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
  await expect(commandZonePanel.getByTestId("command-zone-location")).toHaveText(
    "command"
  );
  await expect(
    defaultCommanderControls.getByTestId("default-pixi-commander-edit-status")
  ).toHaveText("Placing Sparkcatch Apprentice. Click a highlighted Pixi hex.");
  await expect(
    defaultCommanderControls.getByRole("button", {
      name: "Cancel Commander Placement"
    })
  ).toBeVisible();
  await expect(battlefield.getByTestId("default-pixi-placement-hint")).toHaveText(
    "Placing Sparkcatch Apprentice. Click a highlighted Pixi hex."
  );
  await clickPixiCell(page, rendererHost, 4, 0);
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
  await openAndCommitFirstPackOffer(page);
  await unlockFirstCommanderDoctrine(page);
  await expect(page.getByRole("button", { name: "Advance" })).toBeEnabled();

  expectNoBrowserErrors(errors);
});

test("default post-pack suggestions apply after reward advance", async ({ page }) => {
  const { errors } = await gotoDefaultPlaytestRoute(page, { debug: true });

  await recordDefaultCombat(page);
  await openAndCommitFirstPackOffer(page);
  await unlockFirstCommanderDoctrine(page);
  await advanceToNextPlanningAfterRewards(page);
  const postPackSuggestions = await expectPostPackSuggestions(page);
  await expect(
    postPackSuggestions.getByTestId("post-pack-suggestion").first()
  ).toBeVisible();
  await applyFirstPostPackSuggestion(page, postPackSuggestions);

  expectNoBrowserErrors(errors);
});
