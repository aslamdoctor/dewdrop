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
