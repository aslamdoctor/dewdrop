// Renders the valley behind the panes: scene-day.png and scene-night.png.
// Run: bun scripts/draw-scenes.js
// Ported from the Dewdrop mock (scenery.html): the sky, the two mountain ranges, hills, trees,
// farm, field, fence and road, plus the clouds and stars as they stand at t = 0. The moving bits
// (tractor, birds, fireflies, chimney smoke, the shooting star) are left out. Every random
// number comes from a seeded generator, so each run draws the same pixels.
import { writeFileSync } from "node:fs";
import { encodePNG, scaleNearest } from "./png.js";

const OUT = new URL("../mods/dewdrop/art/", import.meta.url).pathname;
// 320x188 art pixels, saved at 16x (5120x3008) so a 2x display shows crisp cells.
const SCALE = 16;

const W = 320, H = 188;
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

class Buf {
  constructor() { this.d = new Uint8ClampedArray(W * H * 4); }
  set(x, y, c) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4; this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = 255; }
  has(x, y) { return x >= 0 && y >= 0 && x < W && y < H && this.d[(y * W + x) * 4 + 3] > 0; }
  mix(x, y, c, t) { x = Math.round(x); y = Math.round(y); if (!this.has(x, y)) return; const i = (y * W + x) * 4; const m = lerp([this.d[i], this.d[i + 1], this.d[i + 2]], c, t); this.d[i] = m[0]; this.d[i + 1] = m[1]; this.d[i + 2] = m[2]; }
}

// glow: dithered warm halo, strongest at the center
function glow(b, cx, cy, R, c, strength) {
  for (let y = cy - R; y <= cy + R; y++) for (let x = cx - R; x <= cx + R; x++) {
    const d = Math.hypot(x - cx, y - cy); if (d > R) continue;
    const f = (1 - d / R) ** 1.6 * strength;
    if (dz(x & 255, y & 255, f)) b.mix(x, y, c, 0.55);
  }
}

const nf = noise1(7), nm = noise1(19), nh = noise1(31), nt = noise1(55);
const hf = (x) => 56 + 15 * Math.sin(x / 41 + 0.6) + 8 * Math.sin(x / 15.3 + 2) + 6 * nf(x / 6) + 2 * nf(x / 2.1);
const hm = (x) => 86 + 10 * Math.sin(x / 27 + 2.3) + 6 * Math.sin(x / 10.1) + 3 * nm(x / 4);
const hh = (x) => 114 + 4 * Math.sin(x / 31) + 3 * Math.sin(x / 12 + 1) + 1.5 * nh(x / 3);

function buildSky(night) {
  const b = new Buf();
  const stops = (night ? ["#060920", "#0c1333", "#151d47", "#212a5a", "#343d72", "#4a4f84"] : ["#3a7bd0", "#5297de", "#72b2ea", "#97cbf1", "#bfe1f6", "#e2f2f8"]).map(hex);
  const n = stops.length;
  for (let y = 0; y < H; y++) {
    const v = Math.min(1, y / 120) * (n - 1), lo = Math.floor(v), f = v - lo;
    for (let x = 0; x < W; x++) b.set(x, y, dz(x, y, f) ? stops[Math.min(lo + 1, n - 1)] : stops[lo]);
  }
  if (!night) {
    const [sx, sy] = [262, 30];
    glow(b, sx, sy, 34, hex("#fff3cf"), 0.85);
    for (let y = -9; y <= 9; y++) for (let x = -9; x <= 9; x++) { const d = x * x + y * y; if (d <= 81) b.set(sx + x, sy + y, d > 62 ? hex("#ffe27a") : d > 30 ? hex("#fff0a8") : hex("#fffbe2")); }
  } else {
    // milky way: a faint band across the sky
    for (let y = 0; y < 100; y++) for (let x = 0; x < W; x++) {
      const dist = Math.abs(y - (8 + x * 0.26)) , f = Math.exp(-(dist ** 2) / (2 * 13 ** 2)) * (0.35 + 0.35 * nt(x / 9 + y / 7));
      if (dz(x, y, f)) b.mix(x, y, hex("#4c5a9e"), 0.5);
    }
    const [mx, my] = [56, 30];
    glow(b, mx, my, 32, hex("#6c75b0"), 0.7);
    for (let y = -10; y <= 10; y++) for (let x = -10; x <= 10; x++) { const d = x * x + y * y; if (d <= 100) b.set(mx + x, my + y, d > 84 ? hex("#ddd5ae") : hex("#f6f0d4")); }
    for (const [cx, cy, r] of [[-3, -2, 2.2], [3, 3, 1.6], [4, -4, 1.2], [-4, 5, 1]]) for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y <= r * r) b.set(mx + cx + x, my + cy + y, hex("#ddd4ac"));
  }
  return b;
}

