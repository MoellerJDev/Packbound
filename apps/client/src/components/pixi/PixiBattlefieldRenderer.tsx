import { useEffect, useRef } from "react";
import { Application, Container, Graphics, Text } from "pixi.js";

import type { CombatEvent } from "@packbound/shared";

import {
  combatEventsToPixiReplayCommands,
  type PixiReplayCommand
} from "./pixiCombatReplay";
import {
  hexCenterForSharedCell,
  hexPolygonPoints,
  PIXI_BATTLEFIELD_LAYOUT,
  sharedCellForBoardPosition,
  type PixiPoint
} from "./pixiBattlefieldLayout";
import type { PixiBattlefieldCard, PixiBattlefieldModel } from "./pixiBattlefieldModel";
import { PIXI_BATTLEFIELD_THEME, sideTheme } from "./pixiTheme";

type PixiBattlefieldRendererProps = {
  readonly model: PixiBattlefieldModel;
  readonly combatEvents: readonly CombatEvent[];
  readonly replayRequestKey: number;
  readonly playReplay: boolean;
};

type TokenView = {
  readonly card: PixiBattlefieldCard;
  readonly container: Container;
  readonly baseScale: number;
};

const layerOffset = (layer: PixiBattlefieldCard["layer"]): PixiPoint => {
  switch (layer) {
    case "support":
      return { x: 19, y: -15 };
    case "air":
      return { x: -18, y: -18 };
    case "terrain":
      return { x: 0, y: 19 };
    case "ground":
      return { x: 0, y: 0 };
  }
};

const addText = (
  parent: Container,
  text: string,
  x: number,
  y: number,
  options: {
    readonly fill?: number;
    readonly fontSize?: number;
    readonly fontWeight?: "400" | "500" | "600" | "700" | "800" | "900";
    readonly alpha?: number;
    readonly wordWrapWidth?: number;
  } = {}
): Text => {
  const style = {
    align: "center" as const,
    fill: options.fill ?? PIXI_BATTLEFIELD_THEME.text,
    fontFamily: "Inter, Segoe UI, Arial, sans-serif",
    fontSize: options.fontSize ?? 12,
    fontWeight: options.fontWeight ?? "700",
    letterSpacing: 0,
    wordWrap: options.wordWrapWidth !== undefined,
    ...(options.wordWrapWidth !== undefined
      ? { wordWrapWidth: options.wordWrapWidth }
      : {})
  };
  const label = new Text({
    text,
    style
  });
  label.anchor.set(0.5);
  label.alpha = options.alpha ?? 1;
  label.position.set(x, y);
  parent.addChild(label);
  return label;
};

const drawBackground = (root: Container): void => {
  root.addChild(
    new Graphics()
      .roundRect(0, 0, PIXI_BATTLEFIELD_LAYOUT.width, PIXI_BATTLEFIELD_LAYOUT.height, 22)
      .fill({ color: PIXI_BATTLEFIELD_THEME.backgroundPanel, alpha: 1 })
  );
  root.addChild(
    new Graphics()
      .roundRect(12, 12, PIXI_BATTLEFIELD_LAYOUT.width - 24, 222, 18)
      .fill({ color: PIXI_BATTLEFIELD_THEME.enemy.fill, alpha: 0.22 })
  );
  root.addChild(
    new Graphics()
      .roundRect(12, 294, PIXI_BATTLEFIELD_LAYOUT.width - 24, 222, 18)
      .fill({ color: PIXI_BATTLEFIELD_THEME.player.fill, alpha: 0.22 })
  );
  root.addChild(
    new Graphics()
      .rect(32, 252, PIXI_BATTLEFIELD_LAYOUT.width - 64, 24)
      .fill({ color: PIXI_BATTLEFIELD_THEME.laneDim, alpha: 0.32 })
      .stroke({ color: PIXI_BATTLEFIELD_THEME.lane, alpha: 0.72, width: 2 })
  );
  addText(root, "ENEMY FIELD", 92, 32, {
    fill: PIXI_BATTLEFIELD_THEME.enemy.accent,
    fontSize: 11,
    fontWeight: "900",
    alpha: 0.86
  });
  addText(root, "ENGAGEMENT LINE", PIXI_BATTLEFIELD_LAYOUT.width / 2, 264, {
    fill: PIXI_BATTLEFIELD_THEME.lane,
    fontSize: 10,
    fontWeight: "900",
    alpha: 0.9
  });
  addText(root, "ALLY FIELD", 88, 496, {
    fill: PIXI_BATTLEFIELD_THEME.player.accent,
    fontSize: 11,
    fontWeight: "900",
    alpha: 0.86
  });
};

