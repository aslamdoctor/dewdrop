// Pure helpers for the stardew mod. No imports, so bun can test them directly.

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
