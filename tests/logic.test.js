import { test, expect } from "bun:test";
import { clockText, HOTBAR_KEYS, slotLabel, hotbarSlots,
  slotTooltip, cropOf, CROPS, msToNextLook, headerTitle, chickenMood, msToNextMinute, lookOf, tabStrip, agentCounts, helpersOf, agentGroups } from "../mods/dewdrop/logic.js";

test("lookOf flips at 6:00 and 18:00", () => {
  expect(lookOf(new Date(2026, 10, 8, 5, 59))).toBe("night");
  expect(lookOf(new Date(2026, 10, 8, 6, 0))).toBe("day");
  expect(lookOf(new Date(2026, 10, 8, 17, 59))).toBe("day");
  expect(lookOf(new Date(2026, 10, 8, 18, 0))).toBe("night");
  expect(lookOf(new Date(2026, 10, 8, 0, 0))).toBe("night");
});

test("clockText formats day and 12-hour time", () => {
  expect(clockText(new Date(2026, 10, 7, 18, 5))).toEqual({ day: "Sat. 7", time: "6:05 pm" });
  expect(clockText(new Date(2026, 10, 7, 0, 0)).time).toBe("12:00 am");
  expect(clockText(new Date(2026, 10, 7, 12, 0)).time).toBe("12:00 pm");
});

test("slotLabel takes four characters", () => {
  expect(slotLabel("aslams-mod")).toBe("asla");
  expect(slotLabel("")).toBe("?");
});

test("hotbarSlots handles 0 and 13 spaces", () => {
  expect(hotbarSlots([])).toEqual([]);
  const spaces = Array.from({ length: 13 }, (_, i) => ({ id: `s${i}`, name: `space${i}`, active: i === 0, status: null }));
  const slots = hotbarSlots(spaces);
  expect(slots).toHaveLength(13);
  expect(slots[0]).toEqual({ id: "s0", label: "spac", key: "1", active: true, status: null, crop: cropOf("s0") });
  expect(slots[12].key).toBeNull();
});

test("slotTooltip lists the space's agents", () => {
  const agents = [
    { space: "a", status: "working", program: { name: "Claude Code" } },
    { space: "b", status: "idle", program: { name: "Codex" } },
    { space: "a", status: "blocked", program: { name: "Codex" } },
  ];
  expect(slotTooltip({ id: "a", name: "farm" }, agents)).toBe("farm\nClaude Code: working\nCodex: blocked");
  expect(slotTooltip({ id: "c", name: "mine" }, agents)).toBe("mine\nno agents");
});

test("headerTitle names mod, shell and program panes", () => {
  expect(headerTitle({ mod: "board", title: "" }, "/Users/a")).toBe("board");
  expect(headerTitle({ cwd: "/Users/a/x", title: "zsh", program: { name: "zsh", shell: true } }, "/Users/a")).toBe("~/x");
  expect(headerTitle({ cwd: "/tmp", title: "fix login", program: { name: "Claude Code", shell: false } }, "/Users/a")).toBe("Claude Code - fix login");
  expect(headerTitle({ cwd: "/tmp", title: "Claude Code", program: { name: "Claude Code", shell: false } }, "/Users/a")).toBe("Claude Code");
});

test("chickenMood: blocked wins, repeats and vanished agents ignored", () => {
  const prev = new Map([["t1", "working"], ["t2", "working"], ["t3", "done"]]);
  const r = chickenMood(prev, [{ address: "t1", status: "done" }, { address: "t2", status: "blocked" }, { address: "t3", status: "done" }]);
  expect(r.mood).toBe("alert");
  expect(r.address).toBe("t2");
  expect(chickenMood(new Map([["t1", "working"]]), [{ address: "t1", status: "done" }])).toMatchObject({ mood: "heart", address: "t1" });
  expect(chickenMood(new Map([["t3", "done"]]), [{ address: "t3", status: "done" }])).toMatchObject({ mood: null, address: null });
  const gone = chickenMood(new Map([["t9", "working"]]), []);
  expect([...gone.next.keys()]).toEqual([]);
});

test("chickenMood: working to idle counts as finishing", () => {
  expect(chickenMood(new Map([["t1", "working"]]), [{ address: "t1", status: "idle" }])).toMatchObject({ mood: "heart", address: "t1" });
  expect(chickenMood(new Map([["t1", "done"]]), [{ address: "t1", status: "idle" }]).mood).toBeNull();
});

