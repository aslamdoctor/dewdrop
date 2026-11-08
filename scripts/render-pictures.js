// Makes the picture and pet PNGs. Run: bun scripts/render-pictures.js
// - portrait.png: the user's own picture, the first tile of their portrait sheet, 192x192.
// - cast/01..24.png: the 24 farmhands, copied from the preview folder (already 192x192 crops).
// - pets/<pet>-<frame>.png and doghouse.png: 24x20 pixel drawings saved at 4x (96x80), so they
//   are crisp when shown at 48x40 on a 2x display.
// The pet drawing code is ported from the Dewdrop mock (art.js). It has no randomness: its
// texture noise is a hash of the pixel position, so each run draws the same pixels.
import { copyFileSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { encodePNG, scaleNearest } from "./png.js";
import { PET_FRAMES } from "../mods/dewdrop/art.js";

const ART_OUT = new URL("../mods/dewdrop/art/", import.meta.url).pathname;
const DOWNLOADS = `${homedir()}/Downloads`;
const SHEET = `${DOWNLOADS}/Pixel Portrait Grid of a Bearded Farmer.png`;
const CAST_SRC = `${DOWNLOADS}/generated-html-files/stardew-previews/cast`;
const PET_SCALE = 4;

function magick(...args) {
  const r = Bun.spawnSync(["magick", ...args]);
  if (r.exitCode !== 0) throw new Error(`magick ${args.join(" ")}: ${r.stderr.toString()}`);
  return r.stdout.toString().trim();
}

// Portrait: crop the first tile, trim its white gutter, pad it square by repeating the edge
// pixels (so no white line is left), then scale down smoothly to 192x192.
function portrait() {
  const tmp = `${ART_OUT}.portrait-trim.png`;
  magick(SHEET, "-crop", "492x487+12+14", "+repage", "-fuzz", "8%", "-trim", "+repage", tmp);
  const [w, h] = magick(tmp, "-format", "%w %h", "info:").split(" ").map(Number);
  const s = Math.max(w, h), dx = Math.floor((s - w) / 2), dy = Math.floor((s - h) / 2);
  magick(tmp, "-virtual-pixel", "edge", "-set", "option:distort:viewport", `${s}x${s}-${dx}-${dy}`,
    "-filter", "point", "-distort", "SRT", "0", "+repage",
    "-filter", "Lanczos", "-resize", "192x192!", "-strip", `PNG32:${ART_OUT}portrait.png`);
  rmSync(tmp);
}

function cast() {
  mkdirSync(`${ART_OUT}cast`, { recursive: true });
  for (let i = 1; i <= 24; i++) {
    const n = String(i).padStart(2, "0");
    copyFileSync(`${CAST_SRC}/${n}.png`, `${ART_OUT}cast/${n}.png`);
  }
}

// ---------- pet drawing, ported from the mock ----------
const H = (s) => Array.isArray(s) ? s : [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const M = (a, b, t) => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t));
const LIGHT = [255, 246, 222], DARK = [60, 30, 26];
const T = (c, k) => k >= 0 ? M(H(c), LIGHT, k) : M(H(c), DARK, -k);
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const dz = (x, y, v) => v > (B4[((y & 3) * 4) + (x & 3)] + 0.5) / 16;
const hash = (x, y) => { const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return v - Math.floor(v); };

