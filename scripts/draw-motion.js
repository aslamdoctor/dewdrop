// Builds the mod's animated WebPs. Run: bun scripts/draw-motion.js (needs ImageMagick, `magick`).
// Rerunnable: it rewrites every file below from the grids here and the pet PNGs in art/pets/,
// and the same inputs give the same files.
//   art/bird.webp                  a front-on bird flapping, two frames (sky strip)
//   art/pets/<pet>-walk-l.webp     each pet's walk cycle facing left (the PNGs face left)
//   art/pets/<pet>-walk-r.webp     the same, mirrored with -flop
//   art/pets/<pet>-<f>-r.png       the standing frame and the action frame, mirrored
// Frames are saved at twice the shown size (display scale 2).
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SPRITE as S } from "../mods/dewdrop/palette.js";
import { PET_FRAMES, PET_KEYS, PET_WALK } from "../mods/dewdrop/pets.js";
import { encodePNG, scaleNearest } from "./png.js";

const ART = new URL("../mods/dewdrop/art/", import.meta.url).pathname;

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

// A grid ("." transparent) as RGBA, k output pixels per grid pixel.
function gridPNG(rows, key, k) {
  const w = rows[0].length, h = rows.length, px = new Uint8Array(w * h * 4);
  rows.forEach((row, y) => {
    if (row.length !== w) throw new Error(`row ${y} is ${row.length} wide, want ${w}`);
    [...row].forEach((ch, x) => {
      if (ch === ".") return;
      if (!key[ch]) throw new Error(`unknown pixel "${ch}"`);
      px.set([...rgb(key[ch]), 255], (y * w + x) * 4);
    });
  });
  const big = scaleNearest(w, h, px, k);
  return encodePNG(big.width, big.height, big.rgba);
}

// Lossless, looping forever, each frame cleared before the next (the frames are transparent).
// The time stamp is dropped so a rerun writes the same bytes.
function webp(out, frames, ms, flop = false) {
  execFileSync("magick", [
    "-delay", `${ms}x1000`, "-dispose", "Background", ...frames,
    ...(flop ? ["-flop"] : []),
    "-loop", "0", "-define", "webp:lossless=true", "-define", "webp:method=6", "-strip", out,
  ]);
}

// Wings up, then down. Symmetric, so it reads the same flying either way. Shown 27x15.
const BIRD_KEY = { B: S.bird, w: S.birdWing };
const BIRD = [
  [
    "w.......w",
    ".ww...ww.",
    "...wBw...",
    "....B....",
    ".........",
  ],
  [
    ".........",
    ".........",
    "...wBw...",
    ".ww.B.ww.",
    "w.......w",
  ],
];

const tmp = mkdtempSync(join(tmpdir(), "dewdrop-motion-"));
try {
  const birdFrames = BIRD.map((rows, i) => {
    const f = join(tmp, `bird-${i}.png`);
    writeFileSync(f, gridPNG(rows, BIRD_KEY, 6));
    return f;
  });
  webp(`${ART}bird.webp`, birdFrames, 180);

  for (const pet of PET_KEYS) {
    const [a, b] = PET_FRAMES[pet];
    const frames = [a, b].map((f) => `${ART}pets/${pet}-${f}.png`);
    webp(`${ART}pets/${pet}-walk-l.webp`, frames, PET_WALK[pet].ms);
    webp(`${ART}pets/${pet}-walk-r.webp`, frames, PET_WALK[pet].ms, true);
    for (const f of [a, PET_FRAMES[pet][2]]) {
      execFileSync("magick", [`${ART}pets/${pet}-${f}.png`, "-flop", "-strip", `${ART}pets/${pet}-${f}-r.png`]);
    }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
console.log("drew bird.webp and", PET_KEYS.length * 2, "pet walks and their mirrored stills into", ART);