test("chickenMood: agents seen for the first time stay quiet", () => {
  const r = chickenMood(new Map(), [{ address: "t1", status: "done" }, { address: "t2", status: "blocked" }]);
  expect(r.mood).toBeNull();
  expect(r.next.get("t2")).toBe("blocked");
});

test("hotbar keys stop at 9, the ctrl-1..ctrl-9 space shortcuts", () => {
  expect(HOTBAR_KEYS).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
  const slots = hotbarSlots(Array.from({ length: 10 }, (_, i) => ({ id: `s${i}`, name: "x", active: false, status: null })));
  expect(slots[8].key).toBe("9");
  expect(slots[9].key).toBeNull();
});

test("msToNextMinute lands just past the next minute boundary", () => {
  expect(msToNextMinute(new Date(2026, 10, 7, 19, 4, 0, 0))).toBe(60050);
  expect(msToNextMinute(new Date(2026, 10, 7, 19, 4, 59, 990))).toBe(60);
  expect(msToNextMinute(new Date(2026, 10, 7, 19, 4, 30, 0))).toBe(30050);
});

const T = (i, o = {}) => ({ id: `t${i}`, index: i, name: `tab${i}`, active: false, status: null, settled: false, ...o });

test("tabStrip with no tabs", () => {
  expect(tabStrip([])).toEqual({ strip: [], hidden: [], settled: [] });
});

test("tabStrip keeps five live tabs and folds the rest", () => {
  const tabs = [1, 2, 3, 4, 5, 6, 7].map((i) => T(i, { active: i === 1 }));
  const r = tabStrip(tabs);
  expect(r.strip.map((t) => t.index)).toEqual([1, 2, 3, 4, 5]);
  expect(r.hidden.map((t) => t.index)).toEqual([6, 7]);
});

test("tabStrip moves settled tabs out and keeps the active one", () => {
  const tabs = [T(1, { settled: true }), T(2), T(3), T(4), T(5), T(6), T(7, { active: true })];
  const r = tabStrip(tabs);
  expect(r.strip.map((t) => t.index)).toEqual([2, 3, 4, 5, 7]);
  expect(r.hidden.map((t) => t.index)).toEqual([6]);
  expect(r.settled.map((t) => t.index)).toEqual([1]);
});

test("tabStrip shows an active settled tab", () => {
  const r = tabStrip([T(1), T(2, { settled: true, active: true })]);
  expect(r.strip.map((t) => t.index)).toEqual([1, 2]);
  expect(r.settled).toEqual([]);
});

test("agentCounts counts helpers", () => {
  const helpers = new Map([["a1", [{ status: "working" }]]]);
  expect(agentCounts([{ address: "a1", status: "working" }, { address: "a2", status: "blocked" }], helpers))
    .toEqual({ working: 2, blocked: 1 });
});

test("agentCounts skips helpers whose parent is not an agent", () => {
  // The popup lists helpers only under agents, so the chip must not count orphans.
  const helpers = new Map([["a1", [{ status: "blocked" }]], ["shell-9", [{ status: "working" }, { status: "blocked" }]]]);
  expect(agentCounts([{ address: "a1", status: "idle" }], helpers)).toEqual({ working: 0, blocked: 1 });
});

test("slotLabel keeps emoji whole", () => {
  expect(slotLabel("🚜farm")).toBe("🚜far");
  expect(slotLabel("農場の仕事")).toBe("農場の仕");
  expect(slotLabel("aslams-mod")).toBe("asla");
});

test("cropOf is stable and reaches every crop", () => {
  expect(cropOf("s1")).toBe(cropOf("s1"));
  const seen = new Set(Array.from({ length: 200 }, (_, i) => cropOf(`space-${i}`)));
  expect([...seen].sort()).toEqual([...CROPS].sort());
});

test("slots past nine say they have no key", () => {
  expect(slotTooltip({ id: "a", name: "farm" }, [], null).split("\n")[0]).toBe("farm (no ctrl key past nine)");
  expect(slotTooltip({ id: "a", name: "farm" }, [], "3").split("\n")[0]).toBe("farm");
});

