import { test, expect } from "bun:test";
import { C, INK, GOLD_LINE, LOOK, dotColor } from "../mods/dewdrop/palette.js";

test("day and night palettes match the mock", () => {
  expect(LOOK.day).toMatchObject({ bar: "#8a5a2b", barLight: "#c58b4e", border: "#6b4420", focus: "#f2c14e", trim: "#c58b4e", ring: "#d9534f", pane: "#20160f" });
  expect(LOOK.night).toMatchObject({ bar: "#3a2718", barLight: "#5a3c25", border: "#2b1d14", focus: "#f2c14e", trim: "#f2c14e", ring: "#f2c14e", pane: "#0b0b1a" });
  expect(Object.keys(LOOK.day).sort()).toEqual(Object.keys(LOOK.night).sort());
  expect([INK, GOLD_LINE]).toEqual(["#3b2418", "#e8c65a"]);
});

test("dotColor gives idle for null and unknown", () => {
  expect(dotColor("working")).toBe("#5fa8d3");
  expect(dotColor(null)).toBe("#9c7b5b");
  expect(dotColor("weird")).toBe("#9c7b5b");
});
import theme from "../themes/dewdrop.json";

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
import { art, ART } from "../mods/dewdrop/art.js";
import { CLOCK } from "../mods/dewdrop/logic.js";

const ART_DIR = new URL("../mods/dewdrop/art/", import.meta.url).pathname;
const FONT_DIR = new URL("../mods/dewdrop/fonts/", import.meta.url).pathname;
const NAMES = ["plank", "clock", "slot", "can-0", "can-1", "bang", "star", "zzz", "heart",
  "chicken-0", "chicken-1", "btn-zoom", "btn-close"];
const ALLOWED = new Set([...Object.values(C), "#000000", "#ffffff"]);

test("art() builds mod-relative paths", () => {
  expect(ART).toBe("mods/dewdrop/art");
  expect(art("can-0")).toBe("mods/dewdrop/art/can-0.svg");
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

test("status icons have a black outline so they read on wood", () => {
  for (const n of ["can-1", "bang", "star", "zzz"]) {
    expect(readFileSync(`${ART_DIR}${n}.svg`, "utf8")).toContain("#000000");
  }
});

test("clock.svg is as wide as the clock box", () => {
  expect(readFileSync(`${ART_DIR}clock.svg`, "utf8")).toContain(`width="${CLOCK.w}"`);
});

import { png } from "../mods/dewdrop/art.js";
import layout from "../layouts/dewdrop.json";

const PNG_NAMES = ["farm", "hotbar-field"];
const pngSize = (f) => { const b = readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

test("png() builds mod-relative paths", () => {
  expect(png("farm")).toBe("mods/dewdrop/art/farm.png");
});

test("PixelFarm backgrounds exist at 2x and are credited", () => {
  expect(pngSize(`${ART_DIR}farm.png`)).toEqual([960, 608]);
  expect(pngSize(`${ART_DIR}hotbar-field.png`)).toEqual([1920, 64]);
  expect(readFileSync(`${ART_DIR}CREDITS.md`, "utf8")).toContain("CC0");
});

test("layout uses the PixelFarm backgrounds", () => {
  const find = (n, id) => n.id === id ? n : (n.children ?? []).map((c) => find(c, id)).find(Boolean);
  for (const [id, name] of [["main", "farm"], ["hotbar", "hotbar-field"]]) {
    expect(find(layout, id).background).toEqual({ image: png(name), fit: "cover" });
  }
  expect(PNG_NAMES.length).toBe(2);
});