const drawCell = (
  root: Container,
  cell: PixiBattlefieldModel["cells"][number],
  pulseTargets: Graphics[]
): void => {
  if (cell.isLane) {
    return;
  }

  const center = hexCenterForSharedCell(cell.sharedCell);
  const side = cell.side ? sideTheme(cell.side) : undefined;
  const markers = cell.markers;
  const fill = markers.selected
    ? PIXI_BATTLEFIELD_THEME.selected
    : markers.targetOutOfRange || markers.likelyTarget
      ? PIXI_BATTLEFIELD_THEME.target
      : markers.nextMove
        ? PIXI_BATTLEFIELD_THEME.nextMove
        : markers.range
          ? PIXI_BATTLEFIELD_THEME.rangeFill
          : PIXI_BATTLEFIELD_THEME.hexFill;
  const fillAlpha =
    markers.selected || markers.likelyTarget ? 0.4 : markers.range ? 0.24 : 0.72;
  const stroke = markers.selected
    ? PIXI_BATTLEFIELD_THEME.selected
    : markers.targetInRange || markers.targetOutOfRange
      ? PIXI_BATTLEFIELD_THEME.target
      : markers.nextMove
        ? PIXI_BATTLEFIELD_THEME.nextMove
        : (side?.accent ?? PIXI_BATTLEFIELD_THEME.hexStroke);

  root.addChild(
    new Graphics()
      .poly([...hexPolygonPoints(center, PIXI_BATTLEFIELD_LAYOUT.hexRadius)])
      .fill({ color: fill, alpha: fillAlpha })
      .stroke({
        color:
          markers.range || markers.selected || markers.likelyTarget
            ? stroke
            : PIXI_BATTLEFIELD_THEME.hexStrokeDim,
        alpha: markers.range || markers.selected || markers.likelyTarget ? 0.92 : 0.72,
        width: markers.range || markers.selected || markers.likelyTarget ? 2.4 : 1.2
      })
  );

  if (markers.selected || markers.likelyTarget || markers.nextMove) {
    const ring = new Graphics()
      .poly([...hexPolygonPoints(center, PIXI_BATTLEFIELD_LAYOUT.hexRadius + 4)])
      .stroke({
        color: stroke,
        alpha: 0.58,
        width: markers.nextMove ? 2 : 3
      });
    root.addChild(ring);
    pulseTargets.push(ring);
  }
};

const drawMovePreview = (
  root: Container,
  model: PixiBattlefieldModel,
  pulseTargets: Graphics[]
): void => {
  if (!model.nextMove) {
    return;
  }

  const from = hexCenterForSharedCell(model.nextMove.from);
  const to = hexCenterForSharedCell(model.nextMove.to);
  const arrow = new Graphics()
    .moveTo(from.x, from.y)
    .lineTo(to.x, to.y)
    .stroke({ color: PIXI_BATTLEFIELD_THEME.nextMove, alpha: 0.78, width: 4 });
  root.addChild(arrow);
  root.addChild(
    new Graphics()
      .circle(to.x, to.y, 9)
      .fill({ color: PIXI_BATTLEFIELD_THEME.nextMove, alpha: 0.34 })
      .stroke({ color: PIXI_BATTLEFIELD_THEME.nextMove, alpha: 0.82, width: 2 })
  );
  pulseTargets.push(arrow);
};

