# Stardew Herdr Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Stardew-inspired `stardew` layout for the Herdr desktop app: wooden title bar with clock, plank pane headers on a farm background, an inventory-style space hotbar and a chicken that reacts to agents.

**Architecture:** The repo mirrors a Herdr home (`layouts/`, `themes/`, `mods/stardew/`) and is symlinked into `~/.config/herdr-app/`. One mod, `stardew`, renders by `props.role` (`titlebar`, `header`, `hotbar`, `chicken`), the same dispatch win98 uses in `mods/win98/main.js`. All decision logic lives in `mods/stardew/logic.js` with no imports, so `bun test` can cover it. The view files only draw.

**Tech Stack:** Herdr app 0.1.13 layouts and gpui-kit mods (JS), `bun test`, hand-written SVG pixel art, Pixelify Sans (OFL).

**Spec:** `docs/superpowers/specs/2026-11-07-stardew-herdr-layout.md`

**Reference (read before any task):** `~/.config/herdr-app/AGENTS.md` (sections "Layouts", "The look", "Pane frames", "Floating blocks", "Mods", "The herdr module"), `~/.config/herdr-app/herdr.d.ts`, `~/.config/herdr-app/gpui-kit.d.ts`, `~/.config/herdr-app/layouts/win98.json`, `~/.config/herdr-app/mods/win98/{main,window,clippy,taskbar,kit}.js`. The `.d.ts` files are the truth for element and API names.

## Global Constraints

- No game assets, sprites, characters (no Junimo) or logo. All art is original, written in this repo.
- Palette (exact): soil `#2b1d14`, parchment `#f3e2b8`, wood `#8a5a2b`, wood light `#c58b4e`, grass `#6ab04c`, sky `#5fa8d3`, red `#d9534f`, gold `#f2c14e`. Added for idle and dark grass: idle brown `#9c7b5b`, grass dark `#3f6b2a`.
- Terminal font `Geist Mono` 14; `ui_font` `Pixelify Sans`. `terminal_opacity` 1.
- Do not touch `settings.json`, `shared.json` layout choice, sounds, or any other layout/mod. `thrive` stays the default; switch to `stardew` only to test, switch back after.
- No `setTimeout`/`setInterval`; animate with `.frames`/`.loop`; timers only for the clock (60 s) and the chicken's mood reset.
- Never keep a `cx` past its callback.
- Every task ends with: `herdr-app check ~/.config/herdr-app/mods/stardew` passes, no `~/.config/herdr-app/layouts/stardew.error` (or `layout.error`) file, and a `herdr-app shot` PNG that was opened and looked at.
- Commits follow the user's global rules (auto-commit, report hash and file tree). Use `bun`, `rg`, `fd`.

## Review Focus

1. **Herdr may not follow symlinks** for hot reload or loading. Expected: the layout loads and edits reload. Task 1 proves it; fallback is `scripts/link.sh --copy`.
2. **Zero spaces or more than 12 spaces.** Expected: an empty hotbar doesn't error; a 13th slot is reachable by horizontal scroll, and key labels stop after 12. Tested in Task 2 (`hotbarSlots`).
3. **Long space, tab and program names.** Expected: slots, headers and tooltips truncate, never push controls off-screen. `slotLabel` test in Task 2; `.truncate()` in Tasks 4 and 5.
4. **Many agents change at once, or the agent vanishes before the mood ends.** Expected: blocked wins over done, the chicken never gets stuck showing a mood. Tested in Task 2 (`chickenMood`).
5. **Clock at month and day boundaries (Feb 28 to Mar 1, Nov 30 to Dec 1, midnight, noon).** Expected: season flips on the right day, `12:00 am`/`12:00 pm` correct. Tested in Task 2.

---

## File Structure

