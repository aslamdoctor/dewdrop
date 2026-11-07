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

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { art, ART } from "../mods/stardew/art.js";

const ART_DIR = new URL("../mods/stardew/art/", import.meta.url).pathname;
const FONT_DIR = new URL("../mods/stardew/fonts/", import.meta.url).pathname;
const NAMES = ["farm", "plank", "clock", "slot", "can-0", "can-1", "bang", "star", "zzz", "heart",
  "chicken-0", "chicken-1", "btn-zoom", "btn-close"];
const ALLOWED = new Set([...Object.values(C), "#000000", "#ffffff"]);

test("art() builds mod-relative paths", () => {
  expect(ART).toBe("mods/stardew/art");
  expect(art("can-0")).toBe("mods/stardew/art/can-0.svg");
});

test("every named sprite exists", () => {
  const files = existsSync(ART_DIR) ? readdirSync(ART_DIR) : [];
  for (const n of NAMES) expect(files).toContain(`${n}.svg`);
});

test("sprites are crisp SVGs in palette colors", () => {
  const files = existsSync(ART_DIR) ? readdirSync(ART_DIR).filter((f) => f.endsWith(".svg")) : [];
  expect(files.length).toBeGreaterThan(0);
  for (const f of files) {
    const src = readFileSync(ART_DIR + f, "utf8").trim();
    expect(src.startsWith("<svg")).toBe(true);
    expect(src).toContain("viewBox");
    expect(src).toContain('shape-rendering="crispEdges"');
    for (const hex of src.toLowerCase().match(/#[0-9a-f]{6}/g) ?? []) {
      if (!ALLOWED.has(hex)) throw new Error(`${f}: off-palette ${hex}`);
    }
  }
});

test("Pixelify Sans and its license are bundled", () => {
  expect(statSync(FONT_DIR + "PixelifySans.ttf").size).toBeGreaterThan(10 * 1024);
  expect(existsSync(FONT_DIR + "OFL.txt")).toBe(true);
});