const drawToken = (card: PixiBattlefieldCard): TokenView => {
  const theme = sideTheme(card.side);
  const container = new Container();
  const center = hexCenterForSharedCell(card.sharedCell);
  const offset = layerOffset(card.layer);
  const isSupport = card.layer === "support" || card.cardType === "Relic";
  container.position.set(center.x + offset.x, center.y + offset.y);
  container.zIndex = card.sharedCell.row * 10 + (isSupport ? 1 : 4);

  if (isSupport) {
    container.addChild(
      new Graphics()
        .roundRect(-24, -16, 48, 32, 7)
        .fill({ color: PIXI_BATTLEFIELD_THEME.support, alpha: 0.9 })
        .stroke({ color: theme.accent, alpha: 0.72, width: 2 })
    );
    addText(container, card.initials, 0, 0, {
      fill: 0x20160b,
      fontSize: 12,
      fontWeight: "900"
    });
    return { card, container, baseScale: 0.86 };
  }

  container.addChild(
    new Graphics()
      .circle(0, 0, 25)
      .fill({ color: theme.fill, alpha: 0.96 })
      .stroke({ color: theme.glow, alpha: 0.94, width: 3 })
  );
  container.addChild(
    new Graphics().circle(0, 0, 32).stroke({ color: theme.glow, alpha: 0.22, width: 7 })
  );
  addText(container, card.initials, 0, -3, {
    fill: theme.text,
    fontSize: 15,
    fontWeight: "900"
  });
  addText(container, card.name, 0, 34, {
    fill: PIXI_BATTLEFIELD_THEME.text,
    fontSize: 9,
    fontWeight: "800",
    wordWrapWidth: 84
  });

  const stats = card.statChips.filter((chip) => /ATK|HP|RNG/.test(chip)).slice(0, 3);
  stats.forEach((stat, index) => {
    const x = -30 + index * 30;
    container.addChild(
      new Graphics()
        .roundRect(x - 13, 17, 26, 13, 5)
        .fill({ color: 0x061014, alpha: 0.86 })
        .stroke({ color: theme.accent, alpha: 0.54, width: 1 })
    );
    addText(container, stat.replace(" ", ""), x, 23.5, {
      fill: theme.text,
      fontSize: 7,
      fontWeight: "900"
    });
  });

  return { card, container, baseScale: 1 };
};

const fitRoot = (app: Application, root: Container): void => {
  const scale = Math.min(
    app.screen.width / PIXI_BATTLEFIELD_LAYOUT.width,
    app.screen.height / PIXI_BATTLEFIELD_LAYOUT.height
  );
  root.scale.set(Math.max(0.1, scale));
  root.position.set(
    (app.screen.width - PIXI_BATTLEFIELD_LAYOUT.width * scale) / 2,
    (app.screen.height - PIXI_BATTLEFIELD_LAYOUT.height * scale) / 2
  );
};

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

const animate = (
  app: Application,
  durationMs: number,
  onFrame: (progress: number) => void
): Promise<void> =>
  new Promise((resolve) => {
    const start = performance.now();
    const tick = () => {
      const progress = Math.min(1, (performance.now() - start) / durationMs);
      onFrame(progress);
      if (progress >= 1) {
        app.ticker.remove(tick);
        resolve();
      }
    };
    app.ticker.add(tick);
  });

const lineBetweenTokens = (
  effectLayer: Container,
  source: TokenView,
  target: TokenView
): Graphics => {
  const line = new Graphics()
    .moveTo(source.container.x, source.container.y)
    .lineTo(target.container.x, target.container.y)
    .stroke({ color: 0xfff2aa, alpha: 0.92, width: 5 });
  effectLayer.addChild(line);
  return line;
};

const floatDamageText = (
  effectLayer: Container,
  token: TokenView,
  amount: number
): Text => {
  const text = addText(
    effectLayer,
    `-${amount}`,
    token.container.x,
    token.container.y - 26,
    {
      fill: PIXI_BATTLEFIELD_THEME.damage,
      fontSize: 21,
      fontWeight: "900"
    }
  );
  return text;
};

const markDestroyed = (token: TokenView): void => {
  token.container.alpha = 0.34;
  token.container.addChild(
    new Graphics()
      .circle(0, 0, 30)
      .fill({ color: PIXI_BATTLEFIELD_THEME.destroyed, alpha: 0.54 })
      .stroke({ color: 0xffe1d0, alpha: 0.82, width: 2 })
  );
  addText(token.container, "X", 0, 0, {
    fill: 0xffe1d0,
    fontSize: 18,
    fontWeight: "900"
  });
};

