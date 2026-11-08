// Renders the valley behind the panes: art/scene/day-<rows>.png and night-<rows>.png.
// Run: bun scripts/draw-scenes.js
// Ported from the Dewdrop mock (scenery.html). Herdr can't animate a layout background,
// so the moving bits are drawn as one still: the chimney smoke, the tractor in the field
// lane (headlight on at night), a few birds by day and fireflies by night. Only the
// shooting star is left out. Every random number comes from a seeded generator, so each
// run draws the same pixels.
//
// The mock is 320x188 art pixels shown at about 3 screen pixels each. To keep that pixel
// size on any window, the scene is drawn at several heights (SCENE_ROWS in logic.js) and
// the mod picks the one closest to 3 px per art pixel. A taller scene doesn't zoom in: the
// road and fence keep their rows at the bottom, the field gets deeper, the mountains grow
// and the sky gets taller. Sprites (house, trees, tractor, crops) keep their size, and the
// scene is about 2.4 times as wide as it is tall, so the cover fit crops the sides.
import { mkdirSync, writeFileSync } from "node:fs";
import { encodePNG, scaleNearest } from "./png.js";
import { SCENE_ROWS } from "../mods/dewdrop/logic.js";

const OUT = new URL("../mods/dewdrop/art/scene/", import.meta.url).pathname;
// Saved at 6x: an art pixel is 6 device pixels, 3 points on a 2x display.
const SCALE = 6;
const MAX_W = 8192;

const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const B4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const dz = (x, y, f) => f > (B4[y & 3][x & 3] + 0.5) / 16;
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rng = (s) => () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
function noise1(seed) {
  const r = rng(seed), L = Array.from({ length: 512 }, r);
  return (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f), a = L[(i & 511)], b = L[((i + 1) & 511)]; return a + (b - a) * u; };
}
const hash2 = (x, y) => { let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const nf = noise1(7), nm = noise1(19), nh = noise1(31), nt = noise1(55);

class Buf {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8ClampedArray(w * h * 4); }
  set(x, y, c) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; const i = (y * this.w + x) * 4; this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = 255; }
  has(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h && this.d[(y * this.w + x) * 4 + 3] > 0; }
  mix(x, y, c, t) { x = Math.round(x); y = Math.round(y); if (!this.has(x, y)) return; const i = (y * this.w + x) * 4; const m = lerp([this.d[i], this.d[i + 1], this.d[i + 2]], c, t); this.d[i] = m[0]; this.d[i + 1] = m[1]; this.d[i + 2] = m[2]; }
}

// glow: dithered warm halo, strongest at the center
function glow(b, cx, cy, R, c, strength) {
  for (let y = cy - R; y <= cy + R; y++) for (let x = cx - R; x <= cx + R; x++) {
    const d = Math.hypot(x - cx, y - cy); if (d > R) continue;
    const f = (1 - d / R) ** 1.6 * strength;
    if (dz(x & 255, y & 255, f)) b.mix(x, y, c, 0.55);
  }
}

// Where things go in a scene `H` rows tall. At H = 188 every number is the mock's.
function geometry(H) {
  const W = Math.min(Math.round(H * 2.4), Math.floor(MAX_W / SCALE));
  const extra = H - 188;
  const fieldExtra = Math.round(extra * 0.22);
  const sky = extra - fieldExtra; // rows added above the field
  const FT = 122 + sky; // field top
  const ms = 1 + 0.6 * sky / 120; // how much bigger the mountains are
  const kc = 1 + sky / 220; // how far down the clouds and birds spread
  const hh = (x) => FT - 8 + 4 * Math.sin(x / 31) + 3 * Math.sin(x / 12 + 1) + 1.5 * nh(x / 3);
  return { W, H, FT, ms, kc, hh, mid: W / 2, farm: Math.round(W / 2 + 0.33 * H), sun: [Math.round(W / 2 + 0.55 * H), Math.round(30 + sky * 0.25)], moon: [Math.round(W / 2 - 0.55 * H), Math.round(30 + sky * 0.25)] };
}

