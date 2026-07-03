import type { PlayerSide } from "@packbound/shared";

export const PIXI_BATTLEFIELD_THEME = {
  background: 0x091116,
  backgroundPanel: 0x101c23,
  vignette: 0x020507,
  fieldFill: 0x0f2028,
  lane: 0xf4c96a,
  laneDim: 0x6c5531,
  hexFill: 0x13252e,
  hexStroke: 0x41606b,
  hexStrokeDim: 0x20343c,
  rangeFill: 0x1e6f58,
  placeable: 0x86e2a8,
  selected: 0xffd36e,
  nextMove: 0x72a6ff,
  target: 0xff664f,
  player: {
    fill: 0x123f55,
    accent: 0x72d9ff,
    glow: 0x1ad7ff,
    text: 0xe8fbff
  },
  enemy: {
    fill: 0x5c211c,
    accent: 0xff8a5c,
    glow: 0xff4d3d,
    text: 0xfff0e8
  },
  support: 0xc7a76a,
  text: 0xf0f7f5,
  mutedText: 0x9db4b4,
  damage: 0xffd069,
  destroyed: 0x2f353a
} as const;

export const sideTheme = (side: PlayerSide) =>
  side === "playerA" ? PIXI_BATTLEFIELD_THEME.player : PIXI_BATTLEFIELD_THEME.enemy;