const playCommand = async (
  app: Application,
  command: PixiReplayCommand,
  tokensByCardId: Map<string, TokenView>,
  effectLayer: Container
): Promise<void> => {
  switch (command.type) {
    case "move": {
      const token = tokensByCardId.get(command.cardInstanceId);
      if (!token) {
        return;
      }
      const from = token.container.position.clone();
      const toCell = sharedCellForBoardPosition(command.side, command.to);
      const to = hexCenterForSharedCell(toCell);
      await animate(app, 320, (progress) => {
        token.container.position.set(
          from.x + (to.x - from.x) * progress,
          from.y + (to.y - from.y) * progress
        );
      });
      return;
    }
    case "attack": {
      const source = tokensByCardId.get(command.sourceCardInstanceId);
      const target = tokensByCardId.get(command.targetCardInstanceId);
      if (!source || !target) {
        return;
      }
      const line = lineBetweenTokens(effectLayer, source, target);
      await animate(app, 180, (progress) => {
        line.alpha = 1 - progress;
        target.container.scale.set(
          target.baseScale + Math.sin(progress * Math.PI) * 0.08
        );
      });
      target.container.scale.set(target.baseScale);
      line.destroy();
      return;
    }
    case "damage": {
      const target = tokensByCardId.get(command.targetCardInstanceId);
      if (!target) {
        return;
      }
      const text = floatDamageText(effectLayer, target, command.amount);
      const startY = text.y;
      await animate(app, 420, (progress) => {
        text.y = startY - progress * 28;
        text.alpha = 1 - progress;
      });
      text.destroy();
      return;
    }
    case "destroyed": {
      const token = tokensByCardId.get(command.cardInstanceId);
      if (!token) {
        return;
      }
      markDestroyed(token);
      await wait(120);
      return;
    }
    case "appear": {
      const token = tokensByCardId.get(command.cardInstanceId);
      if (!token) {
        return;
      }
      const sharedCell = sharedCellForBoardPosition(command.side, command.position);
      const to = hexCenterForSharedCell(sharedCell);
      token.container.position.set(to.x, to.y);
      token.container.alpha = 1;
      await animate(app, 220, (progress) => {
        token.container.scale.set(token.baseScale + Math.sin(progress * Math.PI) * 0.12);
      });
      token.container.scale.set(token.baseScale);
      return;
    }
    case "phaseOut": {
      const token = tokensByCardId.get(command.cardInstanceId);
      if (!token) {
        return;
      }
      await animate(app, 260, (progress) => {
        token.container.alpha = 1 - progress * 0.72;
      });
      return;
    }
  }
};

const playReplayCommands = async (
  app: Application,
  commands: readonly PixiReplayCommand[],
  tokensByCardId: Map<string, TokenView>,
  effectLayer: Container,
  isCancelled: () => boolean
): Promise<void> => {
  for (const command of commands.slice(0, 96)) {
    if (isCancelled()) {
      return;
    }
    await playCommand(app, command, tokensByCardId, effectLayer);
    await wait(35);
  }
};

export const PixiBattlefieldRenderer = ({
  model,
  combatEvents,
  replayRequestKey,
  playReplay
}: PixiBattlefieldRendererProps) => {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let app: Application | undefined;
    let initialized = false;

    const initialize = async () => {
      const host = hostRef.current;
      if (!host) {
        return;
      }

      host.replaceChildren();
      app = new Application();
      await app.init({
        antialias: true,
        autoDensity: true,
        backgroundAlpha: 0,
        resizeTo: host,
        resolution: window.devicePixelRatio || 1
      });
      initialized = true;

      if (cancelled) {
        app.destroy(true, { children: true });
        return;
      }

      host.appendChild(app.canvas);

      const root = new Container();
      const cellLayer = new Container();
      const tokenLayer = new Container();
      const effectLayer = new Container();
      const pulseTargets: Graphics[] = [];
      const tokensByCardId = new Map<string, TokenView>();
      root.sortableChildren = true;
      tokenLayer.sortableChildren = true;

      drawBackground(root);
      for (const cell of model.cells) {
        drawCell(cellLayer, cell, pulseTargets);
      }
      drawMovePreview(cellLayer, model, pulseTargets);
      for (const card of model.cards) {
        const token = drawToken(card);
        token.container.scale.set(token.baseScale);
        tokenLayer.addChild(token.container);
        tokensByCardId.set(card.cardInstanceId, token);
      }

      root.addChild(cellLayer, tokenLayer, effectLayer);
      app.stage.addChild(root);
      fitRoot(app, root);

      let elapsed = 0;
      const pulse = (ticker: { readonly deltaMS: number }) => {
        elapsed += ticker.deltaMS;
        const wave = 0.52 + Math.sin(elapsed / 360) * 0.24;
        for (const target of pulseTargets) {
          target.alpha = wave;
        }
      };
      app.ticker.add(pulse);

      if (playReplay) {
        await playReplayCommands(
          app,
          combatEventsToPixiReplayCommands(combatEvents),
          tokensByCardId,
          effectLayer,
          () => cancelled
        );
      }
    };

    void initialize();

    return () => {
      cancelled = true;
      if (initialized) {
        app?.destroy(true, { children: true });
      }
    };
  }, [combatEvents, model, playReplay, replayRequestKey]);

  return (
    <div
      ref={hostRef}
      className="pixi-renderer-host"
      data-testid="pixi-renderer-host"
      aria-label="Pixi battlefield canvas"
    />
  );
};
