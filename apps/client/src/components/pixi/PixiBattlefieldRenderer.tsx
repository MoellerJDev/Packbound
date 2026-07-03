import { useCallback, useEffect, useRef } from "react";
import { Application, Container, Graphics, Text } from "pixi.js";

import type { BoardPosition } from "@packbound/shared";

import {
  type PixiReplayCommand,
  type PixiReplayTokenDescriptor
} from "./pixiCombatReplay";
import {
  hexCenterForSharedCell,
  hexPolygonPoints,
  PIXI_BATTLEFIELD_LAYOUT,
  sharedCellForBoardPosition,
  type PixiPoint
} from "./pixiBattlefieldLayout";
import {
  initialsForName,
  type PixiBattlefieldCard,
  type PixiBattlefieldModel
} from "./pixiBattlefieldModel";
import type { PixiReplayStatus } from "./pixiReplayControls";
import { PIXI_BATTLEFIELD_THEME, sideTheme } from "./pixiTheme";

type PixiBattlefieldRendererProps = {
  readonly model: PixiBattlefieldModel;
  readonly replayCommands: readonly PixiReplayCommand[];
  readonly replayStatus: PixiReplayStatus;
  readonly replayCommandIndex: number;
  readonly replayResetKey: number;
  readonly replayStepRequestKey: number;
  readonly onReplayCommandComplete?: (
    nextCommandIndex: number,
    command: PixiReplayCommand,
    resetKey: number
  ) => void;
  readonly onTokenSelect?: (card: PixiBattlefieldCard) => void;
  readonly onCellSelect?: (position: BoardPosition) => void;
};

type TokenView = {
  readonly card: PixiBattlefieldCard;
  readonly container: Container;
  readonly baseScale: number;
};

type TokenEmphasis = "selected" | "target" | "none";

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
      .roundRect(
        18,
        18,
        PIXI_BATTLEFIELD_LAYOUT.width - 36,
        PIXI_BATTLEFIELD_LAYOUT.height - 36,
        18
      )
      .fill({ color: PIXI_BATTLEFIELD_THEME.fieldFill, alpha: 0.54 })
      .stroke({ color: PIXI_BATTLEFIELD_THEME.hexStroke, alpha: 0.42, width: 1.4 })
  );
  addText(root, "SHARED COMBAT FIELD", PIXI_BATTLEFIELD_LAYOUT.width / 2, 32, {
    fill: PIXI_BATTLEFIELD_THEME.text,
    fontSize: 10,
    fontWeight: "900",
    alpha: 0.68
  });
};