```
aslams-mod/
├── package.json                 bun test script
├── LICENSE                      MIT
├── .gitignore
├── scripts/link.sh              symlink (or --copy) into ~/.config/herdr-app, --unlink to remove
├── layouts/stardew.json         node tree + look
├── layouts/stardew.svg          picture shown in Herdr Settings
├── themes/stardew.json          colors + ANSI 16
├── mods/stardew/
│   ├── mod.json                 { "place": "none" }
│   ├── main.js                  role dispatcher
│   ├── palette.js               C: palette constants (only place hex lives in JS)
│   ├── logic.js                 pure functions, no imports
│   ├── art.js                   asset path helpers
│   ├── titlebar.js              role titlebar
│   ├── header.js                role header
│   ├── hotbar.js                role hotbar
│   ├── chicken.js               role chicken
│   ├── art/*.svg                farm, wood, icons, chicken frames
│   └── fonts/PixelifySans.ttf, fonts/OFL.txt
├── tests/logic.test.js
├── tests/assets.test.js         palette and SVG checks
├── RECIPE.md
└── preview.png
```

---

### Task 1: Scaffold, link, theme and an empty layout that loads

**Files:**
- Create: `package.json`, `LICENSE`, `.gitignore`, `scripts/link.sh`, `layouts/stardew.json`, `themes/stardew.json`, `mods/stardew/{mod.json,main.js,palette.js}`, `tests/assets.test.js`

**Interfaces:**
- Produces: `palette.js` exports `C = { soil, parchment, wood, woodLight, grass, grassDark, sky, red, gold, idle }` (the Global Constraints hex values). `main.js` default-exports `class Stardew extends View`, holding `ROLES = {}` that later tasks fill, rendering `div().child("stardew: no role ...")` for unknown roles. `scripts/link.sh [--copy|--unlink]` links `layouts/stardew.json`, `layouts/stardew.svg`, `themes/stardew.json` and `mods/stardew/` into `~/.config/herdr-app/`, refusing to overwrite a non-symlink.

- [ ] **Step 1: `git init`, add `.gitignore` (`node_modules/`, `*.error`, `herdr-shot.png`), MIT `LICENSE` (2026, Aslam Doctor), `package.json` with `"scripts": { "test": "bun test" }`.**

- [ ] **Step 2: Write the failing test `tests/assets.test.js`**

```js
import { C } from "../mods/stardew/palette.js";
import theme from "../themes/stardew.json";
test("palette matches spec", () => {
  expect(C).toEqual({ soil: "#2b1d14", parchment: "#f3e2b8", wood: "#8a5a2b", woodLight: "#c58b4e",
    grass: "#6ab04c", grassDark: "#3f6b2a", sky: "#5fa8d3", red: "#d9534f", gold: "#f2c14e", idle: "#9c7b5b" });
});
test("theme uses the palette", () => {
  expect(theme.background).toBe(C.soil);
  expect(theme.foreground).toBe(C.parchment);
  expect(theme.ansi).toHaveLength(16);
  expect(theme.colors).toMatchObject({ working: C.sky, blocked: C.red, done: C.gold, idle: C.idle,
    accent: C.grass, chrome: C.wood, border: C.wood, input: C.woodLight, canvas: C.grassDark });
});
```

- [ ] **Step 3: Run `bun test tests/assets.test.js`.** Expected: FAIL (modules missing).

- [ ] **Step 4: Write `palette.js` and `themes/stardew.json`.** Theme: `background` soil, `foreground` parchment, `selection` sky, `cursor` gold, `ansi`: `["#3d2a1e","#d9534f","#6ab04c","#f2c14e","#5fa8d3","#b07cc6","#5fbfb0","#e8d5a8","#7a5c44","#ef7a6f","#8fd16a","#f7d57a","#86c2e6","#cfa0e0","#86d9cc","#fff3d6"]`; `colors`: as the test, plus `surface #3a2718`, `popover #4a3220`, `raised #5a3c25`, `hover #5a3c25`, `muted #c9b48a`, `dim #9c7b5b`, `accent_foreground #2b1d14`, `unknown #9c7b5b`.

- [ ] **Step 5: Run `bun test`.** Expected: PASS.

- [ ] **Step 6: Write `layouts/stardew.json`, the full tree with only built-in content for now:**