test("msToNextLook aims 50ms past the next 6:00 or 18:00", () => {
  expect(msToNextLook(new Date(2026, 10, 8, 5, 0, 0, 0))).toBe(3600 * 1000 + 50);
  expect(msToNextLook(new Date(2026, 10, 8, 6, 0, 0, 0))).toBe(12 * 3600 * 1000 + 50);
  expect(msToNextLook(new Date(2026, 10, 8, 18, 0, 0, 0))).toBe(12 * 3600 * 1000 + 50);
  expect(msToNextLook(new Date(2026, 10, 8, 23, 0, 0, 0))).toBe(7 * 3600 * 1000 + 50);
});

test("cropOf follows FNV-1a (hash of \"a\" is 0xe40c292c)", () => {
  expect(cropOf("a")).toBe(CROPS[4]);
});

test("helpersOf nests helpers under their parent and spots kept ones", () => {
  const terms = [{ address: "t1" }, { address: "h1", parent: "t1", name: "tests", status: "working" }, { address: "h2", parent: "t1", name: "lint", status: "idle" }];
  const h = helpersOf(terms, [{ pane: "p9", terminal: "h2" }]);
  expect(h.get("t1")).toEqual([{ address: "h1", title: "tests", status: "working", pane: null }, { address: "h2", title: "lint", status: "idle", pane: "p9" }]);
  expect(h.has("h1")).toBe(false);
});

test("helpersOf skips finished helpers, reads null status as idle and falls back for titles", () => {
  const terms = [
    { address: "t1" },
    { address: "h1", parent: "t1", name: "gone", state: "finished", status: "working" },
    { address: "h2", parent: "t1", name: null, title: "npm test", status: null },
    { address: "h3", parent: "t1", name: "n", title: "t", state: "live" },
    { address: "h4", parent: "t1", name: null, title: "" },
  ];
  const h = helpersOf(terms, [{ pane: "p1", terminal: null }]);
  expect(h.get("t1")).toEqual([
    { address: "h2", title: "npm test", status: "idle", pane: null },
    { address: "h3", title: "n", status: "idle", pane: null },
    { address: "h4", title: "h4", status: "idle", pane: null },
  ]);
});

test("agentGroups groups by tab in order", () => {
  const A = (address, tab, tab_index) => ({ address, tab, tab_index, tab_name: `n${tab_index}`, space_name: "farm", status: "idle" });
  const g = agentGroups([A("t1", "x", 1), A("t2", "y", 2), A("t3", "x", 1)], new Map([["t3", [{ address: "h" }]]]));
  expect(g.map((x) => x.tab)).toEqual(["x", "y"]);
  expect(g[0].rows.map((r) => r.agent.address)).toEqual(["t1", "t3"]);
  expect(g[0].rows[1].helpers).toHaveLength(1);
  expect(agentGroups([], new Map())).toEqual([]);
});

import { SKY_H, skySize, skyClouds, skyBirds, skyStars, skyFireflies, walkPlan, walkLeg, msToLeg, nextLeg, PET_W, ROAD_MARGIN } from "../mods/dewdrop/logic.js";

test("the sky is laid out the same every time and stays in the strip", () => {
  for (const width of [800, 1440, 2560]) {
    for (const f of [skyClouds, skyBirds, skyStars, skyFireflies]) expect(f(width)).toEqual(f(width));
    for (const s of skyStars(width)) {
      expect(s.left).toBeGreaterThanOrEqual(0);
      expect(s.left + s.w).toBeLessThanOrEqual(width);
      expect(s.top).toBeGreaterThanOrEqual(0);
      expect(s.top + s.h).toBeLessThanOrEqual(SKY_H);
      expect(s.low).toBeLessThan(1);
    }
    for (const c of [...skyClouds(width), ...skyBirds(width)]) {
      expect(c.top).toBeGreaterThanOrEqual(0);
      expect(c.top + c.h + (c.bob ?? 0)).toBeLessThanOrEqual(SKY_H);
      expect(c.period).toBeGreaterThanOrEqual(100);
      // Each one swings out to the far edge, off screen.
      expect([width, -c.w]).toContain(c.to);
    }
    for (const f of skyFireflies(width)) {
      expect(f.top[0]).toBeGreaterThanOrEqual(0);
      expect(f.top[1] + f.h).toBeLessThanOrEqual(SKY_H);
    }
  }
});