const drawCell = (
  root: Container,
  cell: PixiBattlefieldModel["cells"][number],
  pulseTargets: Graphics[],
  onCellSelect?: (position: BoardPosition) => void
): void => {
  const center = hexCenterForSharedCell(cell.sharedCell);
  const markers = cell.markers;
  const fill = markers.selected
    ? PIXI_BATTLEFIELD_THEME.selected
    : markers.targetOutOfRange || markers.likelyTarget
      ? PIXI_BATTLEFIELD_THEME.target
      : markers.nextMove
        ? PIXI_BATTLEFIELD_THEME.nextMove
        : markers.placeable
          ? PIXI_BATTLEFIELD_THEME.placeable
          : markers.range
            ? PIXI_BATTLEFIELD_THEME.rangeFill
            : PIXI_BATTLEFIELD_THEME.hexFill;
  const fillAlpha =
    markers.selected || markers.likelyTarget
      ? 0.58
      : markers.placeable
        ? 0.46
        : markers.range
          ? 0.34
          : 0.72;
  const stroke = markers.selected
    ? PIXI_BATTLEFIELD_THEME.selected
    : markers.targetInRange || markers.targetOutOfRange
      ? PIXI_BATTLEFIELD_THEME.target
      : markers.nextMove
        ? PIXI_BATTLEFIELD_THEME.nextMove
        : markers.placeable
          ? PIXI_BATTLEFIELD_THEME.placeable
          : PIXI_BATTLEFIELD_THEME.hexStroke;

  const graphic = new Graphics()
    .poly([...hexPolygonPoints(center, PIXI_BATTLEFIELD_LAYOUT.hexRadius)])
    .fill({ color: fill, alpha: fillAlpha })
    .stroke({
      color:
        markers.range || markers.selected || markers.likelyTarget || markers.placeable
          ? stroke
          : PIXI_BATTLEFIELD_THEME.hexStrokeDim,
      alpha:
        markers.range || markers.selected || markers.likelyTarget || markers.placeable
          ? 0.95
          : 0.72,
      width:
        markers.selected || markers.likelyTarget || markers.placeable
          ? 4
          : markers.range
            ? 2.8
            : 1.2
    });
  if (markers.placeable && cell.placeablePosition && onCellSelect) {
    graphic.eventMode = "static";
    graphic.cursor = "pointer";
    graphic.on("pointertap", () => onCellSelect(cell.placeablePosition!));
  }
  root.addChild(graphic);

  if (markers.selected || markers.likelyTarget || markers.nextMove || markers.placeable) {
    const ring = new Graphics()
      .poly([...hexPolygonPoints(center, PIXI_BATTLEFIELD_LAYOUT.hexRadius + 6)])
      .stroke({
        color: stroke,
        alpha: markers.placeable ? 0.9 : 0.82,
        width: markers.nextMove ? 3.2 : 4.4
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
    .stroke({ color: PIXI_BATTLEFIELD_THEME.nextMove, alpha: 0.9, width: 6 });
  root.addChild(arrow);
  root.addChild(
    new Graphics()
      .circle(to.x, to.y, 9)
      .fill({ color: PIXI_BATTLEFIELD_THEME.nextMove, alpha: 0.46 })
      .stroke({ color: PIXI_BATTLEFIELD_THEME.nextMove, alpha: 0.95, width: 3 })
  );
  pulseTargets.push(arrow);
};

const tokenPointForCard = (
  card: PixiBattlefieldCard,
  position: BoardPosition = card.position
): PixiPoint => {
  const center = hexCenterForSharedCell(sharedCellForBoardPosition(card.side, position));
  const offset = layerOffset(card.layer);
  return {
    x: center.x + offset.x + card.visualOffset.x,
    y: center.y + offset.y + card.visualOffset.y
  };
};

const drawToken = (
  card: PixiBattlefieldCard,
  onTokenSelect?: (card: PixiBattlefieldCard) => void,
  emphasis: TokenEmphasis = "none"
): TokenView => {
  const theme = sideTheme(card.side);
  const container = new Container();
  const isSupport = card.layer === "support" || card.cardType === "Relic";
  const emphasisColor =
    emphasis === "selected"
      ? PIXI_BATTLEFIELD_THEME.selected
      : emphasis === "target"
        ? PIXI_BATTLEFIELD_THEME.target
        : undefined;
  const point = tokenPointForCard(card);
  container.position.set(point.x, point.y);
  container.zIndex = card.sharedCell.row * 10 + (isSupport ? 1 : 4);
  if (onTokenSelect) {
    container.eventMode = "static";
    container.cursor = "pointer";
    container.on("pointertap", () => onTokenSelect(card));
  }

  if (isSupport) {
    container.addChild(
      new Graphics()
        .roundRect(-31, -20, 62, 40, 8)
        .fill({ color: PIXI_BATTLEFIELD_THEME.support, alpha: 0.9 })
        .stroke({ color: theme.accent, alpha: 0.88, width: 3 })
    );
    container.addChild(
      new Graphics()
        .poly([0, -25, 24, 0, 0, 25, -24, 0])
        .stroke({ color: theme.glow, alpha: 0.48, width: 2 })
    );
    if (emphasisColor) {
      container.addChild(
        new Graphics()
          .roundRect(-38, -27, 76, 54, 10)
          .stroke({ color: emphasisColor, alpha: 0.98, width: 4 })
      );
    }
    addText(container, card.initials, 0, -2, {
      fill: 0x20160b,
      fontSize: 14,
      fontWeight: "900"
    });
    container.addChild(
      new Graphics()
        .roundRect(-48, 24, 96, 20, 6)
        .fill({ color: 0x061014, alpha: 0.86 })
        .stroke({ color: theme.accent, alpha: 0.6, width: 1 })
    );
    addText(container, card.name, 0, 34, {
      fill: PIXI_BATTLEFIELD_THEME.text,
      fontSize: 9,
      fontWeight: "900",
      wordWrapWidth: 88
    });
    addText(container, "SUPPORT", 0, -31, {
      fill: PIXI_BATTLEFIELD_THEME.text,
      fontSize: 8,
      fontWeight: "900"
    });
    return { card, container, baseScale: 0.94 };
  }

  container.addChild(
    new Graphics()
      .circle(0, 0, 29)
      .fill({ color: theme.fill, alpha: 0.96 })
      .stroke({ color: theme.glow, alpha: 0.98, width: 4 })
  );
  container.addChild(
    new Graphics().circle(0, 0, 38).stroke({ color: theme.glow, alpha: 0.28, width: 9 })
  );
  if (emphasisColor) {
    container.addChild(
      new Graphics().circle(0, 0, 42).stroke({
        color: emphasisColor,
        alpha: 0.98,
        width: 4.5
      })
    );
  }
  addText(container, card.initials, 0, -5, {
    fill: theme.text,
    fontSize: 17,
    fontWeight: "900"
  });
  container.addChild(
    new Graphics()
      .roundRect(-54, 34, 108, 24, 7)
      .fill({ color: 0x061014, alpha: 0.88 })
      .stroke({ color: theme.accent, alpha: 0.62, width: 1 })
  );
  addText(container, card.name, 0, 46, {
    fill: PIXI_BATTLEFIELD_THEME.text,
    fontSize: 10,
    fontWeight: "900",
    wordWrapWidth: 98
  });

  const stats = card.statChips.filter((chip) => /ATK|HP|RNG/.test(chip)).slice(0, 3);
  stats.forEach((stat, index) => {
    const x = -36 + index * 36;
    container.addChild(
      new Graphics()
        .roundRect(x - 16, 15, 32, 16, 6)
        .fill({ color: 0x061014, alpha: 0.92 })
        .stroke({ color: theme.accent, alpha: 0.72, width: 1.4 })
    );
    addText(container, stat.replace(" ", ""), x, 23, {
      fill: theme.text,
      fontSize: 8,
      fontWeight: "900"
    });
  });

  return { card, container, baseScale: 1 };
};

const replayTokenCard = (
  token: PixiReplayTokenDescriptor,
  position = token.position
): PixiBattlefieldCard => ({
  cardInstanceId: token.cardInstanceId,
  defId: token.defId,
  name: token.name,
  initials: initialsForName(token.name),
  side: token.side,
  cardType: token.cardType,
  layer: token.layer,
  position,
  sharedCell: sharedCellForBoardPosition(token.side, position),
  visualOffset: { x: 0, y: 0 },
  statChips: [...token.statChips],
  traits: [...token.traits],
  keywords: [...token.keywords]
});

const ensureReplayToken = (
  command: Extract<PixiReplayCommand, { readonly type: "appear" }>,
  tokensByCardId: Map<string, TokenView>,
  tokenLayer: Container,
  onTokenSelect?: (card: PixiBattlefieldCard) => void
): TokenView => {
  const existingToken = tokensByCardId.get(command.cardInstanceId);
  if (existingToken) {
    return existingToken;
  }

  const token = drawToken(
    replayTokenCard(command.token, command.position),
    onTokenSelect
  );
  token.container.scale.set(token.baseScale);
  token.container.alpha = 0;
  tokenLayer.addChild(token.container);
  tokensByCardId.set(command.cardInstanceId, token);
  return token;
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

const wait = (ms: number, isCancelled: () => boolean = () => false): Promise<void> =>
  new Promise((resolve) => {
    const startedAt = performance.now();
    const tick = () => {
      if (isCancelled() || performance.now() - startedAt >= ms) {
        resolve();
        return;
      }
      window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
  });

const animate = (
  app: Application,
  durationMs: number,
  onFrame: (progress: number) => void,
  isCancelled: () => boolean = () => false
): Promise<void> =>
  new Promise((resolve) => {
    const start = performance.now();
    const tick = () => {
      if (isCancelled()) {
        app.ticker.remove(tick);
        resolve();
        return;
      }
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
): Container => {
  const beam = new Container();
  beam.addChild(
    new Graphics()
      .moveTo(source.container.x, source.container.y)
      .lineTo(target.container.x, target.container.y)
      .stroke({ color: 0xffd069, alpha: 0.32, width: 15 })
  );
  beam.addChild(
    new Graphics()
      .moveTo(source.container.x, source.container.y)
      .lineTo(target.container.x, target.container.y)
      .stroke({ color: 0xfff2aa, alpha: 0.98, width: 7 })
  );
  effectLayer.addChild(beam);
  return beam;
};

const floatDamageText = (
  effectLayer: Container,
  token: TokenView,
  amount: number
): Container => {
  const container = new Container();
  container.position.set(token.container.x, token.container.y - 34);
  container.addChild(
    new Graphics()
      .roundRect(-33, -18, 66, 34, 10)
      .fill({ color: 0x061014, alpha: 0.9 })
      .stroke({ color: PIXI_BATTLEFIELD_THEME.damage, alpha: 0.86, width: 2 })
  );
  addText(container, `-${amount}`, 0, -1, {
    fill: PIXI_BATTLEFIELD_THEME.damage,
    fontSize: 26,
    fontWeight: "900"
  });
  effectLayer.addChild(container);
  return container;
};

const flashTokenRing = async (
  app: Application,
  effectLayer: Container,
  token: TokenView,
  color: number,
  durationMs: number,
  isCancelled: () => boolean
): Promise<void> => {
  const ring = new Container();
  ring.position.set(token.container.x, token.container.y);
  ring.addChild(new Graphics().circle(0, 0, 42).stroke({ color, alpha: 0.9, width: 4 }));
  effectLayer.addChild(ring);
  await animate(
    app,
    durationMs,
    (progress) => {
      ring.scale.set(1 + progress * 0.48);
      ring.alpha = 1 - progress;
    },
    isCancelled
  );
  ring.destroy();
};

const markDestroyed = (token: TokenView): void => {
  token.container.alpha = 0.46;
  token.container.addChild(
    new Graphics()
      .circle(0, 0, 35)
      .fill({ color: PIXI_BATTLEFIELD_THEME.destroyed, alpha: 0.72 })
      .stroke({ color: 0xffe1d0, alpha: 0.96, width: 4 })
  );
  token.container.addChild(
    new Graphics()
      .moveTo(-20, -20)
      .lineTo(20, 20)
      .moveTo(-20, 20)
      .lineTo(20, -20)
      .stroke({ color: 0xffe1d0, alpha: 0.96, width: 5 })
  );
  addText(token.container, "X", 0, 0, {
    fill: 0xffe1d0,
    fontSize: 26,
    fontWeight: "900"
  });
};

const playCommand = async (
  app: Application,
  command: PixiReplayCommand,
  tokensByCardId: Map<string, TokenView>,
  tokenLayer: Container,
  effectLayer: Container,
  onTokenSelect: ((card: PixiBattlefieldCard) => void) | undefined,
  isCancelled: () => boolean
): Promise<void> => {
  switch (command.type) {
    case "move": {
      const token = tokensByCardId.get(command.cardInstanceId);
      if (!token) {
        return;
      }
      const from = token.container.position.clone();
      const to = tokenPointForCard(token.card, command.to);
      await animate(
        app,
        320,
        (progress) => {
          token.container.position.set(
            from.x + (to.x - from.x) * progress,
            from.y + (to.y - from.y) * progress
          );
        },
        isCancelled
      );
      return;
    }
    case "attack": {
      const source = tokensByCardId.get(command.sourceCardInstanceId);
      const target = tokensByCardId.get(command.targetCardInstanceId);
      if (!source || !target) {
        return;
      }
      const line = lineBetweenTokens(effectLayer, source, target);
      await animate(
        app,
        280,
        (progress) => {
          line.alpha = 1 - progress;
          target.container.scale.set(
            target.baseScale + Math.sin(progress * Math.PI) * 0.14
          );
        },
        isCancelled
      );
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
      await animate(
        app,
        560,
        (progress) => {
          text.y = startY - progress * 38;
          text.alpha = 1 - progress;
        },
        isCancelled
      );
      text.destroy();
      return;
    }
    case "destroyed": {
      const token = tokensByCardId.get(command.cardInstanceId);
      if (!token) {
        return;
      }
      markDestroyed(token);
      await flashTokenRing(
        app,
        effectLayer,
        token,
        PIXI_BATTLEFIELD_THEME.destroyed,
        240,
        isCancelled
      );
      await wait(120, isCancelled);
      return;
    }
    case "appear": {
      const token = ensureReplayToken(command, tokensByCardId, tokenLayer, onTokenSelect);
      const to = tokenPointForCard(token.card, command.position);
      const startAlpha = token.container.alpha;
      token.container.position.set(to.x, to.y);
      await animate(
        app,
        320,
        (progress) => {
          token.container.alpha = startAlpha + (1 - startAlpha) * progress;
          token.container.scale.set(
            token.baseScale + Math.sin(progress * Math.PI) * 0.16
          );
        },
        isCancelled
      );
      token.container.alpha = 1;
      token.container.scale.set(token.baseScale);
      await flashTokenRing(
        app,
        effectLayer,
        token,
        sideTheme(command.side).glow,
        260,
        isCancelled
      );
      return;
    }
    case "phaseOut": {
      const token = tokensByCardId.get(command.cardInstanceId);
      if (!token) {
        return;
      }
      await flashTokenRing(
        app,
        effectLayer,
        token,
        PIXI_BATTLEFIELD_THEME.nextMove,
        220,
        isCancelled
      );
      await animate(
        app,
        360,
        (progress) => {
          token.container.alpha = 1 - progress * 0.72;
        },
        isCancelled
      );
      return;
    }
  }
};

export const PixiBattlefieldRenderer = ({
  model,
  replayCommands,
  replayStatus,
  replayCommandIndex,
  replayResetKey,
  replayStepRequestKey,
  onReplayCommandComplete,
  onTokenSelect,
  onCellSelect
}: PixiBattlefieldRendererProps) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | undefined>(undefined);
  const tokenLayerRef = useRef<Container | undefined>(undefined);
  const effectLayerRef = useRef<Container | undefined>(undefined);
  const tokensByCardIdRef = useRef<Map<string, TokenView>>(new Map());
  const replayCommandsRef = useRef(replayCommands);
  const replayStatusRef = useRef(replayStatus);
  const replayCommandIndexRef = useRef(replayCommandIndex);
  const replayResetKeyRef = useRef(replayResetKey);
  const replaySessionRef = useRef(0);
  const replayBusySessionRef = useRef<number | undefined>(undefined);
  const lastStepRequestKeyRef = useRef(replayStepRequestKey);
  const onTokenSelectRef = useRef(onTokenSelect);
  const onCellSelectRef = useRef(onCellSelect);
  const onReplayCommandCompleteRef = useRef(onReplayCommandComplete);

  useEffect(() => {
    replayCommandsRef.current = replayCommands;
  }, [replayCommands]);

  useEffect(() => {
    replayStatusRef.current = replayStatus;
  }, [replayStatus]);

  useEffect(() => {
    replayCommandIndexRef.current = replayCommandIndex;
  }, [replayCommandIndex]);

  useEffect(() => {
    replayResetKeyRef.current = replayResetKey;
  }, [replayResetKey]);

  useEffect(() => {
    onTokenSelectRef.current = onTokenSelect;
  }, [onTokenSelect]);

  useEffect(() => {
    onCellSelectRef.current = onCellSelect;
  }, [onCellSelect]);

  useEffect(() => {
    onReplayCommandCompleteRef.current = onReplayCommandComplete;
  }, [onReplayCommandComplete]);

  const executeCurrentCommand = useCallback(async (): Promise<boolean> => {
    const session = replaySessionRef.current;
    if (replayBusySessionRef.current === session) {
      return false;
    }
    if (replayBusySessionRef.current !== undefined) {
      replayBusySessionRef.current = undefined;
    }

    const app = appRef.current;
    const tokenLayer = tokenLayerRef.current;
    const effectLayer = effectLayerRef.current;
    if (!app || !tokenLayer || !effectLayer) {
      return false;
    }

    const resetKey = replayResetKeyRef.current;
    const commandIndex = replayCommandIndexRef.current;
    const command = replayCommandsRef.current[commandIndex];
    if (!command) {
      return false;
    }

    replayBusySessionRef.current = session;
    try {
      await playCommand(
        app,
        command,
        tokensByCardIdRef.current,
        tokenLayer,
        effectLayer,
        onTokenSelectRef.current,
        () => replaySessionRef.current !== session
      );

      if (replaySessionRef.current !== session) {
        return false;
      }

      const nextCommandIndex = commandIndex + 1;
      replayCommandIndexRef.current = nextCommandIndex;
      onReplayCommandCompleteRef.current?.(nextCommandIndex, command, resetKey);
      return true;
    } finally {
      if (replayBusySessionRef.current === session) {
        replayBusySessionRef.current = undefined;
      }
    }
  }, []);

  const runAutomaticPlayback = useCallback(async () => {
    while (replayStatusRef.current === "playing") {
      const played = await executeCurrentCommand();
      if (!played) {
        return;
      }
      await wait(35, () => replayStatusRef.current !== "playing");
    }
  }, [executeCurrentCommand]);

  const waitForReplayIdle = useCallback(async (session: number): Promise<boolean> => {
    const startedAt = performance.now();
    while (
      replayBusySessionRef.current === session &&
      replaySessionRef.current === session &&
      performance.now() - startedAt < 1500
    ) {
      await wait(16, () => replaySessionRef.current !== session);
    }

    return (
      replayBusySessionRef.current !== session && replaySessionRef.current === session
    );
  }, []);

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
      appRef.current = app;
      tokenLayerRef.current = tokenLayer;
      effectLayerRef.current = effectLayer;
      tokensByCardIdRef.current = tokensByCardId;
      replayCommandIndexRef.current = replayCommandIndex;
      replaySessionRef.current += 1;
      replayBusySessionRef.current = undefined;

      drawBackground(root);
      for (const cell of model.cells) {
        drawCell(cellLayer, cell, pulseTargets, (position) =>
          onCellSelectRef.current?.(position)
        );
      }
      drawMovePreview(cellLayer, model, pulseTargets);
      for (const card of model.cards) {
        const emphasis =
          card.cardInstanceId === model.selectedCardInstanceId
            ? "selected"
            : card.cardInstanceId === model.likelyTargetCardInstanceId
              ? "target"
              : "none";
        const token = drawToken(
          card,
          (selectedCard) => onTokenSelectRef.current?.(selectedCard),
          emphasis
        );
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

      if (replayStatusRef.current === "playing") {
        void runAutomaticPlayback();
      }
    };

    void initialize();

    return () => {
      cancelled = true;
      replaySessionRef.current += 1;
      replayBusySessionRef.current = undefined;
      appRef.current = undefined;
      tokenLayerRef.current = undefined;
      effectLayerRef.current = undefined;
      tokensByCardIdRef.current = new Map();
      if (initialized) {
        app?.destroy(true, { children: true });
      }
    };
  }, [model, replayResetKey, runAutomaticPlayback]);

  useEffect(() => {
    if (replayStatus === "playing") {
      void runAutomaticPlayback();
    }
  }, [replayStatus, runAutomaticPlayback]);

  useEffect(() => {
    if (replayStepRequestKey === lastStepRequestKeyRef.current) {
      return;
    }

    lastStepRequestKeyRef.current = replayStepRequestKey;

    if (replayStatusRef.current === "playing") {
      return;
    }

    // Step requests that arrive mid-animation wait for that command to settle,
    // then advance exactly one additional deterministic replay command.
    const session = replaySessionRef.current;
    void (async () => {
      const idle = await waitForReplayIdle(session);
      if (idle && replayStatusRef.current !== "playing") {
        void executeCurrentCommand();
      }
    })();
  }, [executeCurrentCommand, replayStepRequestKey, waitForReplayIdle]);

  return (
    <div
      ref={hostRef}
      className="pixi-renderer-host"
      data-testid="pixi-renderer-host"
      aria-label="Pixi battlefield canvas"
    />
  );
};