function buildLand(night) {
  const b = new Buf();
  const G = night ? (c) => [c[0] * 0.3 + 8, c[1] * 0.36 + 12, c[2] * 0.5 + 38] : (c) => c;
  const C = (s) => G(hex(s));
  const emit = [];

  // mist: fade toward a pale haze in a few dithered steps, so the bottom of each range sits back
  const mist = C("#dcecf4");
  const haze = (c, x, y, t) => { t = Math.max(0, Math.min(1, t)); const q = Math.floor(t * 4) / 4, f = t * 4 - Math.floor(t * 4); return lerp(c, mist, dz(x, y, f) ? Math.min(1, q + 0.25) : q); };

  // mountains are drawn as overlapping peaks, back to front. Each peak paints its own lit (sun side, right)
  // and shaded face, so the spurs in front of a big peak read as separate ridges.
  // A peak: { x, top, l, r (slopes), z (0 back .. 1 front), snow (depth) }
  const rr = rng(2024);
  const between = (a, b) => a + (b - a) * rr();
  function makeRange(count, env, slope, spurs) {
    const out = [];
    let x = -between(10, 30);
    while (x < W + 30) {
      const top = env(x) + between(-6, 6);
      const p = { x, top, l: between(slope[0], slope[1]), r: between(slope[0], slope[1]), z: 0 };
      out.push(p);
      // shoulders and spurs: smaller peaks in front, lower down, either side
      const n = Math.floor(between(spurs[0], spurs[1] + 0.99));
      for (let i = 0; i < n; i++) {
        const side = rr() < 0.5 ? -1 : 1, off = between(6, 22) * side;
        out.push({ x: x + off, top: top + between(8, 22), l: between(slope[0], slope[1]) * 1.15, r: between(slope[0], slope[1]) * 1.15, z: between(0.3, 1) });
      }
      x += between(count[0], count[1]);
    }
    return out.sort((a, b) => a.z - b.z);
  }
  // envelope: one tall massif left of center, a second high group on the right, a saddle between
  const farEnv = (x) => 62 - 34 * Math.exp(-(((x - 118) / 46) ** 2)) - 22 * Math.exp(-(((x - 236) / 34) ** 2)) - 8 * Math.sin(x / 23 + 1);
  const FAR = makeRange([26, 62], farEnv, [0.48, 0.95], [1, 3]);
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
            const depth = (snowOn - p.top) * 0.55 + 4 * nf(x / 2.2 + 9) + 3 * n2(x / 2, 7) ;
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
  paintRange(FAR, { lit: C("#b6c9e8"), litDark: C("#9db2db"), shade: C("#7d92c2"), deep: C("#6b7fb2"), near: C("#8a9ccc"),
    snow: C("#f7faff"), snowSh: C("#c6d1ee") }, 120, 3, 56, 70);

  // middle range: rounder forested ridges with pine tips on the skyline
  const midEnv = (x) => 88 - 6 * Math.sin(x / 37 + 0.4) - 5 * Math.sin(x / 14.7 + 2.1);
  const MID = makeRange([30, 58], midEnv, [0.3, 0.55], [0, 1]);
  const midTops = paintRange(MID, { lit: C("#679d92"), litDark: C("#55897f"), shade: C("#47767a"), deep: C("#3c676c"), near: C("#3f7266"),
    snow: C("#eef5f8"), snowSh: C("#c8dbe2") }, 122, 2, 78, 100);
  // pine tips along the mid skyline
  for (let x = 1; x < W; x += 2 + Math.floor(hash2(x, 5) * 3)) {
    const top = midTops[x] - 1;
    if (top > 112) continue;
    const h = 2 + Math.floor(hash2(x, 11) * 3);
    for (let i = 0; i < h; i++) b.set(x, top - i, haze(C(i ? "#2f5a59" : "#3b6d68"), x, top, (top - 100) / 22 * 0.85));
  }
  // rolling hills
  const hill = C("#64ad4d"), hillTop = C("#8acb60"), hillSh = C("#549c44");
  for (let x = 0; x < W; x++) {
    const top = Math.round(hh(x));
    for (let y = top; y < 126; y++) b.set(x, y, y === top ? hillTop : nh(x / 5 + y / 3) > 0.68 ? hillSh : hill);
  }
  // treeline
  const r = rng(42);
  const trees = Array.from({ length: 46 }, () => ({ x: Math.floor(r() * W), k: r(), s: r() })).sort((a, b) => hh(a.x) - hh(b.x));
  for (const t of trees) {
    if (t.x > 196 && t.x < 282) continue;
    const base = Math.round(hh(t.x)) + 2;
    if (t.k < 0.42) { // conifer
      const h = 9 + Math.floor(t.s * 7);
      for (let i = 0; i < h; i++) { const hw = Math.floor(i * 0.36) - (i % 4 === 3 ? 1 : 0); for (let dx = -hw; dx <= hw; dx++) b.set(t.x + dx, base - h - 1 + i, dx < 0 ? C("#3f8a4a") : dx === hw ? C("#24573a") : C("#2e6b3e")); }
      b.set(t.x, base - 1, C("#6b4423")); b.set(t.x, base, C("#6b4423"));
    } else {
      const blossom = t.k > 0.84, rad = 3 + Math.floor(t.s * 3), cy = base - rad - 3;
      const [li, mi, dk] = blossom ? ["#ffd0e1", "#f3a6c4", "#cf7aa0"] : ["#76c35a", "#47963f", "#2f7432"];
      for (let x = t.x - 1; x <= t.x + 1; x += 2) for (let y = cy + rad - 1; y <= base; y++) b.set(t.x, y, C("#6b4423"));
      for (let y = -rad; y <= rad; y++) for (let x = -rad - 1; x <= rad + 1; x++) {
        const d = (x / (rad + 1)) ** 2 + (y / rad) ** 2; if (d > 1) continue;
        b.set(t.x + x, cy + y, C(x + y < -rad * 0.5 ? li : d > 0.7 && x + y > 0 ? dk : mi));
      }
      if (blossom) for (let i = 0; i < 4; i++) b.set(t.x - rad + Math.floor(r() * rad * 2), cy - rad + 1 + Math.floor(r() * rad * 2 - 1), C("#ffffff"));
    }
  }
  // farmhouse, barn and silo on the hill
  const hb = Math.round(hh(222)) + 3;
  const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) b.set(x + i, y + j, c); };
  rect(212, hb - 11, 20, 11, C("#dca86f"));
  for (let j = 1; j < 11; j += 3) rect(212, hb - 11 + j, 20, 1, C("#c08955"));
  for (let j = 0; j < 8; j++) { const w = 6 + j * 2; rect(222 - w / 2, hb - 19 + j, w, 1, C(j === 7 ? "#8e3029" : j % 2 ? "#b8463b" : "#cc5848")); }
  rect(215, hb - 21, 3, 6, C("#7d5236")); rect(215, hb - 22, 3, 1, C("#5e3b26"));
  rect(220, hb - 6, 4, 6, C("#76472a")); rect(223, hb - 3, 1, 1, C("#e8c04a"));
  const winC = night ? hex("#ffd47a") : C("#a6dcf6");
  for (const wx of [214, 226]) { rect(wx - 1, hb - 9, 5, 5, C("#7a4a2a")); rect(wx, hb - 8, 3, 3, winC); if (night) emit.push([wx + 1, hb - 7, 11]); }
  rect(250, hb - 12, 18, 12, C("#b43a31"));
  for (let j = 0; j < 6; j++) { const w = 10 + j * 2; rect(259 - w / 2, hb - 18 + j, w, 1, C(j % 2 ? "#7c2a24" : "#8f322b")); }
  rect(255, hb - 8, 8, 8, C("#f3e2b8")); rect(256, hb - 7, 6, 6, C("#9b3029"));
  for (let i = 0; i < 6; i++) { b.set(256 + i, hb - 7 + i, C("#f3e2b8")); b.set(261 - i, hb - 7 + i, C("#f3e2b8")); }
  rect(271, hb - 20, 6, 20, C("#c9c4bb")); for (let j = 0; j < 20; j += 4) rect(271, hb - 20 + j, 6, 1, C("#a8a399"));
  rect(272, hb - 22, 4, 2, C("#8d8a84")); rect(273, hb - 23, 2, 1, C("#8d8a84"));

  // field: patchwork crop rows, spaced wider toward the viewer
  for (let y = 122; y < 157; y++) for (let x = 0; x < W; x++) b.set(x, y, nh(x / 4 + y * 1.3) > 0.72 ? C("#64b24c") : C("#72bf55"));
  let y = 124, k = 0;
  while (y < 154) {
    const th = k > 3 ? 2 : 1, cr = 1 + Math.floor(k / 2), sp = 3 + Math.floor(k / 2);
    for (let x = 0; x < W; x++) { b.set(x, y, C("#a56c3e")); if (th > 1) b.set(x, y + 1, C("#83532f")); }
    for (let x = (k * 2) % sp; x < W; x += sp) {
      const zone = x + 10 * Math.sin(k * 1.3);
      const type = zone < 78 ? "leaf" : zone < 150 ? "wheat" : zone < 226 ? "cabbage" : "pumpkin";
      if (type === "leaf") for (let j = 0; j < cr + 1; j++) b.set(x, y - 1 - j, C(j === cr ? "#8fdc62" : "#3f9a3a"));
      if (type === "wheat") for (let j = 0; j < cr + 2; j++) b.set(x, y - 1 - j, C(j >= cr ? "#f7dc7a" : "#c9a23a"));
      if (type === "cabbage") for (let j = 0; j < cr; j++) for (let i = -Math.ceil(cr / 2); i <= Math.floor(cr / 2); i++) b.set(x + i, y - 1 - j, C(j === cr - 1 ? "#b6e78a" : "#6cc067"));
      if (type === "pumpkin") { for (let j = 0; j < cr; j++) for (let i = 0; i <= cr; i++) b.set(x + i, y - 1 - j, C(i === 0 && j === cr - 1 ? "#ffbf6a" : "#e9852b")); b.set(x + 1, y - 1 - cr, C("#3f8a3a")); }
    }
    y += 3 + Math.round(k * 0.8); k++;
  }
  // a dirt lane along the bottom of the field, where the tractor drives
  for (let x = 0; x < W; x++) for (let yy = 151; yy < 156; yy++) {
    const n = hash2(x, yy + 40);
    b.set(x, yy, C(yy === 151 ? "#83532f" : n < 0.1 ? "#93603a" : n > 0.93 ? "#c99563" : "#ad7848"));
  }
  // wildflowers
  for (let yy = 156; yy < 161; yy++) for (let x = 0; x < W; x++) b.set(x, yy, C("#5aa646"));
  const rf = rng(77), FL = ["#ffffff", "#ffd84a", "#ff9ec4", "#b994f2", "#ff7a6a"];
  for (let i = 0; i < 120; i++) { const x = Math.floor(rf() * W), yy = 155 + Math.floor(rf() * 6); b.set(x, yy, C(FL[Math.floor(rf() * FL.length)])); if (rf() > 0.6) b.set(x, yy + 1, C("#3f8a3a")); }
  // fence
  for (let x = 0; x < W; x++) { b.set(x, 159, C("#c0864d")); b.set(x, 160, C("#6b4423")); b.set(x, 163, C("#c0864d")); b.set(x, 164, C("#6b4423")); }
  for (let x = 3, i = 0; x < W; x += 14, i++) {
    rect(x, 156, 3, 11, C("#8a5a2b")); rect(x, 156, 1, 11, C("#c58b4e")); rect(x, 156, 3, 1, C("#5e3b1d"));
    if (night && i % 4 === 1) { rect(x, 151, 3, 5, hex("#3a2718")); rect(x, 152, 3, 3, hex("#ffe08a")); emit.push([x + 1, 153, 16]); }
  }
  // road with ruts and pebbles
  for (let yy = 167; yy < H; yy++) for (let x = 0; x < W; x++) {
    const n = hash2(x, yy);
    let c = n < 0.08 ? "#b38a55" : n > 0.95 ? "#e0bd8b" : "#caa36c";
    if ((yy === 174 || yy === 175 || yy === 182 || yy === 183) && dz(x, yy, 0.55)) c = "#a9804b";
    b.set(x, yy, C(c));
  }
  for (let x = 0; x < W; x++) { b.set(x, 167, C(hash2(x, 3) > 0.45 ? "#5aa645" : "#8f6a3f")); if (hash2(x, 9) > 0.75) b.set(x, 168, C("#5aa645")); }
  const rp = rng(91);
  for (let i = 0; i < 34; i++) { const x = Math.floor(rp() * W), yy = 170 + Math.floor(rp() * 17); b.set(x, yy, C("#a39b8e")); b.set(x, yy - 1, C("#d2cbbd")); }

  for (const [x, yy, R] of emit) glow(b, x, yy, R, hex("#e8a54a"), 0.9);
  return { b, chimney: [216, hb - 23] };
}

