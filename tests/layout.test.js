import { test, expect } from "bun:test";
import layout from "../layouts/dewdrop.json";
import { layoutFor, lookOfLayout, sceneOfLayout, needsSwap, makeSyncer, sceneRows, DEFAULT_ROWS } from "../mods/dewdrop/logic.js";

const find = (n, id) => n.id === id ? n : (n.children ?? []).map((c) => find(c, id)).find(Boolean);

test("the shipped layout is the day look", () => {
  expect(lookOfLayout(layout)).toBe("day");
  expect(find(layout, "hotbar").background).toBeUndefined();
  expect(find(layout, "peek-spacer").hidden).toBe(true);
  // The pane background carries the mock's alpha, so the terminal paints none of its own
  // and the scene shows through the pane as in the mock.
  expect(layout.terminal_opacity).toBe(0);
  expect(find(layout, "main").content.pane.background).toBe("#20160fdb");
  expect(find(layout, "main").content.pane.header.height).toBe(28);
  expect(layoutFor(layout, "day")).toEqual(layout);
});

test("the sky strip sits above the panes and the pet has no float", () => {
  const valley = find(layout, "valley");
  expect(valley.children.map((c) => c.id)).toEqual(["sky", "main", "peek-spacer", "hotbar"]);
  expect(valley.children[0]).toEqual({ id: "sky", type: "block", size: { px: 48 }, content: { mod: "dewdrop", props: { role: "sky" } } });
  expect(valley.floating).toBeUndefined();
  expect(JSON.stringify(layout)).not.toContain("\"pet\"");
  // The look swap still finds its nodes and leaves the sky alone.
  const n = layoutFor(layout, "night");
  expect(lookOfLayout(n)).toBe("night");
  expect(find(n, "sky")).toEqual(find(layout, "sky"));
  expect(layoutFor(n, "day")).toEqual(layout);
});

test("layoutFor night swaps the scene and pane colors only", () => {
  const before = structuredClone(layout);
  const n = layoutFor(layout, "night");
  expect(layout).toEqual(before);
  expect(find(n, "valley").background.image).toBe("mods/dewdrop/art/scene/night-460.png");
  expect(find(n, "main").content.pane).toMatchObject({ background: "#0b0b1ad6", border: { width: 3, color: "#2b1d14" }, focus: { width: 3, color: "#f2c14e" } });
  expect(find(n, "peek-spacer")).toEqual(find(layout, "peek-spacer"));
  expect(lookOfLayout(n)).toBe("night");
});

test("layoutFor keeps everything else", () => {
  const edited = structuredClone(layout);
  find(edited, "titlebar").size = { px: 44 };
  edited.font_size = 16;
  const n = layoutFor(edited, "night");
  expect(layoutFor(n, "day")).toEqual(edited);
});

test("layoutFor on a foreign tree", () => {
  expect(layoutFor({ id: "root", type: "column", children: [] }, "night")).toBeNull();
  expect(lookOfLayout({ id: "root" })).toBeNull();
});

test("needsSwap writes only when the look changes", () => {
  const night = layoutFor(layout, "night");
  expect(needsSwap(layout, new Date(2026, 10, 8, 19, 0))).toEqual({ look: "night", rows: 460 });
  expect(needsSwap(night, new Date(2026, 10, 8, 19, 1))).toBeNull();
  expect(needsSwap(night, new Date(2026, 10, 9, 6, 0))).toEqual({ look: "day", rows: 460 });
  expect(needsSwap(layout, new Date(2026, 10, 8, 12, 0))).toBeNull();
  expect(needsSwap({ id: "root" }, new Date(2026, 10, 8, 19, 0))).toBeNull();
});

test("needsSwap flips at 6:00 and 18:00", () => {
  const night = layoutFor(layout, "night");
  expect(needsSwap(night, new Date(2026, 10, 8, 5, 59))).toBeNull();
  expect(needsSwap(night, new Date(2026, 10, 8, 6, 0))).toEqual({ look: "day", rows: 460 });
  expect(needsSwap(layout, new Date(2026, 10, 8, 17, 59))).toBeNull();
  expect(needsSwap(layout, new Date(2026, 10, 8, 18, 0))).toEqual({ look: "night", rows: 460 });
});

test("syncWith writes once for two ticks", () => {
  const sync = makeSyncer();
  const writes = [];
  const t = new Date(2026, 10, 8, 19, 0);
  sync(t, () => layout, (n) => writes.push(n));
  sync(t, () => layout, (n) => writes.push(n));
  expect(writes.length).toBe(1);
  expect(lookOfLayout(writes[0])).toBe("night");
});

test("a throwing write releases the guard", () => {
  const sync = makeSyncer();
  const t = new Date(2026, 10, 8, 19, 0);
  expect(() => sync(t, () => layout, () => { throw new Error("x"); })).toThrow();
  const writes = [];
  sync(t, () => layout, (n) => writes.push(n));
  expect(writes.length).toBe(1);
});

test("a matching look writes nothing", () => {
  const sync = makeSyncer();
  let n = 0;
  sync(new Date(2026, 10, 8, 12, 0), () => layout, () => n++);
  sync(new Date(2026, 10, 8, 19, 0), () => layoutFor(layout, "night"), () => n++);
  expect(n).toBe(0);
});

test("a write that did nothing retries after 90 seconds", () => {
  const sync = makeSyncer();
  let n = 0;
  const t = new Date(2026, 10, 8, 19, 0, 0);
  sync(t, () => layout, () => n++);
  sync(new Date(+t + 30000), () => layout, () => n++);
  expect(n).toBe(1);
  sync(new Date(+t + 91000), () => layout, () => n++);
  expect(n).toBe(2);
});

test("a look that already matches clears pending", () => {
  const sync = makeSyncer();
  let n = 0;
  const t = new Date(2026, 10, 8, 19, 0, 0);
  sync(t, () => layout, () => n++);
  expect(n).toBe(1);
  // The layout now wears night, so pending clears. If it is reset to day soon after
  // (inside the 90s window), the syncer writes again instead of waiting.
  sync(new Date(+t + 10000), () => layoutFor(layout, "night"), () => n++);
  sync(new Date(+t + 20000), () => layout, () => n++);
  expect(n).toBe(2);
});

test("sceneRows picks the drawn height closest to 3pt per art pixel", () => {
  expect(sceneRows(1369)).toBe(460);
  expect(sceneRows(900)).toBe(300);
  expect(sceneRows(0)).toBe(DEFAULT_ROWS);
  expect(sceneRows(undefined)).toBe(DEFAULT_ROWS);
  expect(sceneRows(10)).toBe(240);
  expect(sceneRows(99999)).toBe(560);
});

test("a new window height swaps the scene but keeps the look", () => {
  const noon = new Date(2026, 10, 8, 12, 0);
  expect(needsSwap(layout, noon, 300)).toEqual({ look: "day", rows: 300 });
  expect(needsSwap(layout, noon, 460)).toBeNull();
  expect(needsSwap(layout, noon)).toBeNull();
  const sync = makeSyncer();
  const writes = [];
  sync(noon, () => layout, (n) => writes.push(n), 300);
  expect(writes.length).toBe(1);
  expect(sceneOfLayout(writes[0])).toEqual({ look: "day", rows: 300 });
  expect(layoutFor(writes[0], "night")).toBeTruthy();
  expect(sceneOfLayout(layoutFor(writes[0], "night"))).toEqual({ look: "night", rows: 300 });
});