function buildSky(g, night) {
  const { W, H, FT } = g;
  const b = new Buf(W, H);
  const stops = (night ? ["#060920", "#0c1333", "#151d47", "#212a5a", "#343d72", "#4a4f84"] : ["#3a7bd0", "#5297de", "#72b2ea", "#97cbf1", "#bfe1f6", "#e2f2f8"]).map(hex);
  const n = stops.length;
  for (let y = 0; y < H; y++) {
    const v = Math.min(1, y / (FT - 2)) * (n - 1), lo = Math.floor(v), f = v - lo;
    for (let x = 0; x < W; x++) b.set(x, y, dz(x, y, f) ? stops[Math.min(lo + 1, n - 1)] : stops[lo]);
  }
  if (!night) {
    const [sx, sy] = g.sun;
    glow(b, sx, sy, 34, hex("#fff3cf"), 0.85);
    for (let y = -9; y <= 9; y++) for (let x = -9; x <= 9; x++) { const d = x * x + y * y; if (d <= 81) b.set(sx + x, sy + y, d > 62 ? hex("#ffe27a") : d > 30 ? hex("#fff0a8") : hex("#fffbe2")); }
  } else {
    // milky way: a faint band across the sky
    const k = (FT - 2) / 120, top = 100 * k, width = 13 * Math.sqrt(k);
    for (let y = 0; y < top; y++) for (let x = 0; x < W; x++) {
      const dist = Math.abs(y - (8 * k + (x / W) * 83 * k)), f = Math.exp(-(dist ** 2) / (2 * width ** 2)) * (0.35 + 0.35 * nt(x / 9 + y / 7));
      if (dz(x, y, f)) b.mix(x, y, hex("#4c5a9e"), 0.5);
    }
    const [mx, my] = g.moon;
    glow(b, mx, my, 32, hex("#6c75b0"), 0.7);
    for (let y = -10; y <= 10; y++) for (let x = -10; x <= 10; x++) { const d = x * x + y * y; if (d <= 100) b.set(mx + x, my + y, d > 84 ? hex("#ddd5ae") : hex("#f6f0d4")); }
    for (const [cx, cy, r] of [[-3, -2, 2.2], [3, 3, 1.6], [4, -4, 1.2], [-4, 5, 1]]) for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y <= r * r) b.set(mx + cx + x, my + cy + y, hex("#ddd4ac"));
  }
  return b;
}