class Pix {
  constructor(w, h, s = 1) { this.s = s; this.w = w * s; this.h = h * s; this.c = new Array(this.w * this.h).fill(null); this.z = new Int16Array(this.w * this.h).fill(-1); this.tex = null; }
  ok(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  set(x, y, c, z) { x = Math.floor(x); y = Math.floor(y); if (!this.ok(x, y)) return; const i = y * this.w + x; this.c[i] = H(c); this.z[i] = z; }
  get(x, y) { return this.ok(x, y) ? this.c[y * this.w + x] : null; }
  zat(x, y) { return this.ok(x, y) ? this.z[y * this.w + x] : -1; }
  nmix(x, y, c, t) { x = Math.floor(x); y = Math.floor(y); const o = this.get(x, y); if (o) this.c[y * this.w + x] = M(o, H(c), t); }
  // grid-cell mix; with onlyZ it touches only pixels of that layer
  mix(x, y, c, t, onlyZ) { for (let j = 0; j < this.s; j++) for (let i = 0; i < this.s; i++) { const nx = x * this.s + i, ny = y * this.s + j; if (onlyZ === undefined || this.zat(nx, ny) === onlyZ) this.nmix(nx, ny, c, t); } }
}

const TEX = {
  hair: (x, y) => 0.3 * Math.sin(x * 0.9 + Math.sin(y * 0.22 + x * 0.05) * 2.2),
  cloth: () => 0,
  skin: () => 0,
  fur: () => 0,
  leaf: (x, y) => (hash(x >> 1, y >> 1) - 0.5) * 0.75,
  rock: (x, y) => (hash(x >> 1, y >> 1) - 0.5) * 0.3,
  straw: (x, y) => ((x + y) % 3 === 0 ? -0.3 : 0),
  wave: (x, y) => ((x * 3 + y * 7) % 11 === 0 ? 0.6 : 0),
  plank: (x, y) => ((y % 3) === 0 ? -0.45 : 0),
};
let CUR = null; // the character being drawn: its hair color gets the hair texture

// four hard tones per material (shadow, mid shadow, base, highlight), no dithering
const TONES = [-0.3, -0.14, 0, 0.14];
function shade(b, L) { return T(b, TONES[L < -0.5 ? 0 : L < -0.08 ? 1 : L < 0.55 ? 2 : 3]); }
// the fixed earthy palette every pixel is snapped to
const PAL = ("2b1a12 3b2418 553420 74492c 96623a b8814c d4a46a e8c690 f4e2bc fbf3df " +
  "fbe0c2 f6d2ac eebe96 e8b088 dca078 cf8c64 bc7a56 a96a48 80492f 5a3222 e6c0a8 d4a48c c08a76 a87264 " +
  "26382a 34502e 466c3a 5e8a48 7ea45a a3c072 c6d898 " +
  "1c2238 28324e 3a4c6e 52698e 7088aa 96aec6 c2d4e0 " +
  "5e2a24 8a3a2e b4523a d0714c e4966a f0bc96 " +
  "7a5a1e a8802c d0a83c e8c65a f4de8e " +
  "34283e 4e3c5e 6e5884 927aa6 bca8cc " +
  "8e4a5e b86e80 d896a2 eec0c2 " +
  "2e2e34 4a4a52 6c6c72 92928e bcb8ae e2ddd0 " +
  "2a4c4a 3e6e68 5e968a 8cbcaa").split(" ").map((h) => H("#" + h));
const snap = (c) => { let best = PAL[0], bd = 1e9; for (const q of PAL) { const r = (c[0] + q[0]) / 2, dr = c[0] - q[0], dg = c[1] - q[1], db = c[2] - q[2], d = (2 + r / 256) * dr * dr + 4 * dg * dg + (2 + (255 - r) / 256) * db * db; if (d < bd) { bd = d; best = q; } } return best; };
const texFor = (p, col, o) => o.tex ?? (CUR && typeof col === "string" && col === CUR.hairC ? TEX.hair : p.tex);
function ell(p, cx, cy, rx, ry, col, z, o = {}) {
  const s = p.s, b = H(col), tex = texFor(p, col, o);
  const xa = Math.max(0, Math.floor((cx - rx) * s)), xb = Math.min(p.w - 1, Math.ceil((cx + rx) * s));
  const ya = Math.max(0, Math.floor((cy - ry) * s)), yb = Math.min(p.h - 1, Math.ceil((cy + ry) * s));
  for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
    const lx = (x + 0.5) / s, ly = (y + 0.5) / s, dx = (lx - cx) / rx, dy = (ly - cy) / ry;
    if (dx * dx + dy * dy > 1 || (o.clip && !o.clip(lx - 0.5, ly - 0.5))) continue;
    p.set(x, y, o.flat ? b : shade(b, -(dx * 0.55 + dy * 0.8) * (o.k ?? 1) + (o.bias ?? 0) + (tex ? tex(x, y) : 0), x, y), z);
  }
}
function poly(p, pts, col, z, o = {}) {
  const s = p.s, b = H(col), tex = texFor(p, col, o);
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hw = Math.max(1, (x1 - x0) / 2), hh = Math.max(1, (y1 - y0) / 2);
  for (let y = Math.max(0, Math.floor(y0 * s)); y <= Math.min(p.h - 1, Math.ceil(y1 * s)); y++) for (let x = Math.max(0, Math.floor(x0 * s)); x <= Math.min(p.w - 1, Math.ceil(x1 * s)); x++) {
    const px = (x + 0.5) / s, py = (y + 0.5) / s; let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
    }
    if (!inside || (o.clip && !o.clip(px - 0.5, py - 0.5))) continue;
    p.set(x, y, o.flat ? b : shade(b, -(((px - cx) / hw) * 0.45 + ((py - cy) / hh) * 0.6) * (o.k ?? 1) + (o.bias ?? 0) + (tex ? tex(x, y) : 0), x, y), z);
  }
}
const rect = (p, x0, y0, x1, y1, col, z, o) => poly(p, [[x0, y0], [x1 + 1, y0], [x1 + 1, y1 + 1], [x0, y1 + 1]], col, z, o);
// a grid cell; a dark eye cell (z 100) also gets a one-pixel catchlight
function dot(p, x, y, col, z = 9) {
  for (let j = 0; j < p.s; j++) for (let i = 0; i < p.s; i++) p.set(Math.floor(x) * p.s + i, Math.floor(y) * p.s + j, col, z);
  if (z === 100 && col === "#1d1410") p.set(Math.floor(x) * p.s, Math.floor(y) * p.s, "#f4f0e6", 101);
}
const fdot = (p, x, y, col, z = 60) => p.set(x * p.s, y * p.s, col, z);
function line(p, x0, y0, x1, y1, col, z = 9) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) dot(p, Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), col, z);
}
function fline(p, x0, y0, x1, y1, col, z = 60) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 0.5) * p.s * 1.5;
  for (let i = 0; i <= n; i++) p.set((x0 + (x1 - x0) * i / n) * p.s, (y0 + (y1 - y0) * i / n) * p.s, col, z);
}
function curve(p, a, c, b, r, col, z, o) {
  for (let t = 0; t <= 1.001; t += 0.05) {
    const x = (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], y = (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1];
    ell(p, x, y, r * (o?.taper ? 1 - t * 0.45 : 1), r * (o?.taper ? 1 - t * 0.45 : 1), col, z, o);
  }
}
// a soft glow or tint: mixes toward col, strongest in the middle
function soft(p, cx, cy, rx, ry, col, t) {
  const s = p.s;
  for (let y = Math.max(0, Math.floor((cy - ry) * s)); y <= Math.min(p.h - 1, (cy + ry) * s); y++) for (let x = Math.max(0, Math.floor((cx - rx) * s)); x <= Math.min(p.w - 1, (cx + rx) * s); x++) {
    const dx = ((x + 0.5) / s - cx) / rx, dy = ((y + 0.5) / s - cy) / ry, r = dx * dx + dy * dy;
    if (r < 1) p.nmix(x, y, col, t * (1 - r));
  }
}
// edge pass: edge pixels take a darker tone of their own color; a part tucked behind another gets a seam
function edge(p, outer) {
  const src = p.c.slice(), z = p.z.slice(), W = p.w;
  const at = (x, y) => p.ok(x, y) ? src[y * W + x] : null, zt = (x, y) => p.ok(x, y) ? z[y * W + x] : -1;
  for (let y = 0; y < p.h; y++) for (let x = 0; x < W; x++) {
    const c = src[y * W + x];
    if (!c) continue;
    let open = false, seam = false;
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!at(x + ox, y + oy)) open = true; else if (zt(x + ox, y + oy) > zt(x, y) && zt(x + ox, y + oy) < 50) seam = true;
    }
    if (seam && !open) p.c[y * W + x] = T(c, -0.22);
  }
  if (outer) {
    const s2 = p.c.slice();
    for (let y = 0; y < p.h; y++) for (let x = 0; x < W; x++) {
      if (s2[y * W + x]) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([ox, oy]) => p.ok(x + ox, y + oy) && s2[(y + oy) * W + x + ox])) { p.c[y * W + x] = H(outer); p.z[y * W + x] = 99; }
    }
  }
}

