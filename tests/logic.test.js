import { test, expect } from "bun:test";
import { seasonOf, clockText, workingCount, statusLook, HOTBAR_KEYS, slotLabel, hotbarSlots,
  slotTooltip, cropOf, CROPS, msToNextLook, headerTitle, chickenMood, msToNextMinute, CLOCK, lookOf, tabStrip, agentCounts } from "../mods/dewdrop/logic.js";

test("lookOf flips at 6:00 and 18:00", () => {
  expect(lookOf(new Date(2026, 10, 8, 5, 59))).toBe("night");
  expect(lookOf(new Date(2026, 10, 8, 6, 0))).toBe("day");
  expect(lookOf(new Date(2026, 10, 8, 17, 59))).toBe("day");
  expect(lookOf(new Date(2026, 10, 8, 18, 0))).toBe("night");
  expect(lookOf(new Date(2026, 10, 8, 0, 0))).toBe("night");
});

test("seasonOf flips on month boundaries", () => {
  expect(seasonOf(new Date(2026, 1, 28))).toBe("winter");
  expect(seasonOf(new Date(2026, 2, 1))).toBe("spring");
  expect(seasonOf(new Date(2026, 5, 1))).toBe("summer");
  expect(seasonOf(new Date(2026, 10, 30))).toBe("fall");
  expect(seasonOf(new Date(2026, 11, 1))).toBe("winter");
});

test("clockText formats day, 12-hour time and season", () => {
  expect(clockText(new Date(2026, 10, 7, 18, 5))).toEqual({ day: "Sat. 7", time: "6:05 pm", season: "Fall" });
  expect(clockText(new Date(2026, 10, 7, 0, 0)).time).toBe("12:00 am");
  expect(clockText(new Date(2026, 10, 7, 12, 0)).time).toBe("12:00 pm");
});

test("workingCount counts working agents", () => {
  expect(workingCount([{ status: "working" }, { status: "idle" }, { status: "working" }])).toBe(2);
  expect(workingCount([])).toBe(0);
});

test("statusLook maps the four states and nothing else", () => {
  expect(statusLook("working")).toEqual({ icon: "can", color: "sky" });
  expect(statusLook("blocked")).toEqual({ icon: "bang", color: "red" });
  expect(statusLook("done")).toEqual({ icon: "star", color: "gold" });
  expect(statusLook("idle")).toEqual({ icon: "zzz", color: "idle" });
  expect(statusLook(null)).toBeNull();
  expect(statusLook("unknown")).toBeNull();
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

// Widest text in Pixelify Sans: "Wed. 30  12:59 pm" at 13px is 103.1px, "Summer" at 12px is 46.5px.
test("clock box leaves room for the widest day, time and season", () => {
  expect(CLOCK.split - 8 - 2).toBeGreaterThanOrEqual(104);
  expect(CLOCK.w - CLOCK.split - 2 - 6).toBeGreaterThanOrEqual(48);
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
  expect(agentCounts([{ status: "working" }, { status: "blocked" }], [{ status: "working" }])).toEqual({ working: 2, blocked: 1 });
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