function buildLand(g, night) {
  const { W, H, FT, ms, hh } = g;
  const b = new Buf(W, H);
  const G = night ? (c) => [c[0] * 0.3 + 8, c[1] * 0.36 + 12, c[2] * 0.5 + 38] : (c) => c;
  const C = (s) => G(hex(s));
  const emit = [];
  const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) b.set(x + i, y + j, c); };

  // mist: fade toward a pale haze in a few dithered steps, so the bottom of each range sits back
  const mist = C("#dcecf4");
  const haze = (c, x, y, t) => { t = Math.max(0, Math.min(1, t)); const q = Math.floor(t * 4) / 4, f = t * 4 - Math.floor(t * 4); return lerp(c, mist, dz(x, y, f) ? Math.min(1, q + 0.25) : q); };

  // mountains are drawn as overlapping peaks, back to front. Each peak paints its own lit (sun side, right)
  // and shaded face, so the spurs in front of a big peak read as separate ridges.
  // A peak: { x, top, l, r (slopes), z (0 back .. 1 front) }. A taller scene scales the
  // ranges by ms in both directions, so they keep their shape.
  const rr = rng(2024);
  const between = (a, b) => a + (b - a) * rr();
  function makeRange(count, env, slope, spurs) {
    const out = [];
    let x = -between(10, 30) * ms;
    while (x < W + 30 * ms) {
      const top = env(x) + between(-6, 6) * ms;
      out.push({ x, top, l: between(slope[0], slope[1]), r: between(slope[0], slope[1]), z: 0 });
      // shoulders and spurs: smaller peaks in front, lower down, either side
      const n = Math.floor(between(spurs[0], spurs[1] + 0.99));
      for (let i = 0; i < n; i++) {
        const side = rr() < 0.5 ? -1 : 1, off = between(6, 22) * side * ms;
        out.push({ x: x + off, top: top + between(8, 22) * ms, l: between(slope[0], slope[1]) * 1.15, r: between(slope[0], slope[1]) * 1.15, z: between(0.3, 1) });
      }
      x += between(count[0], count[1]) * ms;
    }
    return out.sort((a, b) => a.z - b.z);
  }
  const n2 = (x, y) => hash2(Math.floor(x), Math.floor(y));
  function paintRange(peaks, pal, bottom, jag, snowOn, hazeFrom) {
    const tops = new Array(W).fill(H);
    for (const p of peaks) {
      const lit = pal.lit, shade = pal.shade;
      const tone = (c) => lerp(c, pal.near, p.z * 0.35);
      for (let x = Math.floor(p.x - (bottom - p.top) / p.l); x <= p.x + (bottom - p.top) / p.r; x++) {
        if (x < 0 || x >= W) continue;
        const d = x < p.x ? (p.x - x) * p.l : (x - p.x) * p.r;
        const top = Math.round(p.top + d + jag * (nf(x / 1.9 + p.x) - 0.5) * Math.min(1, d / 6));
        const onLit = x >= p.x;
        tops[x] = Math.min(tops[x], top);
        for (let y = top; y < bottom; y++) {
          let c = tone(onLit ? lit : shade);
          // rock streaks run down the fall line, a little darker on the shaded face
          const s = nf((x + (y - top) * (onLit ? -0.55 : 0.55)) / 2.6 + p.x * 3);
          if (s > 0.74) c = tone(onLit ? pal.litDark : pal.deep);
          // a soft rim of light down the sunny edge of the ridge
          if (onLit && x - p.x < 2 && y - top < 14 && dz(x, y, 0.5)) c = tone(lit);
          // snow cap with a ragged lower edge and a few streaks lower down
          if (snowOn && p.top < snowOn) {
            const depth = (snowOn - p.top) * 0.55 + 4 * nf(x / 2.2 + 9) + 3 * n2(x / 2, 7);
            const streak = s > 0.68 && y - top < depth + 7 && n2(x, y / 3) > 0.5;
            if (y - p.top < depth || streak) c = onLit ? pal.snow : pal.snowSh;
          }
          if (y === top) c = lerp(c, [255, 255, 255], onLit ? 0.35 : 0.08);
          c = haze(c, x, y, (y - hazeFrom) / (bottom - hazeFrom) * 0.6);
          b.set(x, y, c);
        }
      }
    }
    return tops;
  }

  // far range. Its envelope: one tall massif left of center, a second high group on the
  // right, a saddle between, and on a wide scene two lower groups further out.
  const FB = FT - 2;
  const bump = (x, c, w, a) => a * Math.exp(-(((x - c) / (w * ms)) ** 2));
  const { mid } = g;
  const farBase = (x) => 62 - bump(x, mid - 42 * ms, 46, 34) - bump(x, mid + 76 * ms, 34, 22)
    - bump(x, mid - 250 * ms, 40, 24) - bump(x, mid + 250 * ms, 44, 20) - 8 * Math.sin(x / (23 * ms) + 1);
  const FAR = makeRange([26, 62], (x) => FB - (120 - farBase(x)) * ms, [0.48, 0.95], [1, 3]);
  paintRange(FAR, { lit: C("#b6c9e8"), litDark: C("#9db2db"), shade: C("#7d92c2"), deep: C("#6b7fb2"), near: C("#8a9ccc"),
    snow: C("#f7faff"), snowSh: C("#c6d1ee") }, FB, 3, FB - 64 * ms, FB - 50 * ms);

  // middle range: rounder forested ridges with pine tips on the skyline
  const midBase = (x) => 88 - 6 * Math.sin(x / (37 * ms) + 0.4) - 5 * Math.sin(x / (14.7 * ms) + 2.1);
  const MID = makeRange([30, 58], (x) => FT - (122 - midBase(x)) * ms, [0.3, 0.55], [0, 1]);
  const midTops = paintRange(MID, { lit: C("#679d92"), litDark: C("#55897f"), shade: C("#47767a"), deep: C("#3c676c"), near: C("#3f7266"),
    snow: C("#eef5f8"), snowSh: C("#c8dbe2") }, FT, 2, FT - 44 * ms, FT - 22 * ms);
  // pine tips along the mid skyline
  for (let x = 1; x < W; x += 2 + Math.floor(hash2(x, 5) * 3)) {
    const top = midTops[x] - 1;
    if (top > FT - 10) continue;
    const h = 2 + Math.floor(hash2(x, 11) * 3);
    for (let i = 0; i < h; i++) b.set(x, top - i, haze(C(i ? "#2f5a59" : "#3b6d68"), x, top, (top - (FT - 22)) / 22 * 0.85));
  }
  // rolling hills
  const hill = C("#64ad4d"), hillTop = C("#8acb60"), hillSh = C("#549c44");
  for (let x = 0; x < W; x++) {
    const top = Math.round(hh(x));
    for (let y = top; y < FT + 4; y++) b.set(x, y, y === top ? hillTop : nh(x / 5 + y / 3) > 0.68 ? hillSh : hill);
  }
  // treeline, clear of the farm
  const fx = g.farm, F = (x) => fx - 222 + x;
  const r = rng(42);
  const trees = Array.from({ length: Math.round(46 * W / 320) }, () => ({ x: Math.floor(r() * W), k: r(), s: r() })).sort((a, b) => hh(a.x) - hh(b.x));
  for (const t of trees) {
    if (t.x > F(196) && t.x < F(282)) continue;
    const base = Math.round(hh(t.x)) + 2;
    if (t.k < 0.42) { // conifer
      const h = 9 + Math.floor(t.s * 7);
      for (let i = 0; i < h; i++) { const hw = Math.floor(i * 0.36) - (i % 4 === 3 ? 1 : 0); for (let dx = -hw; dx <= hw; dx++) b.set(t.x + dx, base - h - 1 + i, dx < 0 ? C("#3f8a4a") : dx === hw ? C("#24573a") : C("#2e6b3e")); }
      b.set(t.x, base - 1, C("#6b4423")); b.set(t.x, base, C("#6b4423"));
    } else {
      const blossom = t.k > 0.84, rad = 3 + Math.floor(t.s * 3), cy = base - rad - 3;
      const [li, mi, dk] = blossom ? ["#ffd0e1", "#f3a6c4", "#cf7aa0"] : ["#76c35a", "#47963f", "#2f7432"];
      for (let y = cy + rad - 1; y <= base; y++) b.set(t.x, y, C("#6b4423"));
      for (let y = -rad; y <= rad; y++) for (let x = -rad - 1; x <= rad + 1; x++) {
        const d = (x / (rad + 1)) ** 2 + (y / rad) ** 2; if (d > 1) continue;
        b.set(t.x + x, cy + y, C(x + y < -rad * 0.5 ? li : d > 0.7 && x + y > 0 ? dk : mi));
      }
      if (blossom) for (let i = 0; i < 4; i++) b.set(t.x - rad + Math.floor(r() * rad * 2), cy - rad + 1 + Math.floor(r() * rad * 2 - 1), C("#ffffff"));
    }
  }
  // farmhouse, barn and silo on the hill
  const hb = Math.round(hh(fx)) + 3;
  rect(F(212), hb - 11, 20, 11, C("#dca86f"));
  for (let j = 1; j < 11; j += 3) rect(F(212), hb - 11 + j, 20, 1, C("#c08955"));
  for (let j = 0; j < 8; j++) { const w = 6 + j * 2; rect(F(222) - w / 2, hb - 19 + j, w, 1, C(j === 7 ? "#8e3029" : j % 2 ? "#b8463b" : "#cc5848")); }
  rect(F(215), hb - 21, 3, 6, C("#7d5236")); rect(F(215), hb - 22, 3, 1, C("#5e3b26"));
  rect(F(220), hb - 6, 4, 6, C("#76472a")); rect(F(223), hb - 3, 1, 1, C("#e8c04a"));
  const winC = night ? hex("#ffd47a") : C("#a6dcf6");
  for (const wx of [F(214), F(226)]) { rect(wx - 1, hb - 9, 5, 5, C("#7a4a2a")); rect(wx, hb - 8, 3, 3, winC); if (night) emit.push([wx + 1, hb - 7, 11]); }
  rect(F(250), hb - 12, 18, 12, C("#b43a31"));
  for (let j = 0; j < 6; j++) { const w = 10 + j * 2; rect(F(259) - w / 2, hb - 18 + j, w, 1, C(j % 2 ? "#7c2a24" : "#8f322b")); }
  rect(F(255), hb - 8, 8, 8, C("#f3e2b8")); rect(F(256), hb - 7, 6, 6, C("#9b3029"));
  for (let i = 0; i < 6; i++) { b.set(F(256) + i, hb - 7 + i, C("#f3e2b8")); b.set(F(261) - i, hb - 7 + i, C("#f3e2b8")); }
  rect(F(271), hb - 20, 6, 20, C("#c9c4bb")); for (let j = 0; j < 20; j += 4) rect(F(271), hb - 20 + j, 6, 1, C("#a8a399"));
  rect(F(272), hb - 22, 4, 2, C("#8d8a84")); rect(F(273), hb - 23, 2, 1, C("#8d8a84"));

  // field: patchwork crop rows, spaced wider toward the viewer. The crop kinds come in
  // bands of 320 columns, as in the mock.
  const LANE = H - 37;
  for (let y = FT; y < H - 31; y++) for (let x = 0; x < W; x++) b.set(x, y, nh(x / 4 + y * 1.3) > 0.72 ? C("#64b24c") : C("#72bf55"));
  let y = FT + 2, k = 0;
  while (y < H - 34) {
    const th = k > 3 ? 2 : 1, cr = Math.min(5, 1 + Math.floor(k / 2)), sp = Math.min(7, 3 + Math.floor(k / 2));
    for (let x = 0; x < W; x++) { b.set(x, y, C("#a56c3e")); if (th > 1) b.set(x, y + 1, C("#83532f")); }
    for (let x = (k * 2) % sp; x < W; x += sp) {
      const zone = (x % 320) + 10 * Math.sin(k * 1.3);
      const type = zone < 78 ? "leaf" : zone < 150 ? "wheat" : zone < 226 ? "cabbage" : "pumpkin";
      if (type === "leaf") for (let j = 0; j < cr + 1; j++) b.set(x, y - 1 - j, C(j === cr ? "#8fdc62" : "#3f9a3a"));
      if (type === "wheat") for (let j = 0; j < cr + 2; j++) b.set(x, y - 1 - j, C(j >= cr ? "#f7dc7a" : "#c9a23a"));
      if (type === "cabbage") for (let j = 0; j < cr; j++) for (let i = -Math.ceil(cr / 2); i <= Math.floor(cr / 2); i++) b.set(x + i, y - 1 - j, C(j === cr - 1 ? "#b6e78a" : "#6cc067"));
      if (type === "pumpkin") { for (let j = 0; j < cr; j++) for (let i = 0; i <= cr; i++) b.set(x + i, y - 1 - j, C(i === 0 && j === cr - 1 ? "#ffbf6a" : "#e9852b")); b.set(x + 1, y - 1 - cr, C("#3f8a3a")); }
    }
    y += Math.min(9, 3 + Math.round(k * 0.8)); k++;
  }
  // a dirt lane along the bottom of the field, where the tractor drives
  for (let x = 0; x < W; x++) for (let yy = LANE; yy < LANE + 5; yy++) {
    const n = hash2(x, yy - LANE + 191);
    b.set(x, yy, C(yy === LANE ? "#83532f" : n < 0.1 ? "#93603a" : n > 0.93 ? "#c99563" : "#ad7848"));
  }
  // wildflowers
  for (let yy = H - 32; yy < H - 27; yy++) for (let x = 0; x < W; x++) b.set(x, yy, C("#5aa646"));
  const rf = rng(77), FL = ["#ffffff", "#ffd84a", "#ff9ec4", "#b994f2", "#ff7a6a"];
  for (let i = 0; i < Math.round(120 * W / 320); i++) { const x = Math.floor(rf() * W), yy = H - 33 + Math.floor(rf() * 6); b.set(x, yy, C(FL[Math.floor(rf() * FL.length)])); if (rf() > 0.6) b.set(x, yy + 1, C("#3f8a3a")); }
  // fence, with a lamp on every fourth post at night
  for (let x = 0; x < W; x++) { b.set(x, H - 29, C("#c0864d")); b.set(x, H - 28, C("#6b4423")); b.set(x, H - 25, C("#c0864d")); b.set(x, H - 24, C("#6b4423")); }
  for (let x = 3, i = 0; x < W; x += 14, i++) {
    rect(x, H - 32, 3, 11, C("#8a5a2b")); rect(x, H - 32, 1, 11, C("#c58b4e")); rect(x, H - 32, 3, 1, C("#5e3b1d"));
    if (night && i % 4 === 1) { rect(x, H - 37, 3, 5, hex("#3a2718")); rect(x, H - 36, 3, 3, hex("#ffe08a")); emit.push([x + 1, H - 35, 16]); }
  }
  // road with ruts and pebbles: the last 21 rows, under the hotbar
  const RT = H - 21;
  for (let yy = RT; yy < H; yy++) for (let x = 0; x < W; x++) {
    const n = hash2(x, yy - RT + 167);
    let c = n < 0.08 ? "#b38a55" : n > 0.95 ? "#e0bd8b" : "#caa36c";
    const ry = yy - RT;
    if ((ry === 7 || ry === 8 || ry === 15 || ry === 16) && dz(x, yy, 0.55)) c = "#a9804b";
    b.set(x, yy, C(c));
  }
  for (let x = 0; x < W; x++) { b.set(x, RT, C(hash2(x, 3) > 0.45 ? "#5aa645" : "#8f6a3f")); if (hash2(x, 9) > 0.75) b.set(x, RT + 1, C("#5aa645")); }
  const rp = rng(91);
  for (let i = 0; i < Math.round(34 * W / 320); i++) { const x = Math.floor(rp() * W), yy = RT + 3 + Math.floor(rp() * 17); b.set(x, yy, C("#a39b8e")); b.set(x, yy - 1, C("#d2cbbd")); }

  for (const [x, yy, R] of emit) glow(b, x, yy, R, hex("#e8a54a"), 0.9);
  return { b, chimney: [F(216), hb - 23] };
}

