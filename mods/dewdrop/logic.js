// Pure helpers for the dewdrop mod. Imports only pure modules, so bun can test them directly.
import { LOOK } from "./palette.js";
import { png } from "./art.js";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function clockText(date) {
  const h = date.getHours();
  const mm = String(date.getMinutes()).padStart(2, "0");
  return {
    day: `${DAYS[date.getDay()]}. ${date.getDate()}`,
    time: `${h % 12 || 12}:${mm} ${h < 12 ? "am" : "pm"}`,
  };
}

// Herdr binds ctrl-1..ctrl-9 to space.select, so only the first nine slots get a key.
export const HOTBAR_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

// Cut by code points so an emoji or a kanji is never split.
export function slotLabel(name) {
  return [...(name ?? "")].slice(0, 4).join("").trim() || "?";
}

export const CROPS = ["carrot", "pumpkin", "wheat", "sprout", "tomato", "corn"];

// FNV-1a 32-bit over the id's UTF-16 code units, so a space keeps its crop.
export function cropOf(id) {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return CROPS[h % CROPS.length];
}

export function hotbarSlots(spaces) {
  return spaces.map((s, i) => ({
    id: s.id,
    label: slotLabel(s.name),
    key: HOTBAR_KEYS[i] ?? null,
    active: s.active,
    status: s.status,
    crop: cropOf(s.id),
  }));
}

export function slotTooltip(space, agents, key) {
  const lines = agents.filter((a) => a.space === space.id).map((a) => `${a.program?.name ?? "agent"}: ${a.status}`);
  const head = key === null ? `${space.name} (no ctrl key past nine)` : space.name;
  return [head, ...(lines.length ? lines : ["no agents"])].join("\n");
}

export function headerTitle(pane, home) {
  if (pane.mod) return pane.title || pane.mod;
  const p = pane.program;
  if (!p || p.shell) {
    const cwd = pane.cwd ?? "";
    return home && (cwd === home || cwd.startsWith(home + "/")) ? "~" + cwd.slice(home.length) : cwd;
  }
  return pane.title && pane.title !== p.name ? `${p.name} - ${pane.title}` : p.name;
}

// Returns the mood for this poll, the agent that caused it, and the status map to pass next time.
// Herdr reports a finished agent as "done" only while nobody is looking; with
// the app in front it goes straight from "working" to "idle", so both count.
// An agent seen for the first time (a reload, a new terminal) stays quiet.
export function chickenMood(prev, agents) {
  const next = new Map();
  let alert = null;
  let heart = null;
  for (const a of agents) {
    next.set(a.address, a.status);
    const was = prev.get(a.address);
    if (was === undefined || was === a.status) continue;
    if (a.status === "blocked") alert ??= a.address;
    else if (a.status === "done" || (a.status === "idle" && was === "working")) heart ??= a.address;
  }
  if (alert) return { mood: "alert", address: alert, next };
  if (heart) return { mood: "heart", address: heart, next };
  return { mood: null, address: null, next };
}

// Delay to 50ms past the next minute, so a tick never lands just before the boundary.
export function msToNextMinute(now) {
  return (60 - now.getSeconds()) * 1000 - now.getMilliseconds() + 50;
}

// Day look from 6:00 to 17:59, night otherwise.
export function lookOf(date) {
  const h = date.getHours();
  return h >= 6 && h < 18 ? "day" : "night";
}

// Delay to 50ms past the next 6:00 or 18:00 (local time), when the look flips.
export function msToNextLook(now) {
  const t = new Date(now);
  for (const h of [6, 18, 30]) {
    const at = new Date(t.getFullYear(), t.getMonth(), t.getDate(), h, 0, 0, 0);
    if (at > t) return at - t + 50;
  }
  return 60000;
}

// The shipped layout and the live swap (Task 6) share these two helpers.
const sceneLook = (image) => /scene-(day|night)\.png$/.exec(image ?? "")?.[1] ?? null;

export function findNode(n, id) {
  if (!n || typeof n !== "object") return null;
  if (n.id === id) return n;
  for (const c of n.children ?? []) {
    const f = findNode(c, id);
    if (f) return f;
  }
  return null;
}

// Which look the tree is wearing, read from the valley scene path. null for a foreign tree.
export function lookOfLayout(tree) {
  return sceneLook(findNode(tree, "valley")?.background?.image);
}