Root `column`, `titlebar: "none"`, `traffic_lights: [14, 11]`, `theme: "stardew"`, `font: "Geist Mono"`, `font_size: 14`, `ui_font: "Pixelify Sans"`, `terminal_padding: [8, 4]`, `terminal_opacity: 1`, `background: "#2b1d14"`, `preview: "layouts/stardew.svg"`. Children:
1. `titlebar` block, `size {px: 36}`, `window_drag: true`, `content {mod: "stardew", props: {role: "titlebar"}}`.
2. `main` block, `padding [16, 16]`, `background: "#3f6b2a"` (Task 7 swaps in the farm image), `content {tab: "active", pane: {gap: 10, radius: 0, background: "#2b1d14", border: {width: 3, color: "#8a5a2b"}, focus: {width: 3, color: "#c58b4e"}, lone: true}}` (header added in Task 5).
3. `hotbar` block, `size {px: 64}`, `content {mod: "stardew", props: {role: "hotbar"}}`.

- [ ] **Step 7: Write `mod.json` (`{ "place": "none" }`), `main.js` (dispatcher, empty ROLES) and `scripts/link.sh`.**

- [ ] **Step 8: Run `bash scripts/link.sh`, then `herdr-app check ~/.config/herdr-app/mods/stardew`.** Expected: check passes; `ls -l ~/.config/herdr-app/layouts/stardew.json` shows a symlink.

- [ ] **Step 9: `herdr-app do layout.switch '{"name":"stardew"}'`, confirm no `.error` file in `~/.config/herdr-app/layouts/`, `herdr-app shot $SCRATCH/t1.png` and open it.** Expected: dark window, green main area, panes framed in wood, "no role" text in title bar and hotbar. Then edit `main.js` (change the placeholder text), shoot again: text changed, which proves hot reload through the symlink. If either fails, rerun with `scripts/link.sh --copy` and record the result in `RECIPE.md` Watch out (Task 8).

- [ ] **Step 10: `herdr-app do layout.switch '{"name":"thrive"}'`. Commit:** `feat: scaffold stardew layout, theme and link script`.

---

### Task 2: Pure logic with tests

**Files:**
- Create: `mods/stardew/logic.js`, `tests/logic.test.js`

**Interfaces (all exported from `logic.js`, no imports):**
- `seasonOf(date: Date): "spring"|"summer"|"fall"|"winter"`: Mar to May spring, Jun to Aug summer, Sep to Nov fall, Dec to Feb winter.
- `clockText(date: Date): { day: string, time: string, season: string }`: `day` like `"Sat. 7"`, `time` like `"6:05 pm"` (12-hour, lowercase, no leading zero on hours), `season` capitalized (`"Fall"`).
- `workingCount(agents: {status:string}[]): number`: agents with `status === "working"`.
- `statusLook(status: string|null): { icon: "can"|"bang"|"star"|"zzz", color: "sky"|"red"|"gold"|"idle" } | null`: per the spec table; `null`/`"unknown"` gives `null`.
- `HOTBAR_KEYS = ["1","2","3","4","5","6","7","8","9","0","-","="]`
- `slotLabel(name: string): string`: first 4 characters, trimmed; `""` gives `"?"`.
- `hotbarSlots(spaces: {id,name,active,status}[]): { id, label, key: string|null, active, status }[]`: every space in order; `key` from `HOTBAR_KEYS` for the first 12, `null` after.
- `slotTooltip(space: {id,name}, agents: AgentInfo[]): string`: the space name, then one line per agent in that space: `` `${program.name}: ${status}` ``, joined with `"\n"`; no agents gives the name plus `"\nno agents"`.
- `headerTitle(pane: PaneInfo, home: string): string`: mod pane gives `title || mod`; shell or no program gives the cwd with `home` replaced by `~`; otherwise `` `${program.name} - ${title}` `` when title is set and differs, else `program.name`.
- `chickenMood(prev: Map<string,string>, agents: {address,status}[]): { mood: "heart"|"alert"|null, next: Map<string,string> }`: `mood` is `"alert"` if any agent newly entered `blocked`, else `"heart"` if any newly entered `done`, else `null`. "Newly" means its previous status in `prev` differs. `next` maps address to current status for the current agents only.