// The mock's moving bits, as they stand at one moment.
function clouds(g, out, night) {
  const defs = [[20, 22, 1.1], [120, 14, 1.4], [210, 40, 0.9], [290, 26, 1.2], [70, 52, 0.7]];
  const P = night ? ["#7d88ba", "#3b4576", "#2e3665", "#252c55"] : ["#ffffff", "#f3f8fd", "#d2e5f3", "#b5cfe6"];
  const cols = P.map(hex), blobs = [[0, 0, 7], [8, -4, 9], [18, -1, 7], [26, 1, 5], [-8, 2, 5]];
  for (let tile = 0; tile * 320 < g.W + 45; tile++) for (const [x0, cy0, s] of defs) {
    const cx = x0 + tile * 320 - 45 + Math.round((hash2(tile, x0) - 0.5) * 60), cy = Math.round(cy0 * g.kc + (hash2(x0, tile) - 0.5) * 10);
    const inside = (x, y) => y <= cy + 4 * s && blobs.some(([bx, by, r]) => (x - cx - bx * s) ** 2 + (y - cy - by * s) ** 2 <= (r * s) ** 2);
    for (let y = Math.floor(cy - 14 * s); y <= cy + 5 * s; y++) for (let x = Math.floor(cx - 14 * s); x <= cx + 34 * s; x++) {
      if (!inside(x, y)) continue;
      const c = !inside(x, y - 2) ? 0 : !inside(x, y + 2) ? 3 : !inside(x, y + 4) ? 2 : 1;
      out.set(x, y, cols[c]);
    }
  }
}
function stars(g, out) {
  const k = (g.FT - 2) / 120, r = rng(123);
  const count = Math.round(170 * (g.W / 320) * k);
  for (let i = 0; i < count; i++) {
    const x = Math.floor(r() * g.W), y = Math.floor(r() * 95 * k), p = r() * 6.28, big = r() > 0.93, warm = r() > 0.8;
    if (Math.hypot(x - g.moon[0], y - g.moon[1]) < 16) continue;
    const tw = 0.5 + 0.5 * Math.sin(p);
    const c = hex(warm ? "#fff2c4" : "#dfe6ff"), cd = lerp(c, [40, 50, 100], 0.6);
    out.set(x, y, tw > 0.35 ? c : cd);
    if (big && tw > 0.6) { out.set(x - 1, y, cd); out.set(x + 1, y, cd); out.set(x, y - 1, cd); out.set(x, y + 1, cd); }
  }
}
function smoke(out, night, ch, t) {
  for (let i = 0; i < 5; i++) {
    const a = ((t * 0.5 + i / 5) % 1), x = ch[0] + 1 + Math.sin(a * 5 + i) * 2 + a * 10, y = ch[1] - a * 26, r = 1 + a * 2.4;
    const c = hex(night ? "#55608f" : "#eef1f3");
    for (let yy = -3; yy <= 3; yy++) for (let xx = -3; xx <= 3; xx++) if (xx * xx + yy * yy <= r * r && dz((x + xx) & 255, (y + yy) & 255, 1 - a * 0.7)) out.set(x + xx, y + yy, c);
  }
}
// Two flocks of three in every 640 columns, wings caught in both positions.
function birds(g, out) {
  const c = hex("#2b3a55");
  for (let tile = 0; tile * 640 < g.W; tile++) for (const [x0, y0] of [[88, 34], [404, 46]]) for (let i = 0; i < 3; i++) {
    const x = tile * 640 + x0 + i * 6, y = Math.round(y0 * g.kc) + (i % 2) * 3, up = i !== 1;
    out.set(x, y, c); out.set(x - 1, y - (up ? 1 : 0), c); out.set(x + 1, y - (up ? 1 : 0), c); out.set(x - 2, y - (up ? 1 : 0), c); out.set(x + 2, y - (up ? 1 : 0), c);
  }
}
function fireflies(g, out) {
  const top = g.FT + 6, span = Math.max(8, g.H - 30 - top);
  for (let i = 0; i < Math.round(18 * g.W / 320); i++) {
    const x = (i * 53 + Math.sin(i) * 14 + 400) % g.W, y = top + (i * 17) % span + Math.sin(i * 2) * 4;
    if (Math.sin(i * 1.7) < -0.2) continue;
    out.set(x, y, hex("#f0ff9c")); out.mix(x + 1, y, hex("#9aa85a"), 0.5); out.mix(x - 1, y, hex("#9aa85a"), 0.5);
  }
}

