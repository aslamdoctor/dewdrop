// Pure helpers for the dewdrop mod. Imports only pure modules, so bun can test them directly.
import { LOOK } from "./palette.js";
import { png } from "./art.js";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function seasonOf(date) {
  const m = date.getMonth();
  if (m >= 2 && m <= 4) return "spring";
  if (m >= 5 && m <= 7) return "summer";
  if (m >= 8 && m <= 10) return "fall";
  return "winter";
}

export function clockText(date) {
  const h = date.getHours();
  const mm = String(date.getMinutes()).padStart(2, "0");
  const s = seasonOf(date);
  return {
    day: `${DAYS[date.getDay()]}. ${date.getDate()}`,
    time: `${h % 12 || 12}:${mm} ${h < 12 ? "am" : "pm"}`,
    season: s[0].toUpperCase() + s.slice(1),
  };
}

export function workingCount(agents) {
  return agents.filter((a) => a.status === "working").length;
}

const LOOKS = {
  working: { icon: "can", color: "sky" },
  blocked: { icon: "bang", color: "red" },
  done: { icon: "star", color: "gold" },
  idle: { icon: "zzz", color: "idle" },
};

export function statusLook(status) {
  return LOOKS[status] ?? null;
}

// Herdr binds ctrl-1..ctrl-9 to space.select, so only the first nine slots get a key.
export const HOTBAR_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function slotLabel(name) {
  return (name ?? "").slice(0, 4).trim() || "?";
}

export function hotbarSlots(spaces) {
  return spaces.map((s, i) => ({
    id: s.id,
    label: slotLabel(s.name),
    key: HOTBAR_KEYS[i] ?? null,
    active: s.active,
    status: s.status,
  }));
}

export function slotTooltip(space, agents) {
  const lines = agents.filter((a) => a.space === space.id).map((a) => `${a.program?.name ?? "agent"}: ${a.status}`);
  return [space.name, ...(lines.length ? lines : ["no agents"])].join("\n");
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

// Clock box geometry, shared by the title bar and scripts/draw-art.js.
export const CLOCK = { w: 176, h: 36, split: 120 };

// Delay to 50ms past the next minute, so a tick never lands just before the boundary.
export function msToNextMinute(now) {
  return (60 - now.getSeconds()) * 1000 - now.getMilliseconds() + 50;
}

// Day look from 6:00 to 17:59, night otherwise.
export function lookOf(date) {
  const h = date.getHours();
  return h >= 6 && h < 18 ? "day" : "night";
}

// The shipped layout and the live swap (Task 6) share these two helpers.
const sceneLook = (image) => /scene-(day|night)\.png$/.exec(image ?? "")?.[1] ?? null;

function findNode(n, id) {
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

// A look swapper with its own pending guard. read() gives the current layout tree,
// write(tree) applies one. pending holds the look last written until the layout shows it,
// so a second tick before the reload doesn't write again. A throwing write frees the guard.
export function makeSyncer() {
  let pending = null;
  return function syncWith(now, read, write) {
    const tree = read();
    if (!tree) return;
    const wearing = lookOfLayout(tree);
    if (pending && (wearing === pending || wearing === null)) pending = null;
    const look = needsSwap(tree, now);
    if (!look || pending === look) return;
    const next = layoutFor(tree, look);
    if (!next) return;
    pending = look;
    try {
      write(next);
    } catch (e) {
      pending = null;
      throw e;
    }
  };
}