// A deep copy of the tree wearing the day or night look. Only the valley scene and the
// pane colors of "main" change. null when the tree has no valley or no main node.
export function layoutFor(tree, look) {
  // The mod runtime has no structuredClone, and the tree is plain JSON.
  const copy = JSON.parse(JSON.stringify(tree));
  const valley = findNode(copy, "valley");
  const main = findNode(copy, "main");
  const pane = main?.content?.pane;
  if (!valley || !pane) return null;
  const L = LOOK[look];
  valley.background = { ...(valley.background ?? {}), image: png("scene-" + look) };
  pane.background = L.pane;
  pane.border = { ...(pane.border ?? {}), color: L.border };
  pane.focus = { ...(pane.focus ?? {}), color: L.focus };
  return copy;
}

// The look to switch to, or null when the tree already wears lookOf(now) or isn't Dewdrop's.
export function needsSwap(tree, now) {
  const wearing = lookOfLayout(tree);
  if (!wearing) return null;
  const want = lookOf(now);
  return wearing === want ? null : want;
}

// How long a written look may stay unconfirmed before the syncer tries again.
export const PENDING_MS = 90000;

// A look swapper with its own pending guard. read() gives the current layout tree,
// write(tree) applies one. pending holds the look last written until the layout shows it,
// so a second tick before the reload doesn't write again. A throwing write frees the guard,
// and so does a layout that already matches or a pending older than PENDING_MS (a write
// that did nothing), which lets the next tick retry.
export function makeSyncer() {
  let pending = null;
  let pendingAt = 0;
  return function syncWith(now, read, write) {
    const tree = read();
    if (!tree) return;
    const wearing = lookOfLayout(tree);
    if (pending && (wearing === pending || wearing === null || now - pendingAt > PENDING_MS)) pending = null;
    const look = needsSwap(tree, now);
    if (!look) {
      pending = null;
      return;
    }
    if (pending === look) return;
    const next = layoutFor(tree, look);
    if (!next) return;
    pending = look;
    pendingAt = +now;
    try {
      write(next);
    } catch (e) {
      pending = null;
      throw e;
    }
  };
}

export const MAX_TABS = 5;

// Splits a space's tabs for the title bar. Settled tabs stay out of the strip unless
// they are the active one. The strip is the first `max` of the rest; an active tab
// that didn't fit takes the last slot. hidden: the other live tabs, settled: the other settled ones.
export function tabStrip(tabs, max = MAX_TABS) {
  const shown = tabs.filter((t) => !t.settled || t.active);
  const strip = shown.slice(0, max);
  const active = shown.find((t) => t.active);
  if (active && !strip.includes(active)) strip[strip.length - 1] = active;
  return {
    strip,
    hidden: tabs.filter((t) => !t.settled && !strip.includes(t)),
    settled: tabs.filter((t) => t.settled && !strip.includes(t)),
  };
}

// Working and blocked counts over agents and their helpers. `helpers` is the map from
// helpersOf; only helpers under an agent count, since the popup lists no others.
export function agentCounts(agents, helpers) {
  const all = [...agents];
  for (const a of agents) all.push(...(helpers.get(a.address) ?? []));
  return {
    working: all.filter((a) => a.status === "working").length,
    blocked: all.filter((a) => a.status === "blocked").length,
  };
}

// Helper terminals (started with `hc run`), keyed by their parent's address.
// A helper keeps its row only while it lives; one shown in a pane carries the pane id.
export function helpersOf(terminals, panes) {
  const paneOf = new Map();
  for (const p of panes ?? []) if (p.terminal) paneOf.set(p.terminal, p.pane);
  const out = new Map();
  for (const t of terminals ?? []) {
    if (!t.parent || t.state === "finished") continue;
    const title = t.name || t.title || t.address;
    const list = out.get(t.parent) ?? [];
    list.push({ address: t.address, title, status: t.status ?? "idle", pane: paneOf.get(t.address) ?? null });
    out.set(t.parent, list);
  }
  return out;
}

// Agents grouped by tab, in the order each tab first appears.
export function agentGroups(agents, helpers) {
  const groups = new Map();
  for (const a of agents ?? []) {
    let g = groups.get(a.tab);
    if (!g) {
      g = { tab: a.tab, tab_index: a.tab_index, tab_name: a.tab_name, space_name: a.space_name, rows: [] };
      groups.set(a.tab, g);
    }
    g.rows.push({ agent: a, helpers: helpers.get(a.address) ?? [] });
  }
  return [...groups.values()];
}

