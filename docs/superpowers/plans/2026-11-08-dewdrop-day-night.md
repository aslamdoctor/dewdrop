# Dewdrop (day and night valley) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the `stardew` Herdr layout as **Dewdrop**: a pixel-art valley that swaps between a day and a night scene on the clock, tabs in the title bar, a hotbar with the user's portrait, crop slots and tool buttons, a picture picker, a pet chooser and an agents popup.

**Architecture:** One mod, `mods/dewdrop`, drawn by role (as today). Pure helpers live in `logic.js`, `cast.js` and `pets.js` and are unit-tested with bun; the role files only render. All art is pre-rendered by bun scripts in `scripts/` into `mods/dewdrop/art/` (PNG scenes, pet frames and pictures; crisp SVG sprites). The layout puts the scene on one `valley` column behind the panes and the hotbar; at the 6:00 and 18:00 flip the title bar role rewrites that one image path and the pane colors through `layout.set` (confirmed or replaced by the spike in Task 1).

**Tech Stack:** Herdr desktop 0.1.13 mods (gpui-kit JS, `herdr` module), bun 1.x (`bun test`, scripts), ImageMagick `magick` (portrait crop only), `node:zlib` (PNG encoding).

**Spec:** `docs/superpowers/specs/2026-11-07-stardew-day-night-design.md` (approved 2026-11-08). Visual target: `~/Downloads/generated-html-files/stardew-previews/scenery.html` with `art.js` and `cast/`. Read both before any task. API references: `~/.config/herdr-app/AGENTS.md`, `~/.config/herdr-app/herdr.d.ts`, `mods/dewdrop/gpui-kit.d.ts` (22k lines, search it, don't read it whole).

## Global Constraints

- Herdr desktop app 0.1.13; mods in gpui-kit; `herdr-app check <mod>` must pass after every task that touches the mod.
- Tests: `bun test` from the repo root, all green at every commit.
- Install copies files with `scripts/install.sh` (symlinks don't hot-reload); rerun it before looking at the app.
- Day is hours 6 to 17 local time, night otherwise.
- Nothing may move when day flips to night. Only colors and images swap.
- Nothing from Stardew Valley: no sprites, characters, UI, logo, fonts or place names. User-facing text says "Dewdrop", never "Stardew" (the gallery description may say "inspired by Stardew Valley").
- Mod id, layout id and theme id are `dewdrop`; all paths are `mods/dewdrop/...`.
- Every picture, pet icon, space slot and tool button has a 2px `#3b2418` border, never black or light wood. Chosen/selected marks use gold `#e8c65a`. Nothing lifts on hover or when chosen.
- Pixel art is crisp: no anti-aliasing, gradients or blur, three or four flat tones per material, `#3b2418` outlines. The user's portrait and the 24 farmhand pictures are the exception and scale smoothly.
- The working chip and the clock box never wrap or shrink; tabs shrink to 52px minimum instead; the "more" and "+" chips keep their size.
- Controls inside the title bar stop mouse-down propagation (`cx.stop_propagation()`), since the bar is a window drag area.
- Scrolling areas never show the native scrollbar look; use the styled bar from Task 1's findings.
- No sound effects in this phase.
- Commits: conventional prefix (`feat:`, `fix:`, `test:`, `chore:`, `docs:`), one logical change each, no Claude or AI co-author or "Generated with" lines.
- `RECIPE.md` and the gallery description go through the humanizer skill before they are committed.

## Review Focus

1. **No active space or a space with no tabs** (app start, last tab closed): the title bar shows only the "+" chip and the clock, and nothing throws. Test `tabStrip([])` in Task 7; render guard in Task 7 Step 3.
2. **The laptop sleeps across 18:00, or the app starts at night:** the first tick after wake, and the first render on start, pick the right scene; a tick with the right scene already showing writes nothing. Test `needsSwap` in Task 6.
3. **The user has resized, hidden or hand-edited the layout:** the swap changes only the scene image and the pane colors and keeps every other field; a tree without a `valley` node is left alone. Tests `layoutFor keeps everything else` and `layoutFor on a foreign tree` in Task 5.
4. **Agents with no app, or an app nobody mapped** (`pi`, `null`, a plain program): they get Milo Patches' face and name. Test `faceOf falls back` in Task 3.
5. **Emoji and CJK in space and tab names:** slot labels cut by characters, not UTF-16 units, so an emoji is never split into a broken glyph. Test `slotLabel keeps emoji whole` in Task 8.

---

### Task 1: Spike the open technical questions

Throwaway code; nothing here is committed except the notes file. Work on a scratch copy of the current installed `stardew` layout in `~/.config/herdr-app/layouts/dewdrop-spike.json` with a scratch mod `mods/dewdrop-spike` (copy of the current mod).

**Files:**
- Create: `docs/superpowers/notes/2026-11-08-dewdrop-spike.md`

**Interfaces:**
- Produces: the notes file, which Tasks 5, 6, 8, 9, 10 and 11 read. Each question below gets a line "Answer: ..." and, when the answer is no, "Use: ..." naming the fallback.

- [ ] **Step 1: Valley background.** Make the spike layout `root column → titlebar 40px, valley column {background: {image, fit: cover}} → main block, hotbar 64px` with no background on `main` or `hotbar`. Question: does the valley image paint behind both main and hotbar? Check with `herdr-app shot`.
- [ ] **Step 2: Live swap.** From the spike mod, on a click, call `run("layout.set", { layout })` with `layout()` deep-copied and only the valley image path and the tab block's `pane.border.color` changed. Questions: does it apply without a restart; does any block, pane, floating spot or scroll position move; does it reset the person's clicks? If no, try candidate 2 (`writeTextFile` of `layouts/dewdrop-spike.json` with the read snapshot as `expected`), then 3 (two layouts and `layout.switch`). Record which one works.
- [ ] **Step 3: Peek.** Run `layout.toggle {id: "main"}`. Question: is the valley scene visible where the panes were, and does the hotbar stay at the bottom?
- [ ] **Step 4: Floating pet strip.** Put a floating block on `valley` (`edge: "bottom"`, `align: "end"`) rendering a 240x48 strip. Questions: does Herdr's floating frame (background, border, shadow) show around it; can the strip be transparent? If the frame shows, record "Use: the pet stays in a 56x48 box and walks in place".
- [ ] **Step 5: Image scaling.** Show a 24x20 test sprite saved at 4x (96x80) at 48x40 and a 320x188 scene saved at 6x on cover. Question: does gpui scale images smoothly or nearest? Record whether pre-rendering at 4x is enough to keep pixels crisp.
- [ ] **Step 6: Scrollbar look.** Build an `h_flex().id("x").overflow_x_scroll()` with a `Scrollbar.horizontal("x")` placed in an 8px-high `div` with `bg("#2b1d14")`. Question: which theme color keys paint the thumb (look at `~/.config/herdr-app/AGENTS.md` theme section and try `scrollbar`/`scrollbar_thumb` keys in the spike theme)? Record the keys, or "Use: theme thumb color as is".
- [ ] **Step 7: Helper terminals.** Run `hc ls --json` with an agent that has a helper started by `hc run`. Record the field names for address, parent, title/name and status.
- [ ] **Step 8: Scroll to end.** Question: can a mod scroll a plain `overflow_x_scroll` row to its end (search gpui-kit.d.ts for scroll offset APIs; `VirtualListScrollHandle.scroll_to_item` works only with a virtual list)? Record the API, or "Use: no auto-scroll; the new slot is reachable by scrolling".
- [ ] **Step 9: Clean up and commit the notes.** Remove `layouts/dewdrop-spike.json` and `mods/dewdrop-spike` from the Herdr home.

```bash
git add docs/superpowers/notes/2026-11-08-dewdrop-spike.md
git commit -m "docs: record the dewdrop spike findings"
```

### Task 2: Rename stardew to dewdrop

**Files:**
- Move: `mods/stardew` → `mods/dewdrop`, `layouts/stardew.json` → `layouts/dewdrop.json`, `themes/stardew.json` → `themes/dewdrop.json` (`git mv`)
- Delete: `layouts/stardew.svg` (the preview is regenerated in Task 13)
- Modify: `mods/dewdrop/art.js`, `mods/dewdrop/main.js`, every `stardew-*` element id in the role files, `layouts/dewdrop.json` (`content.mod`, image paths, `theme`, drop `preview` until Task 13), `scripts/install.sh`, `scripts/draw-art.js`, `scripts/compose-farm.js`, `package.json` (`"name": "herdr-dewdrop"`), `tests/logic.test.js`, `tests/assets.test.js`

**Interfaces:**
- Produces: `ART === "mods/dewdrop/art"`; `export default class Dewdrop` in `main.js`; ids prefixed `dewdrop-`.

- [ ] **Step 1: Update the path tests first.** In `tests/assets.test.js` change the expectations to `expect(ART).toBe("mods/dewdrop/art")`, `expect(art("can-0")).toBe("mods/dewdrop/art/can-0.svg")`, `expect(png("farm")).toBe("mods/dewdrop/art/farm.png")`, and every import to `../mods/dewdrop/...` and `../themes/dewdrop.json`, `../layouts/dewdrop.json`.
- [ ] **Step 2: Run** `bun test`. Expected: FAIL, cannot resolve `../mods/dewdrop/logic.js`.
- [ ] **Step 3: Do the moves and edits listed above.** `install.sh`: `ITEMS=(layouts/dewdrop.json themes/dewdrop.json mods/dewdrop)` plus an `OLD=(layouts/stardew.json layouts/stardew.svg themes/stardew.json mods/stardew)` list that is removed from the Herdr home on every run, so the old copy doesn't linger. The "no role" fallback text says `dewdrop: no role "<role>" yet`. The title bar text becomes "Dewdrop" for now (it goes in Task 7).
- [ ] **Step 4: Verify.** `bun test` passes; `rg -i stardew mods layouts themes scripts tests package.json` prints only the `OLD` list in `install.sh`; `scripts/install.sh && herdr-app check dewdrop` passes; `herdr-app do layout.switch '{"name":"dewdrop"}'` shows the old look unchanged.
- [ ] **Step 5: Commit.**

```bash
git add -A mods layouts themes scripts tests package.json
git commit -m "chore: rename the stardew layout to dewdrop"
```

### Task 3: Look, palettes and the cast

**Files:**
- Modify: `mods/dewdrop/logic.js`, `mods/dewdrop/palette.js`
- Create: `mods/dewdrop/cast.js`
- Test: `tests/logic.test.js`, `tests/assets.test.js`, `tests/cast.test.js`

**Interfaces:**
- Produces:
  - `lookOf(date: Date): "day" | "night"` in `logic.js`.
  - `palette.js`: `C` unchanged (the theme still uses it); `INK = "#3b2418"`; `GOLD_LINE = "#e8c65a"`; `STATUS = { working: "#5fa8d3", blocked: "#d9534f", done: "#f2c14e", idle: "#9c7b5b" }`; `LOOK = { day: {...}, night: {...} }` with the keys and values of the mock's `UI` object (scenery.html, `const UI`), with `pane` stored as a hex (`day: "#20160f"`, `night: "#0b0b1a"`) since the alpha comes from `terminal_opacity`; `dotColor(status: Status | null): string` returning `STATUS[status ?? "idle"]`, unknown statuses idle too.
  - `cast.js`: `CAST: { name: string, role: string, file: string }[]` of length 25, index 0 `{ name: "Aslam Doctor", role: "Developer", file: "portrait" }`, then the 24 farmhands in the spec's order with `file` `"cast/01"` .. `"cast/24"`; `APP_FACE = { "claude-code": 1, codex: 16, opencode: 24 }` (CAST indexes); `FALLBACK_FACE = 19` (Milo Patches); `faceOf(app: string | null): { name, role, file }`; `pictureIndex(v: unknown): number` (0..24, anything else is 0).

- [ ] **Step 1: Write the failing tests.**

```js
// tests/logic.test.js
test("lookOf flips at 6:00 and 18:00", () => {
  expect(lookOf(new Date(2026, 10, 8, 5, 59))).toBe("night");
  expect(lookOf(new Date(2026, 10, 8, 6, 0))).toBe("day");
  expect(lookOf(new Date(2026, 10, 8, 17, 59))).toBe("day");
  expect(lookOf(new Date(2026, 10, 8, 18, 0))).toBe("night");
  expect(lookOf(new Date(2026, 10, 8, 0, 0))).toBe("night");
});

// tests/assets.test.js
test("day and night palettes match the mock", () => {
  expect(LOOK.day).toMatchObject({ bar: "#8a5a2b", barLight: "#c58b4e", border: "#6b4420", focus: "#f2c14e", trim: "#c58b4e", ring: "#d9534f", pane: "#20160f" });
  expect(LOOK.night).toMatchObject({ bar: "#3a2718", barLight: "#5a3c25", border: "#2b1d14", focus: "#f2c14e", trim: "#f2c14e", ring: "#f2c14e", pane: "#0b0b1a" });
  expect(Object.keys(LOOK.day).sort()).toEqual(Object.keys(LOOK.night).sort());
  expect([INK, GOLD_LINE]).toEqual(["#3b2418", "#e8c65a"]);
});

test("dotColor gives idle for null and unknown", () => {
  expect(dotColor("working")).toBe("#5fa8d3");
  expect(dotColor(null)).toBe("#9c7b5b");
  expect(dotColor("weird")).toBe("#9c7b5b");
});

// tests/cast.test.js
test("cast has the user first and 24 farmhands in order", () => {
  expect(CAST).toHaveLength(25);
  expect(CAST[0]).toEqual({ name: "Aslam Doctor", role: "Developer", file: "portrait" });
  expect(CAST[1]).toEqual({ name: "Orion Vale", role: "Hacker", file: "cast/01" });
  expect(CAST[24]).toEqual({ name: "BEEP-09", role: "Robot", file: "cast/24" });
  expect(CAST[19].name).toBe("Milo Patches");
});

test("faceOf maps apps and falls back", () => {
  expect(faceOf("claude-code").name).toBe("Orion Vale");
  expect(faceOf("codex").name).toBe("Unit K-47");
  expect(faceOf("opencode").name).toBe("BEEP-09");
  expect(faceOf("pi").name).toBe("Milo Patches");
  expect(faceOf(null).name).toBe("Milo Patches");
});

test("pictureIndex clamps bad stored values to 0", () => {
  expect(pictureIndex(7)).toBe(7);
  for (const v of [undefined, null, -1, 25, 2.5, "3", {}]) expect(pictureIndex(v)).toBe(0);
});
```

- [ ] **Step 2: Run** `bun test`. Expected: FAIL, `lookOf` / `LOOK` / `CAST` not exported.
- [ ] **Step 3: Implement** the exports listed under Interfaces.
- [ ] **Step 4: Run** `bun test`. Expected: PASS.
- [ ] **Step 5: Commit.**

```bash
git add mods/dewdrop/logic.js mods/dewdrop/palette.js mods/dewdrop/cast.js tests
git commit -m "feat: add the day and night looks and the cast list"
```

### Task 4: Art pipeline (scenes, pictures, pets, sprites)

**Files:**
- Create: `scripts/png.js`, `scripts/draw-scenes.js`, `scripts/render-pictures.js`
- Modify: `scripts/draw-art.js` (new sprite set), `mods/dewdrop/art.js`, `mods/dewdrop/palette.js` (sprite color key)
- Create (generated, committed): `mods/dewdrop/art/scene-day.png`, `scene-night.png`, `portrait.png`, `cast/01.png`..`cast/24.png`, `pets/<pet>-<frame>.png`, `doghouse.png`, and SVGs `window`, `sun`, `moon`, `season-spring`, `season-summer`, `season-fall`, `season-winter`, `crop-carrot`, `crop-pumpkin`, `crop-wheat`, `crop-sprout`, `crop-tomato`, `crop-corn`, `tool-plus`, `tool-folder`, `tool-eye`, `tool-eye-off`
- Delete: `assets/pixelfarm/`, `scripts/compose-farm.js`, `art/farm.png`, `art/hotbar-field.png`, `art/can-0.svg`, `can-1.svg`, `bang.svg`, `star.svg`, `zzz.svg`, `plank.svg`, `clock.svg`, `slot.svg`, `chicken-0.svg`, `chicken-1.svg`. Keep `heart.svg`, `btn-zoom.svg`, `btn-close.svg`.
- Modify: `mods/dewdrop/art/CREDITS.md` (PixelFarm entry goes; list Pixelify Sans (OFL) and "pictures supplied by the user")
- Test: `tests/png.test.js`, `tests/assets.test.js`

**Interfaces:**
- Consumes: `INK`, `GOLD_LINE`, `STATUS` from Task 3.
- Produces:
  - `scripts/png.js`: `encodePNG(width: number, height: number, rgba: Uint8Array): Buffer` (RGBA8, `deflateSync` from `node:zlib`, CRC32 table in the file); `scaleNearest(width, height, rgba, k): { width, height, rgba }`.
  - `art.js`: `art(name)` → `mods/dewdrop/art/<name>.svg`; `png(name)` → `.../<name>.png`; `pic(file)` → `png(file)` for CAST files; `petFrame(pet, frame)` → `png(\`pets/${pet}-${frame}\`)`; `PET_FRAMES` re-exported from `pets.js` (Task 10 creates it; until then define it here and move it).
  - `palette.js`: `SPRITE` color key `{ o: INK, ... }` holding every hex the SVG sprites use (the mock's `CPAL`, plus the `WINDOW`, `SUNI`, `MOONI`, `LEAF` and tool colors).
- Scene source: port `buildSky`, `buildLand`, `Buf`, the dither helpers and a static `clouds` (t = 0) and `stars` (t = 0, night only) from `scenery.html` into `draw-scenes.js`. Leave out the tractor, birds, fireflies and smoke (they move). Render 320x188, scale 6x nearest → 1920x1128 (or the scale Task 1 Step 5 recorded).
- Pictures: `portrait.png` is cropped with `magick` from `~/Downloads/Pixel Portrait Grid of a Bearded Farmer.png`, first tile (about x 12..503, y 14..500; trim the white gutter exactly: crop, then `-fuzz 8% -trim`, then square-pad), resized to 192x192 with smooth filtering. The 24 farmhands are copied from `~/Downloads/generated-html-files/stardew-previews/cast/` (already 192x192 crops of the user's sheet). Pets: port the `PET` drawings, `doghouse()`, and their helpers from `art.js` (the preview one), replacing its `toURL` canvas with `encodePNG(scaleNearest(..., 4))`, so each 24x20 frame is 96x80.
- Small sprites: `draw-art.js` writes each from a row grid (the mock's `WINDOW`, `SUNI`, `MOONI`, `LEAF`, `CROPS`, `PLUS`, `FOLDER`, `EYE`, `EYEOFF`); draw a spring blossom and a winter snowflake in the same 9x9 style. Season summer uses `SUNI`.

- [ ] **Step 1: Write the failing tests.**

```js
// tests/png.test.js
test("encodePNG writes a valid header with the right size", () => {
  const b = encodePNG(3, 2, new Uint8Array(3 * 2 * 4).fill(255));
  expect([...b.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect([b.readUInt32BE(16), b.readUInt32BE(20)]).toEqual([3, 2]);
});

test("scaleNearest repeats each pixel k times", () => {
  const r = scaleNearest(1, 1, new Uint8Array([1, 2, 3, 4]), 2);
  expect([r.width, r.height]).toEqual([2, 2]);
  expect([...r.rgba]).toEqual([1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4]);
});

// tests/assets.test.js (replace the PixelFarm, NAMES and clock.svg tests)
const SVGS = ["window", "sun", "moon", "season-spring", "season-summer", "season-fall", "season-winter",
  "crop-carrot", "crop-pumpkin", "crop-wheat", "crop-sprout", "crop-tomato", "crop-corn",
  "tool-plus", "tool-folder", "tool-eye", "tool-eye-off", "heart", "btn-zoom", "btn-close"];
const ALLOWED = new Set([...Object.values(C), ...Object.values(SPRITE), ...Object.values(STATUS), INK, GOLD_LINE, "#000000", "#ffffff"]);
// keep "sprites are crisp SVGs in palette colors" with this ALLOWED set

test("scenes cover the window at the pixel scale", () => {
  for (const n of ["scene-day", "scene-night"]) expect(pngSize(`${ART_DIR}${n}.png`)).toEqual([1920, 1128]);
});

test("pictures and pet frames exist at their sizes", () => {
  for (const c of CAST) expect(pngSize(`${ART_DIR}${c.file}.png`)).toEqual([192, 192]);
  for (const [pet, frames] of Object.entries(PET_FRAMES)) for (const f of frames) expect(pngSize(`${ART_DIR}pets/${pet}-${f}.png`)).toEqual([96, 80]);
  expect(pngSize(`${ART_DIR}doghouse.png`)).toEqual([96, 80]);
});

test("no PixelFarm leftovers", () => {
  expect(existsSync(new URL("../assets/pixelfarm", import.meta.url).pathname)).toBe(false);
  expect(readFileSync(`${ART_DIR}CREDITS.md`, "utf8")).not.toContain("PixelFarm");
});
```

`PET_FRAMES` is `{ chicken: ["a","b","act"], duck: ["a","b","act"], cat: ["a","b","nap"], dog: ["a","b","wag"], rabbit: ["a","hop","act"], turtle: ["a","b","hide"], frog: ["a","hop","act"] }`.

- [ ] **Step 2: Run** `bun test`. Expected: FAIL (missing `scripts/png.js`, missing art files).
- [ ] **Step 3: Implement** `scripts/png.js`, then the three scripts, then run them: `bun scripts/draw-scenes.js && bun scripts/render-pictures.js && bun scripts/draw-art.js`. Delete the files listed above.
- [ ] **Step 4: Run** `bun test`. Expected: PASS. Then open `mods/dewdrop/art/scene-day.png`, `scene-night.png` and one pet frame and compare them with the mock side by side (agent-browser screenshot of `scenery.html` at 1280x900 scale 2). The scene must read as the mock's: sky, two mountain ranges with snow, field with crop rows and trees, fence, dirt road at the bottom.
- [ ] **Step 5: Commit** (art and scripts together; the header and hotbar still point at deleted sprites until Tasks 8 and 9, so they render blank icons in between, which is fine on this branch).

```bash
git add -A scripts mods/dewdrop assets tests
git commit -m "feat: render the dewdrop scenes, pictures, pets and sprites"
```

### Task 5: The layout, theme and layoutFor

**Files:**
- Modify: `layouts/dewdrop.json`, `themes/dewdrop.json`, `mods/dewdrop/logic.js`
- Test: `tests/layout.test.js` (new), `tests/assets.test.js` (drop the old "layout uses the PixelFarm backgrounds" test)

**Interfaces:**
- Consumes: `LOOK` (Task 3), `png` (Task 4), Task 1 notes Steps 1 to 4.
- Produces:
  - Layout tree: `root column` → `titlebar` (40px, `window_drag`, role `titlebar`), `valley` column (`background: { image: "mods/dewdrop/art/scene-day.png", fit: "cover" }`, `floating: [{ id: "pet", content: { mod: "dewdrop", props: { role: "pet" } }, edge: "bottom", align: "end" }]`) → `main` block (padding [16,16], `content.tab: "active"`, pane gap 10, radius 0, `background: LOOK.day.pane`, `border: { width: 3, color: LOOK.day.border }`, `focus: { width: 3, color: LOOK.day.focus }`, `lone: true`, header role `header` height 26 reveal always) and `hotbar` block (64px, role `hotbar`, no background). Root: `terminal_opacity: 0.85`, the rest of the root look as today, `theme: "dewdrop"`. If Task 1 said the valley background doesn't paint behind the hotbar, follow its "Use:" line instead.
  - `logic.js`: `layoutFor(tree: object, look: "day" | "night"): object | null`: a deep copy with only `valley.background.image` = `png("scene-" + look)`, and `main.content.pane.background`, `.border.color`, `.focus.color` from `LOOK[look]`. Returns `null` when the tree has no `valley` or no `main` node. Never mutates its input.
  - `lookOfLayout(tree: object): "day" | "night" | null`: reads the valley image path.

- [ ] **Step 1: Write the failing tests.**

```js
// tests/layout.test.js
import layout from "../layouts/dewdrop.json";
const find = (n, id) => n.id === id ? n : (n.children ?? []).map((c) => find(c, id)).find(Boolean);

test("the shipped layout is the day look", () => {
  expect(lookOfLayout(layout)).toBe("day");
  expect(find(layout, "hotbar").background).toBeUndefined();
  expect(layout.terminal_opacity).toBe(0.85);
  expect(layoutFor(layout, "day")).toEqual(layout);
});

test("layoutFor night swaps the scene and pane colors only", () => {
  const before = structuredClone(layout);
  const n = layoutFor(layout, "night");
  expect(layout).toEqual(before);
  expect(find(n, "valley").background.image).toBe("mods/dewdrop/art/scene-night.png");
  expect(find(n, "main").content.pane).toMatchObject({ background: "#0b0b1a", border: { width: 3, color: "#2b1d14" }, focus: { width: 3, color: "#f2c14e" } });
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
```

- [ ] **Step 2: Run** `bun test tests/layout.test.js`. Expected: FAIL.
- [ ] **Step 3: Rewrite `layouts/dewdrop.json`** as above and **implement** `layoutFor` and `lookOfLayout`. Theme: keep the `C`-based colors; add the scrollbar keys Task 1 Step 6 found, set to `C.wood` (thumb) and `C.soil` (track).
- [ ] **Step 4: Run** `bun test`. Expected: PASS. Then `scripts/install.sh && herdr-app check dewdrop`, switch to `dewdrop`, and `herdr-app shot`: the day scene fills behind the panes and the hotbar.
- [ ] **Step 5: Commit.**

```bash
git add layouts themes mods/dewdrop/logic.js tests
git commit -m "feat: put the valley scene behind the panes and the hotbar"
```

### Task 6: Swap the look on the clock

**Files:**
- Create: `mods/dewdrop/look.js`
- Modify: `mods/dewdrop/logic.js`, `mods/dewdrop/titlebar.js` (call it on start and on each tick)
- Test: `tests/layout.test.js`

**Interfaces:**
- Consumes: `lookOf`, `layoutFor`, `lookOfLayout`; Task 1 Step 2's chosen mechanism.
- Produces:
  - `needsSwap(tree: object, now: Date): "day" | "night" | null` in `logic.js`: the look to switch to, or null when the tree already shows `lookOf(now)` or is foreign.
  - `syncLook(): void` in `look.js`: reads `layout()`, and if `needsSwap` returns a look, applies `layoutFor(tree, look)` with the mechanism from Task 1 (default `run("layout.set", { layout })`). Holds a module-level `pending` look so a second tick before the layout reloads doesn't write again. A layout that isn't Dewdrop's (no `valley` node) is never touched, since `needsSwap` returns null for it.
  - Every role reads `lookOf(new Date())` at render time and picks `LOOK[look]`.

- [ ] **Step 1: Write the failing test.**

```js
test("needsSwap writes only when the look changes", () => {
  const night = layoutFor(layout, "night");
  expect(needsSwap(layout, new Date(2026, 10, 8, 19, 0))).toBe("night");
  expect(needsSwap(night, new Date(2026, 10, 8, 19, 1))).toBeNull();
  expect(needsSwap(night, new Date(2026, 10, 9, 6, 0))).toBe("day");
  expect(needsSwap(layout, new Date(2026, 10, 8, 12, 0))).toBeNull();
  expect(needsSwap({ id: "root" }, new Date(2026, 10, 8, 19, 0))).toBeNull();
});
```

- [ ] **Step 2: Run** `bun test tests/layout.test.js`. Expected: FAIL, `needsSwap` not exported.
- [ ] **Step 3: Implement** `needsSwap` and `look.js`; in `titlebar.js` call `syncLook()` once in `init` and at the top of each minute tick.
- [ ] **Step 4: Verify.** `bun test` passes. In the app: change the system time across 18:00 (or give `syncLook` an optional `now` argument and call it once with a fixed date); the scene and pane borders swap within a minute; `herdr-app shot` before and after shows no block, pane or floating spot moved; a following tick writes nothing (watch `layouts/.state/` or the layout file's mtime).
- [ ] **Step 5: Commit.**

```bash
git add mods/dewdrop tests
git commit -m "feat: swap the valley between day and night on the clock"
```

### Task 7: Title bar: tabs, working chip, clock box

**Files:**
- Create: `mods/dewdrop/tabs.js` (strip and the `tabmore` popup role)
- Modify: `mods/dewdrop/titlebar.js`, `mods/dewdrop/logic.js`, `mods/dewdrop/main.js` (add role `tabmore`)
- Test: `tests/logic.test.js`

**Interfaces:**
- Consumes: `LOOK`, `dotColor`, `art("sun" | "moon" | "season-*")`, `clockText`, `msToNextMinute`.
- Produces:
  - `MAX_TABS = 5`; `tabStrip(tabs: TabInfo[], max = MAX_TABS): { strip: TabInfo[], hidden: TabInfo[], settled: TabInfo[] }`. Rules: settled tabs never take a strip slot, except the active one; strip is the first `max` live tabs; if the active tab is not in it, it replaces the last strip slot; `hidden` is the other live tabs in order; `settled` the other settled tabs in order.
  - `agentCounts(agents: AgentInfo[], helpers: { status }[]): { working: number, blocked: number }` (helpers count too).
  - Role `tabmore` (popup, `openOverlay({ mod: "dewdrop", props: { role: "tabmore" }, kind: "popup", frame: "none" })`): hidden live rows first, then a "settled" heading and the settled rows dimmed; a click runs `tab.select {id}` and `closeOverlay(props().overlay)`.
  - Working chip: pulsing blue dot, `N working`, and a red dot with the blocked count when it is above 0; a click opens the `agents` popup (role from Task 11; until then the click is a no-op).
  - Clock box: sun icon by day, moon by night, time (14px), day and date (11px, muted), a divider, the season icon and name.

- [ ] **Step 1: Write the failing tests.**

```js
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
```

- [ ] **Step 2: Run** `bun test`. Expected: FAIL.
- [ ] **Step 3: Implement** the helpers, then the title bar: `pl(80)`, tab strip (`flex_shrink`, `min_w(0)`, `overflow_hidden`), flexible space, working chip and clock box (`flex_none`, `whitespace_nowrap`). Tab chips 86px wide, shrinking to `min_w(52)` with the name truncated; "more" and "+" are `flex_none`. Active chip uses `LOOK[look].tabOn`, others `tabOff`. A working dot pulses with `.loop("opacity", { from: 0.45, to: 1, period: 800 })`. "+" runs `tab.new { space: activeSpace.id }`. With no active space (`spaces()` empty or none active) the strip renders only "+" disabled and the chip and clock still render. The "more" chip shows `▾ N more` and small dots for hidden live tabs whenever `hidden` or `settled` is not empty.
- [ ] **Step 4: Verify.** `bun test` passes; `scripts/install.sh && herdr-app check dewdrop`; in the app with 1, 5 and 9 tabs and one settled tab, `herdr-app shot` at 960 and 1280 wide: chip and clock on one line, tabs shrink, the "more" popup lists hidden then settled (dimmed), clicking selects. Compare with the mock's title bar.
- [ ] **Step 5: Commit.**

```bash
git add mods/dewdrop tests
git commit -m "feat: show the space's tabs, working chip and clock in the title bar"
```

### Task 8: Hotbar: portrait, crop slots, tool buttons

**Files:**
- Modify: `mods/dewdrop/hotbar.js`, `mods/dewdrop/logic.js`
- Test: `tests/logic.test.js`

**Interfaces:**
- Consumes: `CAST`, `pictureIndex`, `pic`, `art("crop-*" | "tool-*")`, `LOOK`, `INK`, `GOLD_LINE`, `dotColor`, Task 1 Steps 3, 6 and 8.
- Produces:
  - `CROPS = ["carrot", "pumpkin", "wheat", "sprout", "tomato", "corn"]`; `cropOf(id: string): string`, FNV-1a 32-bit over the id's UTF-16 code units, mod `CROPS.length`.
  - `slotLabel(name)` cuts by code points: `[...name].slice(0, 4).join("").trim() || "?"`.
  - `hotbarSlots(spaces)` entries gain `crop: cropOf(s.id)`.
  - `slotTooltip(space, agents, key)`: as today, and the first line ends with ` (no ctrl key past nine)` when `key` is null.
  - Shared keys: `shared("dewdrop.picture")` (number) read through `pictureIndex`; `shared("dewdrop.panesHidden")` (boolean).
  - Tool buttons, left to right: "+ tab" (`tab.new`), "+ space" (`pickFolder({ prompt: "Pick a folder for the new space" })`, then `space.new { folder }`; `null` does nothing), peek (`layout.toggle { id: "main" }`, icon `tool-eye` / `tool-eye-off`, flips `dewdrop.panesHidden`), pet (opens role `petpick`, Task 10; icon is the current pet's `a` frame or the doghouse).
  - The portrait click opens role `picker` (Task 9).

- [ ] **Step 1: Write the failing tests.**

```js
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
```

Update the existing `hotbarSlots` test's expected object to include `crop: cropOf("s0")`.

- [ ] **Step 2: Run** `bun test`. Expected: FAIL.
- [ ] **Step 3: Implement** the helpers and rebuild `hotbar.js` after the mock: one centered box (`LOOK[look].bar` at 0.55 alpha, 3px black border, inset `trim` line), portrait 46px square (42px picture plus 2px `INK` border, gold trim at night), divider, the slot strip (max width nine slots, horizontal scroll with the styled bar from Task 1), divider, the four tool buttons. A slot: 2px `INK` inner border with a faint light top line, crop icon at 24px, short label, ctrl key number, status dot in the corner; the active slot gets only a `GOLD_LINE` inner line and a gold key number (night: `LOOK.night.ring`), no lift and no bar under it. After `space.new` succeeds, scroll the strip to the end if Task 1 Step 8 found a way.
- [ ] **Step 4: Verify.** `bun test` passes; `herdr-app check dewdrop`; in the app with 3 and 11 spaces: slots scroll past nine, slot 10 has no key, "+ space" opens the folder picker and cancel does nothing, peek hides the panes and the scene shows. Compare with the mock's hotbar at day and night.
- [ ] **Step 5: Commit.**

```bash
git add mods/dewdrop tests
git commit -m "feat: draw the hotbar with the portrait, crop slots and tool buttons"
```

### Task 9: Pane header and picture picker

**Files:**
- Modify: `mods/dewdrop/header.js`, `mods/dewdrop/main.js` (role `picker`)
- Create: `mods/dewdrop/picker.js`

**Interfaces:**
- Consumes: `faceOf`, `CAST`, `pictureIndex`, `pic`, `art("window")`, `LOOK`, `INK`, `GOLD_LINE`, `dotColor`, `headerTitle`, helpers from Task 11's `agentGroups` (the helpers chip lands in Task 11).
- Produces:
  - Header: an agent pane (`p.status` not null) shows `faceOf(p.app)` at 24px with a 2px `INK` border; any other pane shows the `window` sprite at 18px. A status dot badge sits on its bottom-right corner, pulsing while working. Plank colors from `LOOK[look].plank`, `plankLight`, text `plankText` when focused else `plankDim`. Zoom and close buttons stay.
  - Role `picker` (dialog, `frame: "none"`, sized to fit 5x5 without scrolling): title "Pick a picture" and a close button; a 5-column grid of the 25 `CAST` entries. Cell: dark tile, picture 46px with 2px `INK` border on the left, name (Pixelify Sans 600, 11px, cream, one line, ellipsis) over the role in a dark brown label with gold text. Chosen cell: `GOLD_LINE` border, role label gold with dark text. Tooltip `"<name>, <role>"`. Click: `setShared("dewdrop.picture", i)` and close.

- [ ] **Step 1: Verify the pieces this task renders are already tested** (`faceOf`, `pictureIndex`, `dotColor`); this task adds no pure logic. Run `bun test`. Expected: PASS.
- [ ] **Step 2: Implement** the header and the picker.
- [ ] **Step 3: Verify.** `herdr-app check dewdrop`; in the app: a Claude Code pane shows Orion Vale's face, a shell pane shows the window icon; the picker opens from the hotbar portrait at 960x600 without scrolling, all 25 names and roles fit on one line, the choice survives a restart. `herdr-app shot` and compare with the mock's picker.
- [ ] **Step 4: Commit.**

```bash
git add mods/dewdrop
git commit -m "feat: add farmhand faces to pane headers and the picture picker"
```

### Task 10: Pets

**Files:**
- Create: `mods/dewdrop/pets.js`, `mods/dewdrop/pet.js`, `mods/dewdrop/petpick.js`
- Delete: `mods/dewdrop/chicken.js`
- Modify: `mods/dewdrop/main.js` (roles `pet`, `petpick`; drop `chicken`), `mods/dewdrop/art.js` (import `PET_FRAMES` from `pets.js`)
- Test: `tests/cast.test.js`

**Interfaces:**
- Consumes: `chickenMood` (unchanged), `petFrame`, `png("doghouse")`, `INK`, `GOLD_LINE`, Task 1 Steps 4 and 5.
- Produces:
  - `pets.js`: `PET_KEYS = ["chicken", "duck", "cat", "dog", "rabbit", "turtle", "frog"]`; `PETS[key] = { name, trait, frames }` with names and traits copied from the mock's `PETS` table; `PET_FRAMES` as in Task 4; `petKey(v: unknown): string | null` (a known key, `null` for `null`, `"chicken"` for anything else, the default).
  - Shared key `dewdrop.pet`.
  - Role `pet`: renders nothing when the pet is `null`. Otherwise alternates the walk pair every 400ms and plays the action frame now and then; it walks inside its strip if Task 1 Step 4 allowed a frameless strip, else it walks in place. The heart / "!" behavior, click-to-focus and the drag rule are the chicken's, unchanged.
  - Role `petpick` (dialog, `frame: "none"`): title "Pick a pet", eight cells (seven pets and "No pet" with the doghouse and "The doghouse stays empty."), each with its 48x40 icon in a 2px `INK` box, name and trait. Chosen cell gold. Click sets `dewdrop.pet` and closes.

- [ ] **Step 1: Write the failing test.**

```js
test("petKey keeps known pets and none, else chicken", () => {
  expect(petKey("frog")).toBe("frog");
  expect(petKey(null)).toBeNull();
  for (const v of [undefined, "dragon", 3]) expect(petKey(v)).toBe("chicken");
  expect(PET_KEYS.every((k) => PETS[k].frames === PET_FRAMES[k] && PETS[k].name && PETS[k].trait)).toBe(true);
});
```

- [ ] **Step 2: Run** `bun test`. Expected: FAIL.
- [ ] **Step 3: Implement** `pets.js`, `pet.js`, `petpick.js`; point the layout's floating `pet` block at role `pet` (already done in Task 5).
- [ ] **Step 4: Verify.** `bun test` passes; `herdr-app check dewdrop`; in the app: pick each pet and "No pet"; the pet shows a heart when an agent finishes and a "!" when one blocks; clicking it then focuses that agent; dragging moves it. `herdr-app shot` at day and night.
- [ ] **Step 5: Commit.**

```bash
git add -A mods/dewdrop tests
git commit -m "feat: replace the chicken with a pet the user picks"
```

### Task 11: Agents popup and helpers

**Files:**
- Create: `mods/dewdrop/agents.js`
- Modify: `mods/dewdrop/logic.js`, `mods/dewdrop/main.js` (role `agents`), `mods/dewdrop/titlebar.js` (chip opens it, counts helpers), `mods/dewdrop/header.js` (helpers chip)
- Test: `tests/logic.test.js`

**Interfaces:**
- Consumes: `agents()`, `terminals()`, `panes()`, `faceOf`, `pic`, `petFrame("chicken", "a")`, `dotColor`, `agentCounts`, Task 1 Step 7's field names (written below as `address`, `parent`, `name`, `status`; rename to what the spike found).
- Produces:
  - `helpersOf(terminals: any[], panes: PaneInfo[]): Map<string, { address, title, status, pane: string | null }[]>`, keyed by the parent's address; `pane` is the pane id when a pane shows that terminal, else null.
  - `agentGroups(agents: AgentInfo[], helpers: Map): { tab: string, tab_index: number, tab_name: string, space_name: string, rows: { agent: AgentInfo, helpers: [...] }[] }[]`, groups in the order their tab first appears in `agents`.
  - Role `agents` (popup, `frame: "none"`, max height 450px, scrolls with the styled bar): group headings `space_name / tab_index tab_name`; agent rows show face, title, app, farmhand name, helper count and status dot; a click runs `tab.select {id: tab}` then `agent.focus {terminal: address}`. Helper rows are indented with the chicken icon: no pane → click runs `terminal.peek {terminal}`, and a "keep" button runs `terminal.keep {terminal}`; with a pane → the row says "in a pane" and a click runs `pane.focus {pane}`.
  - Header helpers chip: `N helpers` when the pane's terminal has helpers; opens role `agents`.

- [ ] **Step 1: Write the failing tests.**

```js
test("helpersOf nests helpers under their parent and spots kept ones", () => {
  const terms = [{ address: "t1" }, { address: "h1", parent: "t1", name: "tests", status: "working" }, { address: "h2", parent: "t1", name: "lint", status: "idle" }];
  const h = helpersOf(terms, [{ pane: "p9", terminal: "h2" }]);
  expect(h.get("t1")).toEqual([{ address: "h1", title: "tests", status: "working", pane: null }, { address: "h2", title: "lint", status: "idle", pane: "p9" }]);
  expect(h.has("h1")).toBe(false);
});

test("agentGroups groups by tab in order", () => {
  const A = (address, tab, tab_index) => ({ address, tab, tab_index, tab_name: `n${tab_index}`, space_name: "farm", status: "idle" });
  const g = agentGroups([A("t1", "x", 1), A("t2", "y", 2), A("t3", "x", 1)], new Map([["t3", [{ address: "h" }]]]));
  expect(g.map((x) => x.tab)).toEqual(["x", "y"]);
  expect(g[0].rows.map((r) => r.agent.address)).toEqual(["t1", "t3"]);
  expect(g[0].rows[1].helpers).toHaveLength(1);
  expect(agentGroups([], new Map())).toEqual([]);
});
```

- [ ] **Step 2: Run** `bun test`. Expected: FAIL.
- [ ] **Step 3: Implement** the helpers, the popup role, and wire the working chip (counts from `agentCounts(agents(), [...helpers.values()].flat())`) and the header chip.
- [ ] **Step 4: Verify.** `bun test` passes; `herdr-app check dewdrop`; in the app with two agents in two tabs and one helper: the popup groups them, clicking an agent focuses it, clicking the helper peeks, "keep" gives it a pane and the row then says "in a pane". With 15 agents the popup scrolls inside 450px.
- [ ] **Step 5: Commit.**

```bash
git add mods/dewdrop tests
git commit -m "feat: list farmhands and helpers in the agents popup"
```

### Task 12: Whole-window check against the mock

**Files:**
- Modify: whichever role files need fixes (no new features)

- [ ] **Step 1: Shots.** With 3 spaces, 6 tabs (one settled), two agents and a helper, take `herdr-app shot` at 960x600 and 1280x800, by day and by night (change the system time or call `syncLook` with a fixed date). Take agent-browser shots of `scenery.html` in the same states.
- [ ] **Step 2: Compare** side by side against the spec's "The window, top to bottom" list and Global Constraints: chip and clock on one line, no lift anywhere, `#3b2418` borders, gold selection, nothing moved between the day and night shots (diff the two images' block edges), terminals readable on both scenes.
- [ ] **Step 3: Fix** what differs, rerun `bun test` and `herdr-app check dewdrop`.
- [ ] **Step 4: Commit** (skip if nothing changed).

```bash
git add mods/dewdrop
git commit -m "fix: match the dewdrop window to the mock"
```

### Task 13: RECIPE, previews and the gallery description

**Files:**
- Modify: `RECIPE.md` (rewrite for Dewdrop, in the AGENTS.md recipe order: name and paragraph, What you see, How it behaves, Built from)
- Create: `preview.png` (replace), `layouts/dewdrop.png`
- Modify: `layouts/dewdrop.json` (`"preview": "layouts/dewdrop.png"`), `scripts/install.sh` (copy `layouts/dewdrop.png`)
- Create: `docs/gallery-description.md` (the humanized gallery description, for the GitHub repo's About field)

- [ ] **Step 1: Shots.** `herdr-app shot` of the day window at 1280x800 saved as `preview.png`; a smaller copy (`magick preview.png -resize 640x preview-small` style) as `layouts/dewdrop.png`.
- [ ] **Step 2: Write RECIPE.md** from the real files (palette values from `palette.js`, the layout tree, every role and its props, the commands it runs, the art scripts and how to rerun them, the shared keys). Note that it runs `pickFolder` and reads no files outside its folder.
- [ ] **Step 3: Humanize** RECIPE.md prose and the gallery description draft from the spec with the humanizer skill (pattern removal only, keep headings, tables and code blocks). Show both to the user and wait for approval.
- [ ] **Step 4: Verify.** `bun test` passes; `scripts/install.sh && herdr-app check dewdrop`; the layout picker shows the new preview.
- [ ] **Step 5: Commit.**

```bash
git add RECIPE.md preview.png layouts scripts/install.sh docs/gallery-description.md
git commit -m "docs: write the Dewdrop recipe and previews"
```

Publishing (creating `herdr-dewdrop` on GitHub, pushing, the `herdr-layout` topic) is not part of this plan; it needs the user's go-ahead.
