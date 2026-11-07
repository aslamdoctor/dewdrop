// Builds the farm and hotbar backgrounds from the PixelFarm (CC0) tiles in
// assets/pixelfarm/. Drawn at 16px tiles, then scaled 2x with no smoothing.
// Rerun with `bun scripts/compose-farm.js` (needs ImageMagick's `magick`).
const ROOT = new URL("../", import.meta.url).pathname;
const SET = `${ROOT}assets/pixelfarm/FreeTileSet.png`;
const TREES = `${ROOT}assets/pixelfarm/FreeTreeTiles.png`;
const OUT = `${ROOT}mods/stardew/art/`;
const T = 16;

// Source rectangles [x, y, w, h] in the tile sheets.
const TILE = {
  grass: [0, 32, T, T],
  field: [0, 48, 48, 48],     // 3x3 tilled field with a grass border
  plot: [48, 48, T, T],       // one round tilled plot
  bed: [48, 64, 32, 32],      // 2x2 plots on a path
  crop: (stage) => [32 + stage * T, 96, T, T], // stages 0..4
  carrot: [112, 96, T, T],
  seeds: [0, 96, T, T],
};
const TREE = [2, 6, 28, 41];
const BUSH = [32, 4, 16, 12];

function compose(name, cols, rows, items) {
  const args = ["-size", `${cols * T}x${rows * T}`, "xc:none"];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) items.unshift(["set", TILE.grass, x * T, y * T]);
  for (const [sheet, [sx, sy, w, h], dx, dy] of items) {
    args.push("(", sheet === "set" ? SET : TREES, "-crop", `${w}x${h}+${sx}+${sy}`, "+repage", ")",
      "-geometry", `+${dx}+${dy}`, "-composite");
  }
  args.push("-filter", "point", "-resize", "200%", "-strip", `${OUT}${name}.png`);
  const r = Bun.spawnSync(["magick", ...args]);
  if (r.exitCode !== 0) throw new Error(r.stderr.toString());
}

// A tilled field planted at every stage, with crops filled into its 3x3 plots.
const planted = (x, y, stages) => [["set", TILE.field, x, y],
  ...stages.map((s, i) => ["set", TILE.crop(s), x + (i % 3) * T, y + Math.floor(i / 3) * T])];
// A 2x2 bed with crops on its four plots.
const bed = (x, y, stages) => [["set", TILE.bed, x, y],
  ...stages.map((s, i) => ["set", TILE.crop(s), x + (i % 2) * T, y + Math.floor(i / 2) * T])];
const tree = (x, y) => ["tree", TREE, x, y];
const bush = (x, y) => ["tree", BUSH, x, y];

// Farm, 30x19 tiles (960x608 at 2x). Panes cover the middle, so the detail
// sits along the edges where padding and gaps show through.
compose("farm", 30, 19, [
  ...planted(8, 8, [0, 1, 2, 1, 2, 3, 2, 3, 4]),
  ...planted(424, 248, [4, 3, 2, 3, 2, 1, 2, 1, 0]),
  ...bed(424, 8, [4, 4, 3, 4]),
  ...bed(8, 264, [1, 2, 2, 3]),
  tree(64, 0), tree(380, 2), tree(4, 120), tree(448, 120), tree(60, 262), tree(380, 262),
  bush(100, 40), bush(210, 4), bush(300, 6), bush(4, 200), bush(460, 80), bush(460, 200),
  bush(200, 288), bush(290, 290), bush(140, 290),
  ["set", TILE.carrot, 240, 4], ["set", TILE.seeds, 120, 284], ["set", TILE.plot, 330, 286],
]);

// Hotbar strip, 60x2 tiles (1920x64 at 2x). The wood box covers the center;
// crops grow on both sides, inside the part a 1280px-wide window still shows.
const side = (x0) => [
  ...bed(x0, 0, [1, 2, 3, 4]), bush(x0 + 40, 10), ["set", TILE.carrot, x0 + 62, 14],
  ...bed(x0 + 84, 0, [4, 3, 2, 1]), bush(x0 + 124, 18), ...bed(x0 + 148, 0, [2, 4, 4, 2]),
];
compose("hotbar-field", 60, 2, [...side(160), ...side(620)]);
console.log("wrote farm.png and hotbar-field.png");