- [ ] **Step 1: Write `tests/logic.test.js`.** One `test` per line:
  - `seasonOf`: `new Date(2026,1,28)` winter, `new Date(2026,2,1)` spring, `new Date(2026,10,30)` fall, `new Date(2026,11,1)` winter, `new Date(2026,5,1)` summer.
  - `clockText(new Date(2026,10,7,18,5))` equals `{ day: "Sat. 7", time: "6:05 pm", season: "Fall" }`; `00:00` gives `"12:00 am"`; `12:00` gives `"12:00 pm"`.
  - `workingCount([{status:"working"},{status:"idle"},{status:"working"}])` is 2; `[]` is 0.
  - `statusLook("blocked")` equals `{icon:"bang",color:"red"}` and the same for the other three; `statusLook(null)` and `statusLook("unknown")` are `null`.
  - `hotbarSlots([])` is `[]`. 13 spaces: length 13, `[11].key === "="`, `[12].key === null`, labels from `slotLabel`.
  - `slotLabel("aslams-mod")` is `"asla"`, `slotLabel("")` is `"?"`.
  - `slotTooltip` with two agents in the space and one elsewhere gives 3 lines; with none gives `"name\nno agents"`.
  - `headerTitle`: mod pane `{mod:"board",title:""}` gives `"board"`; shell pane with cwd `/Users/a/x`, home `/Users/a` gives `"~/x"`; claude pane with title `"fix login"` gives `"Claude Code - fix login"`; title equal to name gives `"Claude Code"`.
  - `chickenMood`: a working agent going blocked gives `"alert"`; another going done in the same call still gives `"alert"`; done only gives `"heart"`; an agent already done in `prev` gives `null`; a vanished agent is dropped from `next`.

- [ ] **Step 2: Run `bun test tests/logic.test.js`.** Expected: FAIL (module missing).

- [ ] **Step 3: Implement `logic.js`.** Use `Intl` free formatting (manual arrays `["Sun","Mon",...]`) so output doesn't depend on locale.

- [ ] **Step 4: Run `bun test`.** Expected: all PASS.

- [ ] **Step 5: Commit:** `feat: add stardew layout logic with tests`.

---

### Task 3: Original pixel art and font

**Files:**
- Create: `mods/stardew/art/{farm.svg,plank.svg,clock.svg,slot.svg,can-0.svg,can-1.svg,bang.svg,star.svg,zzz.svg,heart.svg,chicken-0.svg,chicken-1.svg,btn-zoom.svg,btn-close.svg}`, `mods/stardew/art.js`, `mods/stardew/fonts/PixelifySans.ttf`, `mods/stardew/fonts/OFL.txt`
- Modify: `tests/assets.test.js`

**Interfaces:**
- Produces: `art.js` exports `ART = "mods/stardew/art"` and `art(name: string): string` returning `` `${ART}/${name}.svg` ``. File names above are the names later tasks pass (`art("can-0")`, `art("chicken-1")`). Icons are 16x16 grids, chicken 32x32, `slot` 48x48, `plank` 64x16 (tiles horizontally), `clock` 160x36, `farm` 960x600 (grass, tilled rows, fence posts around the edges).

- [ ] **Step 1: Add to `tests/assets.test.js`:** for every file in `mods/stardew/art/` (`fs.readdirSync`), test that it starts with `<svg`, has a `viewBox`, has `shape-rendering="crispEdges"`, and that every `#rrggbb` in it is a value of `C` or one of `#000000`, `#ffffff`. Also `fonts/PixelifySans.ttf` exists and is over 10 KB, and `fonts/OFL.txt` exists.

- [ ] **Step 2: Run `bun test tests/assets.test.js`.** Expected: FAIL.

- [ ] **Step 3: Draw each SVG as `<rect>` pixels on its grid, palette colors only.** `can-0`/`can-1` are two frames of a watering can tipping (drops in frame 1); `chicken-0`/`chicken-1` are standing and pecking. All original shapes; do not trace any game sprite.