// animated bits
function clouds(out, night, t) {
  const defs = [[20, 22, 1.1, 1.2], [120, 14, 1.4, 0.8], [210, 40, 0.9, 1.5], [290, 26, 1.2, 1], [70, 52, 0.7, 1.8]];
  const P = night ? ["#7d88ba", "#3b4576", "#2e3665", "#252c55"] : ["#ffffff", "#f3f8fd", "#d2e5f3", "#b5cfe6"];
  const cols = P.map(hex), blobs = [[0, 0, 7], [8, -4, 9], [18, -1, 7], [26, 1, 5], [-8, 2, 5]];
  for (const [x0, cy, s, sp] of defs) {
    const cx = ((x0 + t * sp * 2) % (W + 90)) - 45;
    const inside = (x, y) => y <= cy + 4 * s && blobs.some(([bx, by, r]) => (x - cx - bx * s) ** 2 + (y - cy - by * s) ** 2 <= (r * s) ** 2);
    for (let y = Math.floor(cy - 14 * s); y <= cy + 5 * s; y++) for (let x = Math.floor(cx - 14 * s); x <= cx + 34 * s; x++) {
      if (!inside(x, y)) continue;
      const c = !inside(x, y - 2) ? 0 : !inside(x, y + 2) ? 3 : !inside(x, y + 4) ? 2 : 1;
      out.set(x, y, cols[c]);
    }
  }
}
const starList = (() => { const r = rng(123); return Array.from({ length: 170 }, () => { const x = Math.floor(r() * W), y = Math.floor(r() * 95); const band = Math.abs(y - (8 + x * 0.26)) < 14; return { x, y, p: r() * 6.28, sp: 0.5 + r() * 2, big: r() > 0.93, warm: r() > 0.8, band }; }); })();
function stars(out, t) {
  for (const s of starList) {
    if (Math.hypot(s.x - 56, s.y - 30) < 16) continue;
    const tw = 0.5 + 0.5 * Math.sin(t * s.sp + s.p);
    const c = hex(s.warm ? "#fff2c4" : "#dfe6ff"), cd = lerp(c, [40, 50, 100], 0.6);
    out.set(s.x, s.y, tw > 0.35 ? c : cd);
    if (s.big && tw > 0.6) { out.set(s.x - 1, s.y, cd); out.set(s.x + 1, s.y, cd); out.set(s.x, s.y - 1, cd); out.set(s.x, s.y + 1, cd); }
  }
}

function scene(night) {
  const sky = buildSky(night), { b: land } = buildLand(night), out = new Buf();
  out.d.set(sky.d);
  if (night) stars(out, 0);
  clouds(out, night, 0);
  const L = land.d, O = out.d;
  for (let i = 0; i < L.length; i += 4) if (L[i + 3]) { O[i] = L[i]; O[i + 1] = L[i + 1]; O[i + 2] = L[i + 2]; }
  return O;
}

for (const [name, night] of [["scene-day", false], ["scene-night", true]]) {
  const big = scaleNearest(W, H, new Uint8Array(scene(night).buffer), SCALE);
  const file = `${OUT}${name}.png`;
  const bytes = encodePNG(big.width, big.height, big.rgba);
  writeFileSync(file, bytes);
  console.log(`wrote ${name}.png ${big.width}x${big.height} (${bytes.length} bytes)`);
}
