import { test, expect } from "bun:test";
import layout from "../layouts/dewdrop.json";
import { layoutFor, lookOfLayout } from "../mods/dewdrop/logic.js";

const find = (n, id) => n.id === id ? n : (n.children ?? []).map((c) => find(c, id)).find(Boolean);

test("the shipped layout is the day look", () => {
  expect(lookOfLayout(layout)).toBe("day");
  expect(find(layout, "hotbar").background).toBeUndefined();
  expect(find(layout, "peek-spacer").hidden).toBe(true);
  expect(layout.terminal_opacity).toBe(0.85);
  expect(layoutFor(layout, "day")).toEqual(layout);
});

test("layoutFor night swaps the scene and pane colors only", () => {
  const before = structuredClone(layout);
  const n = layoutFor(layout, "night");
  expect(layout).toEqual(before);
  expect(find(n, "valley").background.image).toBe("mods/dewdrop/art/scene-night.png");
  expect(find(n, "main").content.pane).toMatchObject({ background: "#0b0b1a", border: { width: 3, color: "#2b1d14" }, focus: { width: 3, color: "#f2c14e" } });
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