// Repaints a role when the look flips at 6:00 and 18:00. Each wait is capped at 10 minutes,
// so a laptop that slept through the flip catches up soon after waking. The next timer is
// armed before notify, which could throw.
export const MAX_LOOK_WAIT = 600000;
export function repaintOnLook(cx) {
  const tick = (cx) => {
    cx.timer.after(Math.min(msToNextLook(new Date()), MAX_LOOK_WAIT), tick);
    cx.notify();
  };
  cx.timer.after(Math.min(msToNextLook(new Date()), MAX_LOOK_WAIT), tick);
}

// ---- Sky strip (sky.js) ----
// The strip is SKY_H px tall. Sprites show at SKY_PX px per art pixel.
export const SKY_H = 48;
export const SKY_PX = 3;

// mulberry32: the same seed gives the same numbers, so the sky is laid out the same on
// every render and in both looks.
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Art size in art pixels (art/<name>.svg, bird.webp) for the sky sprites.
export const SKY_ART = { "cloud-a": [18, 8], "cloud-b": [12, 6], "cloud-c": [26, 9], bird: [9, 5], "star-warm": [1, 1], "star-cool": [1, 1], "star-big": [3, 3], firefly: [3, 3] };
export const skySize = (name) => SKY_ART[name].map((n) => n * SKY_PX);

// Things that drift: each starts at x0, spread over the width, and swings out to the far
// edge and back (a loop ping-pongs). One in the left half swings out right, else left.
// Loops share one native clock, so where each sits on first draw isn't up to us; the
// different periods keep them from moving in lockstep.
function drifters(width, n, seed, names, speeds, tops) {
  const r = seeded(seed);
  return Array.from({ length: n }, (_, i) => {
    const name = names[i % names.length];
    const [w, h] = skySize(name);
    const x0 = Math.round(((i + 0.25 + r() * 0.5) / n) * width) - Math.round(w / 2);
    const to = x0 + w / 2 < width / 2 ? width : -w;
    const speed = speeds[0] + r() * (speeds[1] - speeds[0]);
    const top = Math.round(tops[0] + r() * Math.max(0, tops[1] - tops[0] - h));
    return { name, w, h, top, from: x0, to, period: Math.max(100, Math.round((2 * Math.abs(to - x0)) / speed * 1000)) };
  });
}

// Day: clouds (6 to 12 px/s) and birds (30 to 48 px/s, bobbing a few px).
export function skyClouds(width) {
  return drifters(width, Math.max(2, Math.round(width / 520)), 11, ["cloud-a", "cloud-c", "cloud-b"], [6, 12], [2, SKY_H - 2]);
}
export function skyBirds(width) {
  const r = seeded(29);
  return drifters(width, width < 900 ? 2 : 3, 23, ["bird"], [30, 48], [4, 30])
    .map((b) => ({ ...b, bob: 3 + Math.round(r() * 3), bobPeriod: 1800 + Math.round(r() * 1400) }));
}

// Night: stars at fixed spots, each twinkling at its own pace, about one per 32px.
export function skyStars(width) {
  const r = seeded(7);
  return Array.from({ length: Math.max(8, Math.round(width / 32)) }, () => {
    const roll = r();
    const name = roll < 0.12 ? "star-big" : roll < 0.45 ? "star-warm" : "star-cool";
    const [w, h] = skySize(name);
    return {
      name, w, h,
      left: Math.round(4 + r() * Math.max(0, width - 8 - w)),
      top: Math.round(3 + r() * (SKY_H - 6 - h)),
      low: Math.round((0.15 + r() * 0.25) * 100) / 100,
      period: 1800 + Math.round(r() * 3400),
    };
  });
}

// Night: fireflies, each wandering a patch: across (dx px) and up and down, blinking.
export function skyFireflies(width) {
  const r = seeded(41);
  const n = Math.max(4, Math.round(width / 320));
  const [w, h] = skySize("firefly");
  return Array.from({ length: n }, (_, i) => {
    const spot = Math.round(((i + 0.2 + r() * 0.6) / n) * width);
    const dx = 40 + Math.round(r() * 50);
    return {
      w, h,
      // Kept far enough from the right edge that the whole swing stays on screen.
      left: Math.max(0, Math.min(spot, width - dx - w)),
      dx, dxPeriod: 7000 + Math.round(r() * 6000),
      top: [6, SKY_H - 6 - h], topPeriod: 3500 + Math.round(r() * 3000),
      blinkPeriod: 1400 + Math.round(r() * 1600),
    };
  });
}