// The tractor, drawn in code facing right, as in the mock.
const TW = 31, TH = 21;
const TC = { tyre: "#262626", lug: "#4a4a4a", rim: "#f2c14e", disk: "#c9962e", hub: "#6b4420", red: "#d0453a", redHi: "#ef7b66", redLo: "#8e2f27", fender: "#a8352c",
  roof: "#f3e2b8", roofLo: "#cdb68a", glass: "#9fd6f2", shine: "#eefaff", steel: "#555555", steelDk: "#2b2b2b", gold: "#f2c14e", lamp: "#fff1a8",
  hat: "#e9c46a", skin: "#f0b98a", shirt: "#3d6fb4", line: "#2a1a14" };
function tractorPixels(dist, bump) {
  const body = new Map(), wheels = new Map(), put = (m, x, y, c) => m.set(x + "," + y, [x, y, c]);
  const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(body, x, y, c); };
  // cab with the farmer inside
  rect(3, -1, 14, 11, TC.red); rect(5, -1, 12, 4, TC.glass);
  rect(2, -3, 15, -3, TC.roof); rect(2, -2, 15, -2, TC.roofLo);
  rect(7, 0, 9, 0, TC.hat); rect(6, 1, 10, 1, TC.hat); rect(7, 2, 9, 3, TC.skin); put(body, 8, 2, TC.line); rect(6, 4, 10, 4, TC.shirt); rect(11, 3, 12, 3, TC.steelDk);
  put(body, 12, -1, TC.shine); put(body, 11, -1, TC.shine); put(body, 12, 0, TC.shine);
  // hood, stripe, grille, lamp
  rect(14, 9, 28, 14, TC.red); rect(14, 9, 27, 9, TC.redHi); rect(14, 14, 28, 14, TC.redLo); body.delete("28,9");
  rect(16, 12, 26, 12, TC.gold);
  for (let y = 10; y <= 14; y++) put(body, 29, y, y % 2 ? TC.steel : TC.steelDk);
  put(body, 28, 10, TC.lamp);
  // exhaust stack and chassis
  rect(19, 1, 20, 8, TC.steel); rect(18, 0, 21, 0, TC.steelDk); rect(12, 15, 27, 16, TC.steel);
  // fender over the big wheel
  for (let y = 5; y <= 12; y++) for (let x = -1; x <= 18; x++) {
    const d = Math.hypot(x + 0.5 - 8.5, y + 0.5 - 13.5);
    if (d > 7.4 && d <= 9.2) put(body, x, y, d > 8.4 ? TC.red : TC.fender);
  }
  const wheel = (cx, cy, R) => {
    const tw = R > 5 ? 2.2 : 1.3, spin = dist / R;
    for (let y = Math.floor(cy - R - 1); y <= cy + R + 1; y++) for (let x = Math.floor(cx - R - 1); x <= cx + R + 1; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy);
      if (d > R) continue;
      const ang = Math.atan2(dy, dx) - spin, turn = ((ang / (2 * Math.PI)) % 1 + 1) % 1;
      let c;
      if (d > R - 1) c = Math.floor(turn * (R > 5 ? 14 : 8)) % 2 ? TC.lug : TC.tyre;
      else if (d > R - tw) c = TC.tyre;
      else if (d > R - tw - 1) c = TC.rim;
      else if (d > 1.5) c = (turn * 4) % 1 < 0.2 ? TC.rim : TC.disk;
      else c = TC.hub;
      put(wheels, x, y, c);
    }
  };
  wheel(8.5, 13.5, 7); wheel(25, 17, 4);
  const all = new Map();
  for (const [x, y, c] of body.values()) put(all, x, y - bump, c);
  for (const v of wheels.values()) put(all, v[0], v[1], v[2]);
  const px = [...all.values()];
  for (const [x, y] of [...all.values()]) for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const k = (x + ox) + "," + (y + oy);
    if (!all.has(k)) { all.set(k, null); px.push([x + ox, y + oy, TC.line]); }
  }
  return px;
}
// The tractor heading right along the lane, left of the farm, puffing from its stack.
function tractor(g, out, night) {
  const e = 2.3, dist = e * 16;
  const x0 = Math.round(g.mid - 0.3 * g.H), yb = g.H - 33, y0 = yb - TH;
  const X = (x) => x0 + x;
  const dim = (c) => night ? lerp(hex(c), [20, 26, 58], 0.45) : hex(c);
  for (let i = 1; i < TW - 1; i++) out.mix(X(i), yb + 1, [60, 40, 20], 0.35);
  for (const [x, y, c] of tractorPixels(dist, 0)) out.set(X(x), y0 + y, c === TC.lamp && night ? hex("#fff6c8") : dim(c));
  const sx = X(19.5), sy = y0 - 2;
  for (let i = 0; i < 4; i++) {
    const a = ((e * 1.4 + i / 4) % 1), cx = Math.round(sx - a * 14), cy = Math.round(sy - a * 12), r = 0.8 + a * 2;
    for (let yy = -3; yy <= 3; yy++) for (let xx = -3; xx <= 3; xx++) if (xx * xx + yy * yy <= r * r && dz((cx + xx + 64) & 255, (cy + yy + 64) & 255, 1 - a)) out.set(cx + xx, cy + yy, hex(night ? "#4a5280" : "#d9d6cf"));
  }
  if (night) {
    const hx = X(29), hy = y0 + 10;
    for (let d = 2; d < 28; d++) for (let v = -Math.floor(d / 3); v <= Math.floor(d / 4); v++) if (dz((hx + d) & 255, (hy + v) & 255, 0.5 * (1 - d / 28))) out.mix(hx + d, hy + v, hex("#fff1b0"), 0.5);
  }
}

function scene(H, night) {
  const g = geometry(H);
  const sky = buildSky(g, night), { b: land, chimney } = buildLand(g, night), out = new Buf(g.W, g.H);
  out.d.set(sky.d);
  if (night) stars(g, out);
  clouds(g, out, night);
  const L = land.d, O = out.d;
  for (let i = 0; i < L.length; i += 4) if (L[i + 3]) { O[i] = L[i]; O[i + 1] = L[i + 1]; O[i + 2] = L[i + 2]; }
  smoke(out, night, chimney, 0.35);
  tractor(g, out, night);
  if (night) fireflies(g, out); else birds(g, out);
  return { W: g.W, H: g.H, rgba: O };
}

mkdirSync(OUT, { recursive: true });
for (const rows of SCENE_ROWS) for (const [look, night] of [["day", false], ["night", true]]) {
  const s = scene(rows, night);
  const big = scaleNearest(s.W, s.H, new Uint8Array(s.rgba.buffer), SCALE);
  const bytes = encodePNG(big.width, big.height, big.rgba);
  writeFileSync(`${OUT}${look}-${rows}.png`, bytes);
  console.log(`wrote scene/${look}-${rows}.png ${big.width}x${big.height} (${bytes.length} bytes)`);
}
