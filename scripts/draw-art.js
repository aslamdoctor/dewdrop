// Draws the dewdrop mod's small sprites as SVG. Run: bun scripts/draw-art.js
// Every sprite is original: small grids drawn by hand below, one string per row.
import { mkdirSync, writeFileSync } from "node:fs";
import { C, SPRITE as S } from "../mods/dewdrop/palette.js";

const OUT = new URL("../mods/dewdrop/art/", import.meta.url).pathname;
// The key for the older sprites (heart, buttons).
const KEY = {
  K: "#000000", w: "#ffffff", S: C.soil, P: C.parchment, W: C.wood, L: C.woodLight,
  G: C.grass, D: C.grassDark, B: C.sky, R: C.red, Y: C.gold, I: C.idle,
};

const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${body}</svg>\n`;
const rect = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;

// Grid sprite: one string per row, "." is transparent. Runs of a color merge into one rect.
// `key` maps each letter to a color; letters it doesn't know are an error.
function grid(name, rows, scale = 1, key = KEY) {
  const width = rows[0].length;
  let body = "";
  rows.forEach((row, y) => {
    if (row.length !== width) throw new Error(`${name}: row ${y} is ${row.length} wide, want ${width}`);
    for (let x = 0; x < width; ) {
      const ch = row[x];
      let end = x;
      while (row[end] === ch) end++;
      if (ch !== ".") {
        if (!key[ch]) throw new Error(`${name}: unknown pixel "${ch}"`);
        body += rect(x * scale, y * scale, (end - x) * scale, scale, key[ch]);
      }
      x = end;
    }
  });
  return [name, svg(width * scale, rows.length * scale, body)];
}

const sprites = [
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
];

// The new set, ported from the Dewdrop mock. Each one has its own letter key.
const CROP = { o: S.o, G: S.G, g: S.g, d: S.d, O: S.O, P: S.P, r: S.r, Y: S.Y, y: S.y, b: S.b, B: S.B, n: S.n, R: S.R, L: S.L, D: S.D };
const SUN_KEY = { Y: S.sunRay, O: S.sunCore };
const TOOL_KEY = { W: S.tool };

// Pane header window icon: title strip with three lights over a prompt and a cursor line.
const WINDOW = ["KKKKKKKKKKKK", "KBBBBBBBRYGK", "KKKKKKKKKKKK", "KDDDDDDDDDDK", "KDWDDDDDDDDK", "KDDWDDDDDDDK", "KDWDDWWWWDDK", "KDDDDDDDDDDK", "KKKKKKKKKKKK"];
const SUN = ["....Y....", ".Y..Y..Y.", "..YOOOY..", "..OOOOO..", "YYOOOOOYY", "..OOOOO..", "..YOOOY..", ".Y..Y..Y.", "....Y...."];
const MOON = ["...MMM...", ".MMMM....", ".MMM.....", "MMMM.....", "MMMM.....", "MMMM.....", ".MMMM..M.", ".MMMMMMM.", "...MMM..."];
const LEAF = [".......KK", ".....KOOK", "...KOOOOK", "..KOOYOOK", ".KOOYOOK.", ".KOYOOK..", "KOYOOK...", "KYKKK....", "K........"];
const BLOSSOM = ["...PPP...", "..PWWWP..", ".PPWWWPP.", "PWWPYPWWP", "PWWYYYWWP", "PWWPYPWWP", ".PPWWWPP.", "..PWWWP..", "...PPP..."];
const SNOWFLAKE = ["....W....", ".W..W..W.", "..W.W.W..", "...WWW...", "WWWWWWWWW", "...WWW...", "..W.W.W..", ".W..W..W.", "....W...."];
const CROPS = {
  carrot: ["................", "......o...o.....", ".....oGo.oGo....", "......oGogGo....", ".......oGGo.....", ".....ooooooo....", "....oPPOOOOro...", "....oPOOOOOro...", ".....oPOrOro....", ".....oPOOOro....", "......oOOro.....", "......oOOro.....", ".......oOo......", ".......oro......", "........o.......", "................"],
  pumpkin: ["................", "................", "........oo......", ".......odo..oo..", ".......oGo.oGGo.", "...oooooGooooo..", "..oPPOoOOOoOOro.", ".oPPOOoOOOOoOrro", ".oPOOOoOOOOoOrro", ".oPOOOoOOOOoOrro", ".oOOOOoOOOOoOrro", ".oOOOroOOOroOrro", "..oOrroOOrroOro.", "...oooooooooo...", "................", "................"],
  wheat: ["................", "......o.o.o.....", ".....oYoYoYo....", ".....oyYyYyo....", "....oYyYyYyYo...", "....oyYbYbYyo...", ".....oYbYbYo....", "......obgbo.....", "......ogGgo.....", ".....oBnBnBo....", "......oGgGo.....", ".....oGoGoGo....", "....oGo.o.oGo...", "...oGo.....oGo..", "...oo.......oo..", "................"],
  sprout: ["................", "................", "................", "....oo....oo....", "...ogGo..oGgo...", "...oggGooGggo...", "....ogGGGGgo....", ".....ooGGoo.....", ".......oGo......", ".......oGo......", "......ooGoo.....", "...ooooBnBoooo..", "..onnnBnnnBnnno.", "..oBBnBBBBnBBBo.", "...oooooooooooo.", "................"],
  tomato: ["................", ".......oo.......", ".....oogdoo.....", "....odGgGGdo....", "...ooooGGoooo...", "..oLLRRooRRRDo..", ".oLLRRRRRRRRDDo.", ".oLRRRRRRRRRRDo.", ".oRRRRRRRRRRRDo.", ".oRRRRRRRRRRDDo.", ".oRRRRRRRRRDDDo.", "..oRRRRRRRDDDo..", "...ooDDDDDDoo...", ".....oooooo.....", "................", "................"],
  corn: ["................", "........o.......", ".......oYo......", "......oYyYo.....", "......oyYbo.....", ".....oYyYbYo....", ".....oyYbYbo....", "....ooYyYbYoo...", "...oGoyYbYboGo..", "...oGgoYbYoGGo..", "....oGgoYoGGo...", ".....oGgoGGo....", "......oGgGo.....", ".......oGo......", "........o.......", "................"],
};
const PLUS = ["...WW...", "...WW...", "WWWWWWWW", "WWWWWWWW", "...WW...", "...WW..."];
const FOLDER = ["WWW.....", "WWWWWWWW", "W......W", "W......W", "W......W", "WWWWWWWW"];
const EYE = ["..WWWW..", ".W....W.", "W..WW..W", "W..WW..W", ".W....W.", "..WWWW.."];
const EYE_OFF = ["..WWWW.W", ".W....W.", "W..WWW.W", "W.WWW..W", ".W....W.", "W.WWWW.."];

const dewdrop = [
  grid("window", WINDOW, 1, { K: S.frame, B: S.glass, R: S.lightRed, Y: S.lightGold, G: S.lightGreen, D: S.screen, W: S.text }),
  grid("window-night", WINDOW, 1, { K: S.frame, B: S.glassNight, R: S.lightRed, Y: S.lightGold, G: S.lightGreen, D: S.screen, W: S.text }),
  grid("sun", SUN, 1, SUN_KEY),
  grid("moon", MOON, 1, { M: S.moon }),
  grid("season-spring", BLOSSOM, 1, { P: S.petal, W: S.petalLight, Y: S.sunRay }),
  grid("season-summer", SUN, 1, SUN_KEY),
  grid("season-fall", LEAF, 1, { K: S.leafEdge, O: S.leaf, Y: S.leafVein }),
  grid("season-winter", SNOWFLAKE, 1, { W: S.snow }),
  ...Object.entries(CROPS).map(([n, rows]) => grid(`crop-${n}`, rows, 1, CROP)),
  grid("tool-plus", PLUS, 1, TOOL_KEY),
  grid("tool-folder", FOLDER, 1, TOOL_KEY),
  grid("tool-eye", EYE, 1, TOOL_KEY),
  grid("tool-eye-off", EYE_OFF, 1, TOOL_KEY),
];

mkdirSync(OUT, { recursive: true });
const all = [...sprites, ...dewdrop];
for (const [name, src] of all) writeFileSync(`${OUT}${name}.svg`, src);
console.log("drew", all.length, "sprites into", OUT);