// ---- Road pet (roadpet.js) ----
// The pet walks the hotbar from ROAD_MARGIN to the width minus the sprite, at speed px/s.
// leg is the ms for one way.
export const PET_W = 48, PET_H = 40, ROAD_MARGIN = 8;
// The road is the whole 64px hotbar block; the pet rests in the middle of it.
export const ROAD_H = 64, ROAD_TOP = (ROAD_H - PET_H) / 2;
export function walkPlan(width, speed) {
  const from = ROAD_MARGIN;
  const to = Math.max(from + 1, Math.round(width - ROAD_MARGIN - PET_W));
  const leg = Math.max(50, Math.round(((to - from) / speed) * 1000));
  return { from, to, leg };
}

// Where leg n heads and which way the pet faces. Before the first leg (n < 0) it stands
// at the start facing right; even legs head right to `to`, odd legs head back to `from`.
export function walkLeg(plan, n) {
  if (n < 0) return { target: plan.from, right: true };
  return n % 2 === 0 ? { target: plan.to, right: true } : { target: plan.from, right: false };
}

// Delay to the start of leg n (0 is the first leg), measured from t0, never negative.
// Timing every turn from t0 keeps the timer's lateness from piling up.
export function msToLeg(t0, leg, n, now) {
  return Math.max(0, t0 + n * leg - now);
}

// The leg to walk when the turn timer fires, worked out from the clock so a sleep or a
// forward clock jump skips straight to the current leg (one repaint, not one per missed
// leg). It always moves on at least one leg. If the clock went back, t0 is re-anchored so
// the next turn is never more than one leg away.
export function nextLeg(t0, leg, prevN, now) {
  const due = Math.floor((now - t0) / leg);
  const n = Math.max(prevN + 1, due);
  return due < prevN ? { n, t0: now - n * leg } : { n, t0 };
}

// Where the pet is on leg n at `now`, from the same clock the turn timer uses. Before the
// first leg it stands at the start; past the end of a leg it stays at that end.
export function walkX(plan, n, t0, now) {
  if (n < 0) return plan.from;
  const p = Math.min(1, Math.max(0, (now - (t0 + n * plan.leg)) / plan.leg));
  const span = plan.to - plan.from;
  return n % 2 === 0 ? plan.from + p * span : plan.to - p * span;
}

// Picks a walk back up after a drop: the pet is at x (kept on the road) facing right or
// left, and starts moving at `now`. It walks leg 0 (right) or leg 1 (left) with t0 moved
// back by the part of the leg already "done", so walkX, msToLeg and nextLeg all hold from
// here on. dur is what's left of that first leg, at the pet's normal speed.
export function resumeWalk(plan, x, right, now) {
  const at = Math.min(plan.to, Math.max(plan.from, Math.round(x)));
  const span = plan.to - plan.from;
  const done = Math.round(((right ? at - plan.from : plan.to - at) / span) * plan.leg);
  const n = right ? 0 : 1;
  const t0 = now - n * plan.leg - done;
  return { n, t0, x: at, dur: Math.max(1, plan.leg - done) };
}

// Where a carried pet is drawn: x along the road, y anywhere inside the 64px block.
export function heldSpot(plan, x, y) {
  return {
    x: Math.min(plan.to, Math.max(plan.from, Math.round(x))),
    y: Math.min(ROAD_H - PET_H, Math.max(0, Math.round(y))),
  };
}

// A dropped pet falls back to the road, hops up a little and lands again. Step 0 is the
// fall (from wherever it was let go), 1 the hop up, 2 and after the landing.
export const HOP = { fall: 240, up: 110, lift: 4 };
export function hopAfterDrop(step) {
  if (step <= 0) return { top: ROAD_TOP, duration: HOP.fall, easing: "ease-in" };
  if (step === 1) return { top: ROAD_TOP - HOP.lift, duration: HOP.up, easing: "ease-out" };
  return { top: ROAD_TOP, duration: HOP.up, easing: "ease-in" };
}