test("the sky spreads over the width and nothing moves in lockstep", () => {
  const W = 2560;
  const stars = skyStars(W);
  expect(stars.length).toBe(80);
  expect(Math.min(...stars.map((s) => s.left))).toBeLessThan(W * 0.1);
  expect(Math.max(...stars.map((s) => s.left))).toBeGreaterThan(W * 0.9);
  expect(new Set(stars.map((s) => s.period)).size).toBeGreaterThan(60);
  const clouds = skyClouds(W);
  expect(clouds.length).toBe(5);
  expect(new Set(clouds.map((c) => c.period)).size).toBe(clouds.length);
  expect(new Set(clouds.map((c) => c.top)).size).toBeGreaterThan(1);
  expect(new Set(clouds.map((c) => c.name)).size).toBe(3);
  // Some head right, some left, and they start spread out.
  expect(new Set(clouds.map((c) => c.to > c.from))).toEqual(new Set([true, false]));
  const xs = clouds.map((c) => c.from).sort((a, b) => a - b);
  for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThan(100);
  // Clouds drift slowly (6 to 12 px/s), birds faster (30 to 48 px/s).
  for (const c of clouds) expect((2 * Math.abs(c.to - c.from)) / c.period * 1000).toBeWithin(5.9, 12.1);
  const birds = skyBirds(W);
  expect(birds.length).toBe(3);
  for (const b of birds) expect((2 * Math.abs(b.to - b.from)) / b.period * 1000).toBeWithin(29.9, 48.1);
  expect(skyFireflies(W).length).toBe(8);
});

test("skySize is the art at 3px per pixel", () => {
  expect(skySize("cloud-a")).toEqual([54, 24]);
  expect(skySize("bird")).toEqual([27, 15]);
  expect(skySize("star-big")).toEqual([9, 9]);
});

test("walkPlan walks the road edge to edge at the pet's speed", () => {
  expect(walkPlan(2560, 50)).toEqual({ from: ROAD_MARGIN, to: 2560 - ROAD_MARGIN - PET_W, leg: 49920 });
  expect(walkPlan(1000, 100)).toEqual({ from: 8, to: 944, leg: 9360 });
  // A tiny window still gives a valid walk.
  const tiny = walkPlan(40, 90);
  expect(tiny.to).toBeGreaterThan(tiny.from);
  expect(tiny.leg).toBeGreaterThanOrEqual(50);
});

test("walkLeg heads right first, then turns back each leg", () => {
  const plan = walkPlan(1000, 100);
  expect(walkLeg(plan, -1)).toEqual({ target: 8, right: true });
  expect(walkLeg(plan, 0)).toEqual({ target: 944, right: true });
  expect(walkLeg(plan, 1)).toEqual({ target: 8, right: false });
  expect(walkLeg(plan, 6)).toEqual({ target: 944, right: true });
});

test("msToLeg times every turn from the start", () => {
  expect(msToLeg(1000, 500, 1, 1000)).toBe(500);
  // A timer that fired 40ms late makes the next wait 40ms shorter, not the same.
  expect(msToLeg(1000, 500, 2, 1540)).toBe(460);
  expect(msToLeg(1000, 500, 1, 9000)).toBe(0);
});

test("nextLeg skips missed legs after a sleep and survives a clock going back", () => {
  // On time: leg 2 fires at t0 + 2 legs.
  expect(nextLeg(0, 1000, 1, 2000)).toEqual({ n: 2, t0: 0 });
  // A hair early still moves on one leg.
  expect(nextLeg(0, 1000, 1, 1999)).toEqual({ n: 2, t0: 0 });
  // Ten hours asleep: one jump to the current leg, not 36,000 turns.
  expect(nextLeg(0, 1000, 1, 36_000_500)).toEqual({ n: 36_000, t0: 0 });
  // Clock went back an hour: move on one leg and re-anchor so the next turn is one leg away.
  const r = nextLeg(10_000_000, 1000, 50, 6_400_000);
  expect(r.n).toBe(51);
  expect(msToLeg(r.t0, 1000, r.n + 1, 6_400_000)).toBe(1000);
});
