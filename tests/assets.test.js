import { test, expect } from "bun:test";
import { C } from "../mods/stardew/palette.js";
import theme from "../themes/stardew.json";

test("palette matches spec", () => {
  expect(C).toEqual({ soil: "#2b1d14", parchment: "#f3e2b8", wood: "#8a5a2b", woodLight: "#c58b4e",
    grass: "#6ab04c", grassDark: "#3f6b2a", sky: "#5fa8d3", red: "#d9534f", gold: "#f2c14e", idle: "#9c7b5b" });
});

test("theme uses the palette", () => {
  expect(theme.background).toBe(C.soil);
  expect(theme.foreground).toBe(C.parchment);
  expect(theme.ansi).toHaveLength(16);
  expect(theme.colors).toMatchObject({ working: C.sky, blocked: C.red, done: C.gold, idle: C.idle,
    accent: C.grass, chrome: C.wood, border: C.wood, input: C.woodLight, canvas: C.grassDark });
});
