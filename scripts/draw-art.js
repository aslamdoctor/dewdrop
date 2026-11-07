// Draws the stardew mod's pixel art as SVG. Run: bun scripts/draw-art.js
// Every sprite is original: small grids drawn by hand below, scenery drawn by code.
import { mkdirSync, writeFileSync } from "node:fs";
import { C } from "../mods/stardew/palette.js";
import { CLOCK } from "../mods/stardew/logic.js";

const OUT = new URL("../mods/stardew/art/", import.meta.url).pathname;
const KEY = {
  K: "#000000", w: "#ffffff", S: C.soil, P: C.parchment, W: C.wood, L: C.woodLight,
  G: C.grass, D: C.grassDark, B: C.sky, R: C.red, Y: C.gold, I: C.idle,
};

const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${body}</svg>\n`;
const rect = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;

// Grid sprite: one string per row, "." is transparent. Runs of a color merge into one rect.
// Rings every colored pixel with black, so a sprite drawn in one color still reads on wood.
function outlined(rows) {
  const at = (x, y) => rows[y]?.[x] ?? ".";
  return rows.map((row, y) => [...row].map((ch, x) => {
    if (ch !== ".") return ch;
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => ![".", "K"].includes(at(x + dx, y + dy)));
    return near ? "K" : ".";
  }).join(""));
}

function grid(name, rows, scale = 1) {
  const width = rows[0].length;
  let body = "";
  rows.forEach((row, y) => {
    if (row.length !== width) throw new Error(`${name}: row ${y} is ${row.length} wide, want ${width}`);
    for (let x = 0; x < width; ) {
      const ch = row[x];
      let end = x;
      while (row[end] === ch) end++;
      if (ch !== ".") {
        if (!KEY[ch]) throw new Error(`${name}: unknown pixel "${ch}"`);
        body += rect(x * scale, y * scale, (end - x) * scale, scale, KEY[ch]);
      }
      x = end;
    }
  });
  return [name, svg(width * scale, rows.length * scale, body)];
}

const sprites = [
  grid("can-0", [
    "................",
    "................",
    "................",
    ".....KKKKK......",
    "....K.....K.....",
    "....K.....K...KK",
    "..KKKKKKKKKKK.KB",
    ".KBBBBBBBBBBBKBK",
    ".KBPBBBBBBBBBBK.",
    ".KBPBBBBBBBBBK..",
    ".KBBBBBBBBBBBK..",
    ".KBBBBBBBBBBBK..",
    ".KBBBBBBBBBBBK..",
    "..KKKKKKKKKKK...",
    "................",
    "................",
  ]),
  grid("can-1", [
    "................",
    "................",
    "....KKKKK.......",
    "...K.....K......",
    "...K.....K......",
    ".KKKKKKKKKKK....",
    "KBBBBBBBBBBBK...",
    "KBPBBBBBBBBBKK..",
    "KBPBBBBBBBBBBBK.",
    "KBBBBBBBBBBBK.KK",
    "KBBBBBBBBBBBK...",
    ".KKKKKKKKKKK..B.",
    "..............B.",
    ".............B.B",
    "..............B.",
    "................",
  ]),
  grid("bang", [
    "................",
    "..KKKKKKKKKKKK..",
    ".KRRRRRRRRRRRRK.",
    ".KRRRRRwwRRRRRK.",
    ".KRRRRRwwRRRRRK.",
    ".KRRRRRwwRRRRRK.",
    ".KRRRRRwwRRRRRK.",
    ".KRRRRRwwRRRRRK.",
    ".KRRRRRRRRRRRRK.",
    ".KRRRRRwwRRRRRK.",
    ".KRRRRRRRRRRRRK.",
    "..KKKKRRKKKKKK..",
    ".....KRK........",
    "......K.........",
    "................",
    "................",
  ]),
  grid("star", [
    "................",
    ".......KK.......",
    "......KYYK......",
    "......KYYK......",
    ".....KYYYYK.....",
    ".KKKKKYYYYKKKKK.",
    ".KYYYYYPYYYYYYK.",
    "..KYYYYYYYYYYK..",
    "...KYYYYYYYYK...",
    "....KYYYYYYK....",
    "...KYYYYYYYYK...",
    "...KYYYKKYYYK...",
    "..KYYYK..KYYYK..",
    "..KYYK....KYYK..",
    "..KKK......KKK..",
    "................",
  ]),
  grid("zzz", outlined([
    "................",
    "........IIIIII..",
    "...........II...",
    "..........II....",
    ".........II.....",
    "........IIIIII..",
    "................",
    "..IIIIIIII......",
    "........II......",
    ".......II.......",
    "......II........",
    ".....II.........",
    "....II..........",
    "...II...........",
    "..IIIIIIII......",
    "................",
  ])),
  grid("heart", [
    "................",
    "................",
    "...KKK...KKK....",
    "..KRRRK.KRRRK...",
    ".KRwRRRKRRRRRK..",
    ".KRwRRRRRRRRRK..",
    ".KRRRRRRRRRRRK..",
    "..KRRRRRRRRRK...",
    "...KRRRRRRRK....",
    "....KRRRRRK.....",
    ".....KRRRK......",
    "......KRK.......",
    ".......K........",
    "................",
    "................",
    "................",
  ]),
  grid("btn-zoom", [
    "................",
    ".KKKKKKKKKKKKKK.",
    ".KLLLLLLLLLLLLK.",
    ".KLLLLLLLLLLLLK.",
    ".KLLSSSSSSSSLLK.",
    ".KLLSSSSSSSSLLK.",
    ".KLLSLLLLLLSLLK.",
    ".KLLSLLLLLLSLLK.",
    ".KLLSLLLLLLSLLK.",
    ".KLLSLLLLLLSLLK.",
    ".KLLSLLLLLLSLLK.",
    ".KLLSSSSSSSSLLK.",
    ".KLLLLLLLLLLLLK.",
    ".KWWWWWWWWWWWWK.",
    ".KKKKKKKKKKKKKK.",
    "................",
  ]),
  grid("btn-close", [
    "................",
    ".KKKKKKKKKKKKKK.",
    ".KLLLLLLLLLLLLK.",
    ".KLLLLLLLLLLLLK.",
    ".KLLRRLLLLRRLLK.",
    ".KLLLRRLLRRLLLK.",
    ".KLLLLRRRRLLLLK.",
    ".KLLLLLRRLLLLLK.",
    ".KLLLLRRRRLLLLK.",
    ".KLLLRRLLRRLLLK.",
    ".KLLRRLLLLRRLLK.",
    ".KLLLLLLLLLLLLK.",
    ".KLLLLLLLLLLLLK.",
    ".KWWWWWWWWWWWWK.",
    ".KKKKKKKKKKKKKK.",
    "................",
  ]),
  // Chicken: drawn on a 16 grid at 2x, so it sits on a 32x32 canvas.
  grid("chicken-0", [
    "................",
    "....RR..........",
    "...RRR..........",
    "...wwww.........",
    "..wwKww.........",
    "YYwwwww.........",
    "..Rwwww.........",
    "...wwww....ww...",
    "...wwwwwwwwwww..",
    "...wwwwwwwwwww..",
    "...wwwPPPPwww...",
    "....wwPPPwwww...",
    ".....wwwwwww....",
    ".......Y..Y.....",
    ".......Y..Y.....",
    "......YY.YY.....",
  ], 2),
  grid("chicken-1", [
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "...........ww...",
    "....wwwwwwwwwww.",
    "..wwwwwwwwwwwww.",
    ".RwwwwPPPPwwww..",
    "RRwKwwwPPPwwww..",
    ".wwwwwwwwwwww...",
    "YRwww..wwwww....",
    "Y......Y..Y.....",
    ".......Y..Y.....",
    "......YY.YY.....",
  ], 2),
];

// Hotbar slot, 48x48: dark frame, wood border with a light top-left edge, soil well.
function slot() {
  return ["slot", svg(48, 48,
    rect(0, 0, 48, 48, KEY.K) + rect(2, 2, 44, 44, C.wood) + rect(2, 2, 44, 2, C.woodLight) +
    rect(2, 2, 2, 44, C.woodLight) + rect(6, 6, 36, 36, KEY.K) + rect(8, 8, 32, 32, C.soil) +
    rect(8, 38, 32, 2, C.idle))];
}

// Plank, 64x16, tiles horizontally: light top edge, grain lines, a nail near each end.
function plank() {
  return ["plank", svg(64, 16,
    rect(0, 0, 64, 16, C.wood) + rect(0, 0, 64, 2, C.woodLight) + rect(0, 14, 64, 2, C.soil) +
    rect(8, 6, 18, 1, C.soil) + rect(34, 9, 22, 1, C.soil) + rect(20, 11, 10, 1, C.soil) +
    rect(3, 6, 2, 2, KEY.K) + rect(59, 6, 2, 2, KEY.K) + rect(62, 2, 2, 12, C.soil))];
}

// Clock box, CLOCK.w x 36: framed parchment panel with a divider before the season cell.
function clock() {
  const { w, h, split } = CLOCK;
  return ["clock", svg(w, h,
    rect(0, 0, w, h, KEY.K) + rect(2, 2, w - 4, h - 4, C.wood) + rect(2, 2, w - 4, 2, C.woodLight) +
    rect(5, 5, w - 10, h - 10, KEY.K) + rect(6, 6, w - 12, h - 12, C.parchment) + rect(split, 6, 2, h - 12, C.wood))];
}

mkdirSync(OUT, { recursive: true });
for (const [name, src] of [...sprites, slot(), plank(), clock()]) writeFileSync(`${OUT}${name}.svg`, src);
console.log("drew", sprites.length + 3, "sprites into", OUT);
