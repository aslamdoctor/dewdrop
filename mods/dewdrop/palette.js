// The only place palette hex values live in the mod.
export const C = {
  soil: "#2b1d14",
  parchment: "#f3e2b8",
  wood: "#8a5a2b",
  woodLight: "#c58b4e",
  grass: "#6ab04c",
  grassDark: "#3f6b2a",
  sky: "#5fa8d3",
  red: "#d9534f",
  gold: "#f2c14e",
  idle: "#9c7b5b",
};

export const INK = "#3b2418";
export const GOLD_LINE = "#e8c65a";

// Every color the SVG sprites use (scripts/draw-art.js). The one-letter keys are the
// crop palette, as in the mock; the named keys cover the window, sky and tool icons.
export const SPRITE = {
  o: INK, G: "#5e8a48", g: "#a3c072", d: "#34502e", O: "#d0714c", P: "#e4966a", r: "#b4523a",
  Y: GOLD_LINE, y: "#f4de8e", b: "#a8802c", B: "#74492c", n: "#96623a", R: "#c2583e", L: "#f0bc96", D: "#8a3a2e",
  frame: "#000000", glass: C.sky, glassNight: "#8e9ccf", lightRed: C.red, lightGold: C.gold, lightGreen: C.grass, screen: C.soil, text: C.parchment,
  sunRay: C.gold, sunCore: "#f7d774", moon: "#f3ecc8",
  tool: C.parchment,
};

export const STATUS = { working: "#5fa8d3", blocked: "#d9534f", done: "#f2c14e", idle: "#9c7b5b" };

// pane carries the mock's alpha (0.86 day, 0.84 night). The layout sets terminal_opacity
// to 0, so this pane fill is the only thing between a terminal and the scene.
export const LOOK = {
  day: { bar: "#8a5a2b", barLight: "#c58b4e", text: "#f3e2b8", tabOn: ["#f3e2b8", "#2b1d14"], tabOff: ["#6b4420", "#f3e2b8"], plank: "#9a6a36", plankLight: "#d29a5c", plankText: "#fff4d6", plankDim: "#2b1d14",
    border: "#6b4420", focus: "#f2c14e", pane: "#20160fdb", trim: "#c58b4e", slot: "#2b1d14", slotOn: "#5a3a20" },
  night: { bar: "#3a2718", barLight: "#5a3c25", text: "#f3e2b8", tabOn: ["#f2c14e", "#2b1d14"], tabOff: ["#4a3220", "#c9b48a"], plank: "#4a3220", plankLight: "#6b4a30", plankText: "#f2c14e", plankDim: "#9c7b5b",
    border: "#2b1d14", focus: "#f2c14e", pane: "#0b0b1ad6", trim: "#f2c14e", slot: "#1f160f", slotOn: "#3d2a1a" },
};

export function dotColor(status) {
  const s = status ?? "idle";
  return Object.hasOwn(STATUS, s) ? STATUS[s] : STATUS.idle;
}