- [ ] **Step 4: Download Pixelify Sans:** `curl -fL -o mods/stardew/fonts/PixelifySans.ttf 'https://github.com/google/fonts/raw/main/ofl/pixelifysans/PixelifySans%5Bwght%5D.ttf'` and its `OFL.txt` from the same folder.

- [ ] **Step 5: Run `bun test`.** Expected: PASS.

- [ ] **Step 6: Open `farm.svg`, `chicken-0.svg`, `can-1.svg` in the browser (`open`) and look at them.** Expected: readable at a glance, nothing resembling a copyrighted sprite.

- [ ] **Step 7: Commit:** `feat: add original stardew pixel art and Pixelify Sans`.

---

### Task 4: Title bar with clock box

**Files:**
- Create: `mods/stardew/titlebar.js`
- Modify: `mods/stardew/main.js` (register `titlebar`)

**Interfaces:**
- Consumes: `clockText`, `workingCount` (Task 2); `C` (Task 1); `art` (Task 3).
- Produces: `export default class Titlebar { init(props, cx); render(cx) }` (same shape as win98's role classes).

- [ ] **Step 1: Implement.** A 36px `h_flex`, background `image(art("plank"))` tiled (or `C.wood` with a 2px `C.woodLight` top line if tiling isn't available), left padding 80px for the traffic lights, the word "Stardew Herdr" in Pixelify Sans 14 `C.parchment`, then on the right the clock box: `image(art("clock"))` 160x36 holding `day` and `time` text, the season, and the `workingCount(agents())` number in `C.gold`. `init` starts `cx.timer.every(60000, (cx) => cx.notify())`. Text uses `.truncate()`.

- [ ] **Step 2: `herdr-app check ~/.config/herdr-app/mods/stardew`.** Expected: pass.

- [ ] **Step 3: Switch to `stardew`, shoot, open the PNG.** Expected: wooden bar, traffic lights not covered, clock shows today's date and time and "Fall", count matches `hc ls --json | jq` working agents. Drag the bar: the window moves. Switch back to `thrive`.

- [ ] **Step 4: Commit:** `feat: add stardew title bar with clock box`.

---

### Task 5: Plank pane headers

**Files:**
- Create: `mods/stardew/header.js`
- Modify: `mods/stardew/main.js` (register `header`), `layouts/stardew.json` (`pane.header`)

**Interfaces:**
- Consumes: `headerTitle`, `statusLook` (Task 2); `art` (Task 3).
- Produces: `class Header`; layout `pane.header = { content: {mod: "stardew", props: {role: "header"}}, height: 26, position: "top", reveal: "always" }`.

- [ ] **Step 1: Implement.** Finds its pane with `panes().find((x) => x.pane === props().pane)`. Plank background; left: status icon from `statusLook(p.status)` (16px `image(art(...))`; working uses `.frames` over `can-0`/`can-1` at 400 ms, or `.loop("opacity", {from: 0.5, to: 1, period: 800})` if `.frames` only takes strings); then `headerTitle(p, home())`, `.truncate()`, `C.parchment` when focused else `C.idle`. Right: zoom and close buttons (`btn-zoom`, `btn-close`) running `pane.zoom` / `pane.close` with `{pane: id}`, stopping propagation. Click runs `pane.focus`, double-click `pane.zoom`.

- [ ] **Step 2: Add the header to `layouts/stardew.json`.**

- [ ] **Step 3: Check, switch, split a pane (`herdr-app do pane.split '{"direction":"right"}'`), shoot, open.** Expected: both panes have plank headers, the focused one has bright text, buttons work, a long title truncates. Close the extra pane, switch back.

- [ ] **Step 4: Commit:** `feat: add stardew plank pane headers`.

---

### Task 6: Hotbar

**Files:**
- Create: `mods/stardew/hotbar.js`
- Modify: `mods/stardew/main.js` (register `hotbar`)

**Interfaces:**
- Consumes: `hotbarSlots`, `slotTooltip`, `statusLook` (Task 2); `art` (Task 3).
- Produces: `class Hotbar`.

- [ ] **Step 1: Implement.** 64px block, `C.wood` bar centered with a `C.woodLight` 3px border. Inside, an `h_flex` with horizontal overflow scroll (find the scroll method in `gpui-kit.d.ts`; `overflow_x_scrollbar` is the expected name) and a max width of 12 slots (12 x 52px). Each slot: 48x48 `image(art("slot"))`, `key` top-left in 10px, `label` centered 12px, status icon top-right, `C.red` 3px border when `active`. `.id(`slot-${id}`)`, `.on_click` runs `space.select {id}`, `.tooltip(slotTooltip(space, agents()))`. Zero spaces: render the empty bar.

- [ ] **Step 2: Check, switch, create spaces until there are 13 (`herdr-app do space.new '{}'`, note their ids), shoot, open.** Expected: 12 slots visible, scrolling reaches the 13th, active slot red, clicking a slot switches space, hovering shows the tooltip. Close the spaces you made, switch back.

- [ ] **Step 3: Commit:** `feat: add stardew space hotbar`.

---

### Task 7: Farm background and chicken

**Files:**
- Create: `mods/stardew/chicken.js`
- Modify: `mods/stardew/main.js` (register `chicken`), `layouts/stardew.json`

**Interfaces:**
- Consumes: `chickenMood` (Task 2); `art` (Task 3).
- Produces: `class Chicken`; layout `main.background = { image: "mods/stardew/art/farm.svg", fit: "cover" }` and `main.floating = [{ id: "chicken", content: {mod: "stardew", props: {role: "chicken"}}, edge: "right", align: "end" }]`.

- [ ] **Step 1: Implement `Chicken`.** `init` sets `this.prev = new Map()`, `this.mood = null`. `render` calls `chickenMood(this.prev, agents())`, stores `next`; on a non-null mood sets `this.mood`, plays nothing (sounds stay the user's), and starts `cx.timer.after(4000, (cx) => { this.mood = null; cx.notify(); })`. Draws the 32px chicken with `.frames`/`.loop` between `chicken-0`/`chicken-1` (pecking) and, when `this.mood`, `heart` or `bang` above it with `.loop("top", {from: 0, to: -4, period: 600})`. Clicking the chicken while a mood shows runs `agent.focus` on the agent that caused it (keep its address with the mood).

- [ ] **Step 2: Update the layout.** If `layout.error` says `floating` isn't allowed on a block, wrap `main` in a `row` named `field` and move `floating` there (win98 does this on its `screen` row).

- [ ] **Step 3: Check, switch, shoot, open.** Expected: farm art in the 16px gaps around panes and between them, chicken bottom-right. Trigger a done state (run a short agent task in a background tab, e.g. `hc run --label herdr.space=<id> --label herdr.tab=<id> -- claude -p "say hi"`) and confirm the heart shows then clears after about 4 s. Clicks on panes near the chicken still reach the panes. Switch back.

- [ ] **Step 4: Commit:** `feat: add stardew farm background and chicken`.

---

### Task 8: Recipe, previews and publish prep

**Files:**
- Create: `RECIPE.md`, `preview.png`, `layouts/stardew.svg`

- [ ] **Step 1: Take the final `herdr-app shot preview.png`** with two split panes, an agent working, and a few spaces. Make `layouts/stardew.svg` a small hand-drawn schematic (title bar, panes, hotbar) in palette colors, like `~/.config/herdr-app/layouts/win98.svg`.

- [ ] **Step 2: Write `RECIPE.md`** in the order AGENTS.md "Layouts and mods other people made" gives (Name and preview, What you see, How it behaves, Built from, Watch out, Done when), from the real files. Watch out must include: the symlink result from Task 1, that floats get Herdr's own frame, that tooltips use the theme's surface (dark wood, not parchment), and that the mod runs no programs and reads no files outside its folder. Run it through the `humanizer` skill (it gets committed).

- [ ] **Step 3: Run `bun test` and `herdr-app check`.** Expected: all pass.

- [ ] **Step 4: Commit:** `docs: add stardew recipe and previews`. Do not create the GitHub repo or push; ask first, then add the `herdr-layout` topic once it exists.
