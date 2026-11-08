import { test, expect } from "bun:test";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { C, INK, GOLD_LINE, LOOK, STATUS, SPRITE, dotColor } from "../mods/dewdrop/palette.js";
import { art, png, pic, petFrame, petWalk, PET_FRAMES, ART } from "../mods/dewdrop/art.js";
import { PET_KEYS } from "../mods/dewdrop/pets.js";
import { SKY_ART } from "../mods/dewdrop/logic.js";
import { CAST } from "../mods/dewdrop/cast.js";
import theme from "../themes/dewdrop.json";

test("day and night palettes match the mock", () => {
  expect(LOOK.day).toMatchObject({ bar: "#8a5a2b", barLight: "#c58b4e", border: "#6b4420", focus: "#f2c14e", trim: "#c58b4e", pane: "#20160fdb" });
  expect(LOOK.night).toMatchObject({ bar: "#3a2718", barLight: "#5a3c25", border: "#2b1d14", focus: "#f2c14e", trim: "#f2c14e", pane: "#0b0b1ad6" });
  expect(Object.keys(LOOK.day).sort()).toEqual(Object.keys(LOOK.night).sort());
  expect([INK, GOLD_LINE]).toEqual(["#3b2418", "#e8c65a"]);
});

test("dotColor gives idle for null and unknown", () => {
  expect(dotColor("working")).toBe("#5fa8d3");
  expect(dotColor(null)).toBe("#9c7b5b");
  expect(dotColor("weird")).toBe("#9c7b5b");
  expect(dotColor("constructor")).toBe("#9c7b5b");
});

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

const ART_DIR = new URL("../mods/dewdrop/art/", import.meta.url).pathname;
const FONT_DIR = new URL("../mods/dewdrop/fonts/", import.meta.url).pathname;
const pngSize = (f) => { const b = readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
// An animated WebP: RIFF, WEBP, then a VP8X chunk with the ANIM flag and the canvas size (24-bit, minus one).
const webpInfo = (f) => {
  const b = readFileSync(f);
  expect([b.toString("ascii", 0, 4), b.toString("ascii", 8, 12), b.toString("ascii", 12, 16)]).toEqual(["RIFF", "WEBP", "VP8X"]);
  return { animated: (b[20] & 0x02) !== 0, size: [b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1] };
};
const svgSize = (f) => /width="(\d+)" height="(\d+)"/.exec(readFileSync(f, "utf8")).slice(1).map(Number);

const SVGS = ["window", "window-night", "sun", "moon",
  "crop-carrot", "crop-pumpkin", "crop-wheat", "crop-sprout", "crop-tomato", "crop-corn",
  "tool-plus", "tool-folder", "tool-eye", "tool-eye-off", "heart", "btn-zoom", "btn-close",
  "cloud-a", "cloud-b", "cloud-c", "star-warm", "star-cool", "star-big", "firefly"];
const ALLOWED = new Set([...Object.values(C), ...Object.values(SPRITE), ...Object.values(STATUS), INK, GOLD_LINE, "#000000", "#ffffff"]);

test("art helpers build mod-relative paths", () => {
  expect(ART).toBe("mods/dewdrop/art");
  expect(art("window")).toBe("mods/dewdrop/art/window.svg");
  expect(png("scene-day")).toBe("mods/dewdrop/art/scene-day.png");
  expect(pic("cast/03")).toBe("mods/dewdrop/art/cast/03.png");
  expect(petFrame("dog", "wag")).toBe("mods/dewdrop/art/pets/dog-wag.png");
});

test("every named sprite exists", () => {
  const files = existsSync(ART_DIR) ? readdirSync(ART_DIR) : [];
  for (const n of SVGS) expect(files).toContain(`${n}.svg`);
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

test("scenes cover the window at the pixel scale", () => {
  for (const n of ["scene-day", "scene-night"]) expect(pngSize(`${ART_DIR}${n}.png`)).toEqual([5120, 3008]);
});

test("pictures and pet frames exist at their sizes", () => {
  for (const c of CAST) expect(pngSize(`${ART_DIR}${c.file}.png`)).toEqual([192, 192]);
  for (const [pet, frames] of Object.entries(PET_FRAMES)) for (const f of frames) expect(pngSize(`${ART_DIR}pets/${pet}-${f}.png`)).toEqual([96, 80]);
  expect(pngSize(`${ART_DIR}doghouse.png`)).toEqual([96, 80]);
});

test("PET_FRAMES lists each pet's frames", () => {
  expect(PET_FRAMES).toEqual({ chicken: ["a", "b", "act"], duck: ["a", "b", "act"], cat: ["a", "b", "nap"], dog: ["a", "b", "wag"],
    rabbit: ["a", "hop", "act"], turtle: ["a", "b", "hide"], frog: ["a", "hop", "act"] });
});

test("no PixelFarm leftovers", () => {
  expect(existsSync(new URL("../assets/pixelfarm", import.meta.url).pathname)).toBe(false);
  expect(readFileSync(`${ART_DIR}CREDITS.md`, "utf8")).not.toContain("PixelFarm");
});

test("pet walks are animated WebPs at twice the shown 48x40", () => {
  expect(petWalk("dog", "r")).toBe("mods/dewdrop/art/pets/dog-walk-r.webp");
  for (const pet of PET_KEYS) for (const dir of ["l", "r"]) {
    expect(webpInfo(`${ART_DIR}pets/${pet}-walk-${dir}.webp`)).toEqual({ animated: true, size: [96, 80] });
  }
});

test("sky sprites match their sizes in logic.js", () => {
  for (const [name, [w, h]] of Object.entries(SKY_ART)) {
    if (name === "bird") expect(webpInfo(`${ART_DIR}bird.webp`)).toEqual({ animated: true, size: [w * 6, h * 6] });
    else expect(svgSize(`${ART_DIR}${name}.svg`)).toEqual([w, h]);
  }
});