// ================= pets: 24x20 grid at 2x, facing left, feet on row 19 =================
const OUT = "#3b2418";
const np = () => { const p = new Pix(24, 20, 1); p.tex = TEX.fur; return p; };
const PET = {
  chicken(f) {
    const p = np(), W = "#fbfaf2", ph = f === "b" ? 1 : 0, peck = f === "act";
    poly(p, [[16, 11], [19, 4], [21, 6], [23, 3], [22.5, 11], [19, 14]], W, 1);
    fline(p, 19, 5, 20.5, 10, "#d8d2c2", 9); fline(p, 22.5, 4, 21.5, 10, "#d8d2c2", 9);
    for (const [x, k] of [[11, ph], [15, 1 - ph]]) { fline(p, x + 0.5, 16, x + 0.5 + (k ? 1 : 0), 19, "#f2a83a", 2); fline(p, x + 1, 16, x + 1 + (k ? 1 : 0), 19, "#e0922a", 2); rect(p, x - 1 + (k ? 1 : 0), 19, x + 1 + (k ? 1 : 0), 19.5, "#e8962a", 2, { flat: true }); }
    ell(p, 13, 12, 7, 5.5, W, 3);
    ell(p, 15, 12, 4.5, 3, "#ece6d6", 4); for (const [a, b] of [[13, 13], [15, 14], [17, 13], [14, 11.5], [16.5, 11.5]]) fline(p, a, b, a + 1, b + 0.5, "#cfc8b6", 9);
    const hx = peck ? 5 : 7, hy = peck ? 12.5 : 5.5;
    ell(p, peck ? 8 : 9, peck ? 11 : 8.5, 3, 3.5, W, 5);
    ell(p, hx, hy, 3.2, 3.1, W, 6);
    ell(p, hx - 0.5, hy - 3, 1.3, 1.3, "#e5484d", 7); ell(p, hx + 1.4, hy - 3.4, 1.3, 1.3, "#e5484d", 7); ell(p, hx + 0.4, hy - 2.6, 1, 1, "#d83a40", 7);
    poly(p, [[hx - 2.6, hy - 0.8], [hx - 5.5, hy + 0.3], [hx - 2.6, hy + 1.4]], "#f2b632", 8);
    ell(p, hx - 2, hy + 2.6, 0.9, 1.4, "#e5484d", 8);
    edge(p, OUT); dot(p, hx - 1, hy - 1, "#1d1410", 100);
    return p;
  },
  duck(f) {
    const p = np(), W = "#fbfaf2", ph = f === "b" ? 1 : 0, open = f === "act";
    for (const [x, k] of [[12, ph], [15, 1 - ph]]) { rect(p, x, 17, x + 0.6, 18.6, "#f29a2a", 1); rect(p, x - 1 - (k ? 1 : 0), 19, x + 1 - (k ? 1 : 0), 19.5, "#e8862a", 1, { flat: true }); }
    poly(p, [[18, 11], [23, 6.5], [22, 12.5]], W, 2);
    ell(p, 13, 13.5, 8, 5, W, 3);
    ell(p, 15.5, 12.5, 5.2, 3, "#e8e4da", 4); ell(p, 18.2, 13.4, 1.6, 0.7, "#7a9ac8", 9, { flat: true }); fline(p, 13, 13.5, 17, 14.5, "#d4cec0", 9);
    ell(p, 8, 9.5, 2.6, 4, W, 5); ell(p, 7, 5.5, 3.4, 3.1, W, 6);
    if (open) { poly(p, [[4.5, 4.5], [0.5, 4], [0.5, 5.6], [4.5, 6.4]], "#f2a03a", 7); poly(p, [[4.5, 7], [1, 8.4], [1, 9.4], [4.5, 8.4]], "#e08a2a", 7); }
    else { poly(p, [[4.5, 4.8], [0.5, 5.4], [0.5, 7.4], [4.5, 7.8]], "#f2a03a", 7); fline(p, 1, 6.4, 4.5, 6.4, "#c8782a", 8); }
    edge(p, OUT); dot(p, 6, 4, "#1d1410", 100);
    return p;
  },
  cat(f) {
    const p = np(), O = "#e8862e", C = "#fff2e0", ph = f === "b" ? 1 : 0;
    if (f === "nap") {
      ell(p, 13, 15.5, 8.5, 4.5, O, 2, { clip: (x, y) => y <= 19 });
      for (const x of [11, 14, 17]) { fline(p, x, 11.5, x + 1, 14, T(O, -0.3), 9); fline(p, x + 0.5, 11.5, x + 1.5, 14, T(O, -0.3), 9); }
      curve(p, [21, 17.5], [16, 21], [8, 18.5], 1.3, O, 5);
      ell(p, 6.5, 14.5, 4.2, 3.6, O, 6);
      poly(p, [[3, 12.5], [3.5, 8.5], [6, 11.5]], O, 5); poly(p, [[6.5, 11.5], [9, 8.5], [9.5, 12.5]], O, 5); fdot(p, 4, 10.5, "#f2a7b4", 9); fdot(p, 8, 10.5, "#f2a7b4", 9);
      ell(p, 4.5, 16, 2, 1.3, C, 7);
      edge(p, OUT);
      fline(p, 3, 14.2, 4.6, 14.6, "#3a2010", 100); fline(p, 7, 14.6, 8.6, 14.2, "#3a2010", 100); fdot(p, 2, 15.4, "#f2a7b4", 100);
      return p;
    }
    curve(p, [19, 11], [23, 10], [21.5, 3], 1.4, O, 1, { taper: true });
    const lx = ph ? [8, 12, 15, 19] : [9, 11, 16, 18];
    lx.forEach((x) => { rect(p, x, 14, x + 1, 18, O, 2); rect(p, x, 19, x + 1, 19.5, C, 3, { flat: true }); });
    ell(p, 13.5, 12, 7, 4, O, 3);
    for (const x of [12, 15, 18]) { fline(p, x, 8.5, x + 1, 11, T(O, -0.32), 9); fline(p, x + 0.5, 8.5, x + 1.5, 11, T(O, -0.25), 9); }
    ell(p, 6, 8.5, 4.2, 3.7, O, 5);
    poly(p, [[2.6, 7], [3, 2.6], [5.8, 6]], O, 4); poly(p, [[6.2, 6], [8.6, 2.6], [9.4, 7]], O, 4);
    ell(p, 4, 5.3, 0.6, 1, "#f2a7b4", 9, { flat: true }); ell(p, 8, 5.3, 0.6, 1, "#f2a7b4", 9, { flat: true });
    ell(p, 3.6, 10.4, 2.2, 1.5, C, 6);
    edge(p, OUT);
    for (const ex of [4, 7]) { rect(p, ex, 8, ex + 0.9, 8.9, "#3f8f3a", 100, { flat: true }); fdot(p, ex + 0.5, 8, "#1d1410", 101); fdot(p, ex, 8, "#e8ffd0", 101); }
    fdot(p, 1, 9.5, "#f2a7b4", 100); fline(p, 0, 10.5, 2, 10.8, "#fff4e6", 100);
    return p;
  },
  dog(f) {
    const p = np(), Tn = "#d8a066", Wt = "#fff2e0", ph = f === "b" ? 1 : 0, wag = f === "wag";
    curve(p, [19, 10], wag ? [22, 9] : [22, 11], wag ? [23, 3] : [23.5, 6], 1.2, Tn, 1, { taper: true });
    const lx = ph ? [7, 11, 15, 19] : [8, 10, 16, 18];
    lx.forEach((x) => { rect(p, x, 14, x + 1, 18, Tn, 2); rect(p, x, 18, x + 1, 19.5, Wt, 3, { flat: true }); });
    ell(p, 13, 12, 7.5, 4.3, Tn, 3);
    ell(p, 15.5, 9.8, 4, 2.4, "#8a5a2b", 4, { clip: (x, y) => { const dx = (x + 0.5 - 13) / 7.5, dy = (y + 0.5 - 12) / 4.3; return dx * dx + dy * dy <= 1; } });
    ell(p, 7.5, 13.5, 2.6, 2.6, Wt, 4);
    ell(p, 6, 7, 3.9, 3.6, Tn, 5);
    ell(p, 2.8, 9, 2.5, 1.8, "#f0d2a8", 6);
    poly(p, [[6, 3.5], [9.5, 4], [10.5, 10.5], [8, 11]], "#6b4420", 7);
    if (wag) ell(p, 3, 11.4, 1, 1.2, "#e86a7a", 7);
    rect(p, 7, 10.6, 10.5, 11.4, "#d0453a", 8, { flat: true }); ell(p, 8.5, 12, 0.6, 0.6, "#f2c14e", 9, { flat: true });
    edge(p, OUT);
    ell(p, 1, 8.2, 1, 1, "#1d1410", 100, { flat: true }); fdot(p, 0.5, 7.7, "#8a8090", 101); dot(p, 4, 6, "#1d1410", 100);
    return p;
  },
  rabbit(f) {
    const p = np(), G = "#cbbfb2", hop = f === "hop", tw = f === "act";
    if (hop) {
      ell(p, 21, 10, 1.9, 1.9, "#ffffff", 1);
      ell(p, 19.5, 15.5, 3.4, 1.3, T(G, -0.1), 2);
      ell(p, 13, 12, 8, 3.8, G, 3);
      ell(p, 5, 14.5, 1.2, 2.2, G, 2);
      ell(p, 5.5, 9, 3.6, 3, G, 5);
      ell(p, 10, 4.5, 1.3, 4, G, 4); ell(p, 12, 5.5, 1.2, 3.6, G, 3);
      edge(p, OUT); dot(p, 4, 8, "#1d1410", 100); fdot(p, 2, 9.4, "#f2a7b4", 100); fline(p, 10, 2, 10, 6.5, "#f2a7b4", 100);
      return p;
    }
    ell(p, 20.5, 13.5, 1.9, 1.9, "#ffffff", 1);
    ell(p, 14.5, 14.5, 6.5, 4.6, G, 2); ell(p, 17, 15, 4, 4, G, 3);
    ell(p, 13, 18.8, 3.4, 1, T(G, -0.12), 4); ell(p, 7.5, 18.4, 1.3, 1.3, G, 4);
    ell(p, 7, 11, 3.8, 3.3, G, 6); ell(p, 4.6, 12.4, 1.6, 1.1, "#ece4da", 7);
    ell(p, 8, 4.5, 1.3, 4, G, 5); tw ? ell(p, 11.5, 5.5, 1.2, 3.6, G, 4) : ell(p, 10.2, 5, 1.2, 3.6, G, 4);
    edge(p, OUT);
    fline(p, 8, 2, 8, 6.5, "#f2a7b4", 100); fline(p, 8.4, 2.5, 8.4, 6, "#f8c4cc", 100); dot(p, 5, 10, "#1d1410", 100); fdot(p, 3, 11.4, "#f2a7b4", 100);
    return p;
  },
  turtle(f) {
    const p = np(), hide = f === "hide", ph = f === "b" ? 1 : 0, sy = hide ? 3 : 0;
    if (!hide) {
      ell(p, 3, 13.5, 2.5, 2.1, "#9cc56a", 2); ell(p, 5, 15, 1.8, 1.6, "#9cc56a", 1);
      ell(p, 6 + (ph ? -1 : 0), 17.6, 1.7, 1.6, "#8ab85a", 1); ell(p, 17 + (ph ? 1 : 0), 17.6, 1.7, 1.6, "#8ab85a", 1);
      ell(p, 21, 15.5, 1.3, 0.9, "#8ab85a", 1);
    }
    ell(p, 12, 13 + sy, 8.5, 6.5, "#5f9a3e", 3, { clip: (x, y) => y <= 15 + sy, tex: null });
    rect(p, 4, 15 + sy, 20, 16 + sy, "#c9a85a", 4, { tex: null });
    for (const [cx, cy] of [[12, 10.5], [7.5, 12.5], [16.5, 12.5]]) ell(p, cx, cy + sy, 2.4, 1.9, "#7ab452", 5, { tex: null, k: 0.8 });
    for (const [x0, y0, x1, y1] of [[9.5, 8, 9.5, 15], [14.5, 8, 14.5, 15], [5, 11, 19, 11]]) fline(p, x0, y0 + sy, x1, y1 + sy, T("#5f9a3e", -0.38), 6);
    edge(p, OUT);
    if (!hide) { dot(p, 2, 13, "#1d1410", 100); fline(p, 0.5, 14.6, 2, 14.8, "#5a7a3a", 100); }
    return p;
  },
  frog(f) {
    const p = np(), G = "#6fbf4a", Bl = "#e6e3a0", hop = f === "hop", croak = f === "act";
    p.tex = (x, y) => (hash(x, y) - 0.5) * 0.12;
    if (hop) {
      poly(p, [[14, 11], [23, 15], [23.5, 17.5], [21, 17], [13, 15]], G, 1);
      rect(p, 21, 17, 23, 18, T(G, -0.1), 2, { flat: true });
      ell(p, 11, 10, 8, 4.6, G, 3);
      ell(p, 9, 12, 5, 2.4, Bl, 4);
      poly(p, [[6, 12], [1, 15], [2, 16.5], [7, 14]], G, 4);
      ell(p, 5, 6.5, 2.6, 2.4, G, 6); ell(p, 9, 6, 2.4, 2.3, G, 5);
      for (const [x, y] of [[12, 8], [15, 9], [10, 7.5]]) ell(p, x, y, 0.8, 0.6, T(G, -0.3), 9, { flat: true });
      edge(p, OUT);
      ell(p, 4.6, 6.4, 1.2, 1.1, "#f2c14e", 100, { flat: true }); dot(p, 4, 6, "#1d1410", 100); fline(p, 2, 10, 6, 10, "#2f5a22", 100);
      return p;
    }
    ell(p, 15.5, 15.5, 5, 3.4, G, 2);
    rect(p, 12, 19, 20, 19.5, T(G, -0.12), 3, { flat: true });
    ell(p, 11.5, 13.5, 8, 5.2, G, 3, { clip: (x, y) => y <= 18 });
    ell(p, 9, 16, 5, 2.6, Bl, 4);
    rect(p, 5, 15, 6, 18, G, 5); rect(p, 3, 19, 7, 19.5, T(G, -0.12), 5, { flat: true });
    if (croak) ell(p, 5.5, 13.6, 3.4, 2.8, "#f4eab0", 7, { k: 0.6 });
    ell(p, 5, 8.3, 2.7, 2.5, G, 6); ell(p, 9.5, 7.8, 2.5, 2.4, G, 5);
    for (const [x, y] of [[13, 10], [16, 12], [11, 9.5], [17, 15]]) ell(p, x + 0.5, y + 0.5, 0.9, 0.6, T(G, -0.3), 9, { flat: true });
    edge(p, OUT);
    ell(p, 4.6, 8.4, 1.2, 1.1, "#f2c14e", 100, { flat: true }); dot(p, 4, 8, "#1d1410", 100); dot(p, 9, 7, "#1d1410", 100);
    fline(p, 2, 12, 8, 12.4, "#2f5a22", 100);
    return p;
  },
};
function doghouse() {
  const p = np(); p.tex = null;
  rect(p, 4, 9, 19, 19, "#c58b4e", 2, { tex: TEX.plank });
  poly(p, [[2, 10], [12, 1], [22, 10], [20, 11], [12, 4], [4, 11]], "#d0453a", 4, { tex: TEX.straw });
  ell(p, 12, 16.5, 3.5, 4.5, "#2b1d14", 5, { flat: true, clip: (x, y) => y <= 19 });
  rect(p, 9, 7, 14, 8, "#f3e2b8", 6, { tex: null });
  ell(p, 20.5, 18.6, 2.4, 1.2, "#5fa8d3", 7, { tex: null }); ell(p, 20.5, 18.2, 1.6, 0.5, "#c8a070", 8, { flat: true });
  edge(p, OUT);
  return p;
}

// The mock's toURL, writing RGBA instead of a canvas: every drawn pixel is snapped to the
// fixed palette, empty pixels stay transparent.
function toRGBA(p) {
  const out = new Uint8Array(p.w * p.h * 4);
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    const c = p.get(x, y);
    if (!c) continue;
    const [r, g, b] = snap(c), i = (y * p.w + x) * 4;
    out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = 255;
  }
  return out;
}

function savePix(p, file) {
  const big = scaleNearest(p.w, p.h, toRGBA(p), PET_SCALE);
  writeFileSync(file, encodePNG(big.width, big.height, big.rgba));
}

function pets() {
  mkdirSync(`${ART_OUT}pets`, { recursive: true });
  for (const [pet, frames] of Object.entries(PET_FRAMES)) for (const f of frames) savePix(PET[pet](f), `${ART_OUT}pets/${pet}-${f}.png`);
  savePix(doghouse(), `${ART_OUT}doghouse.png`);
}

portrait();
cast();
pets();
console.log("wrote portrait, 24 cast pictures, pet frames and the doghouse into", ART_OUT);
