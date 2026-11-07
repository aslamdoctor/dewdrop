import { test, expect } from "bun:test";
import { seasonOf, clockText, workingCount, statusLook, HOTBAR_KEYS, slotLabel, hotbarSlots,
  slotTooltip, headerTitle, chickenMood } from "../mods/stardew/logic.js";

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

test("hotbarSlots keys the first 12 only", () => {
  expect(hotbarSlots([])).toEqual([]);
  const spaces = Array.from({ length: 13 }, (_, i) => ({ id: `s${i}`, name: `space${i}`, active: i === 0, status: null }));
  const slots = hotbarSlots(spaces);
  expect(slots).toHaveLength(13);
  expect(HOTBAR_KEYS).toHaveLength(12);
  expect(slots[0]).toEqual({ id: "s0", label: "spac", key: "1", active: true, status: null });
  expect(slots[11].key).toBe("=");
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
