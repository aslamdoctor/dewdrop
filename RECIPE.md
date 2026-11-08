# Dewdrop

A cozy 16-bit farm window for the Herdr desktop app, inspired by farm games. Behind your terminals sits a pixel-art valley that switches from a morning scene to a starry night at 6 pm and back at 6 am. Tabs live in a wooden title bar, every space is a crop slot on a hotbar along the road, and each agent shows up as a farmhand with a face of its own. A small pet wanders the corner and reacts when an agent finishes or gets blocked. The pixel art was drawn for this layout, apart from the portraits, which came from the layout's author.

![Dewdrop](preview.png)

## What you see

Palette: soil `#2b1d14`, parchment `#f3e2b8`, wood `#8a5a2b`, wood light `#c58b4e`, grass `#6ab04c`, dark grass `#3f6b2a`, sky `#5fa8d3`, red `#d9534f`, gold `#f2c14e`, idle brown `#9c7b5b`. UI type is Pixelify Sans (bundled), terminal type is Geist Mono at 14px.

Two looks, picked by the local clock: day from 6:00 to 17:59, night the rest of the time.

| Part | Day | Night |
|------|-----|-------|
| Scene | `scene-day.png`, morning valley | `scene-night.png`, starry night |
| Bar and plank | wood `#8a5a2b`, light line `#c58b4e` | dark wood `#3a2718`, light line `#5a3c25` |
| Active tab | parchment chip | gold chip |
| Pane fill | `#20160fdb` | `#0b0b1ad6` |
| Pane border | `#6b4420` | `#2b1d14` |
| Focus ring | gold `#f2c14e` | gold `#f2c14e` |
| Space frame | red `#d9534f` | gold `#f2c14e` |

Top to bottom:

- **Title bar, 40px.** It leaves 80px on the left for the traffic lights (placed at 14, 11), then the tabs of the shown space, then on the right a working chip and a clock box. The whole bar drags the window.
  - Tabs: up to five fit, each a 28px chip (86px wide, shrinking to 52px) with its index, name and a status dot. A "+" chip opens a new tab. Settled tabs and tabs past the fifth fold into a "more" chip that opens a popup, with the settled ones dimmed at the bottom. The selected tab always stays in the strip.
  - Working chip: a pulsing blue dot and "N working" (helpers count too). A red dot and a count appear next to it only when at least one agent or helper is blocked. Clicking the chip opens the agents popup.
  - Clock box: a sun dial by day or a crescent moon at night, the time, the day and date ("Sun. 8"), a divider, then the season icon and name. The chip and the clock never shrink or wrap.
- **Valley.** The tab area is a column with the scene as its background (`cover` fit, 5120x3008) and 16px padding. Panes have square corners, 10px gaps, a 3px border and a 3px focus ring. A lone pane keeps its frame. `terminal_opacity` is 0, so the see-through look comes from the pane fill alone (alpha `db` by day, `d6` at night), and the scene shows faintly behind the text.
- **Pane header, 28px, always shown.** A plank holding a window icon (or, for an agent pane, the agent's face with a status dot), the pane title, a "N helpers" chip when the agent started helpers, and 18px zoom and close buttons. The title is the program name, plus the terminal title when it differs ("claude - fix tests"); shells show the working directory with home written as `~`.
- **Pet.** A 56x48 floating box at the bottom-right of the window, drawn with 48x40 sprites.
- **Hotbar, 64px.** On the road at the bottom, one wooden box holding, left to right: the portrait (46px), a divider, the space slots, a divider and four 22px tool buttons (new tab, new space, hide panes, choose a pet). Each slot is 46px square with a 24px crop icon, the first four letters of the space name, its number (1 to 9, matching Herdr's `ctrl-1` to `ctrl-9`) and a status dot. The shown space has a red frame by day and a gold one at night.

The theme matches: soil background, parchment text, wood chrome, dark wood `#3a2718` surfaces, grass accent.

## How it behaves

| Status | Dot color |
|--------|-----------|
| working | sky `#5fa8d3`, pulsing |
| blocked | red `#d9534f` |
| done | gold `#f2c14e` |
| idle (and no status) | idle brown `#9c7b5b` |

- **Day and night.** The mod reads the layout and calls `layout.set` with the scene and pane colors swapped, once at 6:00 and once at 18:00 and when it starts, never on every tick. Only colors and images change, so nothing moves under the mouse. The clock text updates on the minute.
- **Season** comes from the month: March to May spring, June to August summer, September to November fall, the rest winter.
- **Tabs.** A click selects the tab (`tab.select`), "+" runs `tab.new` in the shown space.
- **Hotbar.** A click on a slot switches to that space. A slot's crop is picked by a hash of the space id, so a space keeps its crop when others close. Hovering shows the space name and one line per agent ("claude: working"), or "no agents". Past nine spaces the row scrolls sideways and the extra slots have no key number. "New space" asks for a folder with `pickFolder` and then runs `space.new`; cancelling does nothing. "Hide panes" peeks at the scene: it hides the panes and shows an empty spacer in their place, and a second click brings them back.
- **Header.** A click focuses the pane, a double-click zooms it. The zoom button zooms or restores, the close button closes the pane.
- **Pictures.** Clicking the portrait opens "Pick a picture", a 5x5 grid with the author's portrait and 24 farmhands, each with a name and a role. The choice is kept in the shared key `dewdrop.picture`. Each app gets one farmhand face: claude-code is Orion Vale, codex is Unit K-47, opencode is BEEP-09, anything else is Milo Patches.
- **Agents popup.** It lists agents grouped by space and tab, with helpers (terminals an agent started with `hc run`, no pane) nested under their agent. Clicking an agent selects its tab and focuses it (`agent.focus`). Clicking a helper opens a peek of its latest output (`terminal.peek`), or focuses its pane when it has one. "keep" gives a helper a pane (`terminal.keep`). The popup grows to 450px, then scrolls.
- **Pet.** Chicken (the default), duck, cat, dog, rabbit, turtle, frog, or none (an empty doghouse). The pick is kept in the shared key `dewdrop.pet`. The pet walks in place and plays an action now and then (peck, nap, hide and so on). When an agent becomes blocked it stands still with a red "!"; when one finishes (goes to done, or from working to idle) it shows a heart. Either lasts 4 seconds, and a newer event restarts the count. While it shows, clicking the pet focuses that agent. Agents it sees for the first time (after a reload, or a new terminal) don't set it off. It plays no sounds.
- **Peek state** is kept in the shared key `dewdrop.panesHidden`.

## Built from

Layout `layouts/dewdrop.json`, a column (shown here without the repeated mod props):

```json
{ "id": "root", "type": "column", "children": [
  { "id": "titlebar", "type": "block", "size": { "px": 40 }, "window_drag": true,
    "content": { "mod": "dewdrop", "props": { "role": "titlebar" } } },
  { "id": "valley", "type": "column",
    "background": { "image": "mods/dewdrop/art/scene-day.png", "fit": "cover" },
    "children": [
      { "id": "main", "type": "block", "padding": [16, 16],
        "content": { "tab": "active", "pane": {
          "gap": 10, "radius": 0, "background": "#20160fdb",
          "border": { "width": 3, "color": "#6b4420" }, "focus": { "width": 3, "color": "#f2c14e" }, "lone": true,
          "header": { "content": { "mod": "dewdrop", "props": { "role": "header" } }, "height": 28, "position": "top", "reveal": "always" } } } },
      { "id": "peek-spacer", "type": "block", "hidden": true,
        "content": { "mod": "dewdrop", "props": { "role": "empty" } } },
      { "id": "hotbar", "type": "block", "size": { "px": 64 },
        "content": { "mod": "dewdrop", "props": { "role": "hotbar" } } } ],
    "floating": [{ "id": "pet", "content": { "mod": "dewdrop", "props": { "role": "pet" } }, "edge": "bottom", "align": "end" }] } ],
  "theme": "dewdrop", "font": "Geist Mono", "font_size": 14, "ui_font": "Pixelify Sans",
  "terminal_padding": [8, 4], "terminal_opacity": 0, "background": "#2b1d14",
  "titlebar": "none", "traffic_lights": [14, 11], "preview": "layouts/dewdrop.png" }
```

Theme `themes/dewdrop.json`: background `#2b1d14`, foreground `#f3e2b8`, selection `#5fa8d3`, cursor `#f2c14e`; colors surface `#3a2718`, popover `#4a3220`, raised and hover `#5a3c25`, border `#8a5a2b`, input `#c58b4e`, muted `#c9b48a`, dim `#9c7b5b`, accent `#6ab04c`, chrome `#8a5a2b`, canvas `#3f6b2a`, and the four status colors from the table above.

One mod, `mods/dewdrop/`, drawn by role (`props.role`, picked from `ROLES` in `main.js`):

| Role | File | What it does |
|------|------|--------------|
| `titlebar` | `titlebar.js` | tabs, working chip, clock box; `agents()`, `terminals()`, `panes()`, `tab.select`, `tab.new`, a timer re-armed each minute |
| `header` | `header.js` | pane header; `panes()`, `props().pane`, runs `pane.zoom`, `pane.close` |
| `hotbar` | `hotbar.js` | portrait, space slots, tool buttons; `spaces()`, `agents()`, `space.select`, `space.new` after `pickFolder`, `tab.new`, `layout.show` and `layout.hide` for the peek |
| `picker` | `picker.js` | "Pick a picture" dialog |
| `tabmore` | `tabs.js` | popup of the tabs the strip had no room for |
| `pet` | `pet.js` | the floating pet; `agents()`, `agent.focus` |
| `petpick` | `petpick.js` | "Pick a pet" dialog |
| `agents` | `agents.js` | agents popup; `tab.select`, `agent.focus`, `pane.focus`, `terminal.peek`, `terminal.keep` |
| `empty` | `main.js` | paints nothing (the hidden `peek-spacer`) |

Other files: `logic.js` (pure helpers: clock text, season, look, layout swap, tab strip, agent groups, pet mood, tested with `bun test`), `look.js` (runs `layout.set` at the flip), `palette.js` (the only place hex values live, plus the day and night tables), `cast.js` (the 25 pictures and the app faces), `pets.js` (the seven pets), `art.js` (`art(name)`, `png(name)`, `pic(name)`, `petFrame(pet, frame)` path helpers).

Shared keys: `dewdrop.picture` (index 0 to 24), `dewdrop.pet` (a pet key, or the word for "no pet"), `dewdrop.panesHidden` (true while peeking).

Art, all in `mods/dewdrop/art/`:

| Art | Made by | Rerun with |
|-----|---------|------------|
| 21 SVG sprites (window icons, sun and moon, season icons, crops, tool icons, zoom and close buttons, heart), `shape-rendering="crispEdges"`, palette colors only (plus black and white) | `scripts/draw-art.js` | `bun scripts/draw-art.js` |
| `scene-day.png` and `scene-night.png` (5120x3008), drawn in code with point filtering | `scripts/draw-scenes.js` | `bun scripts/draw-scenes.js` |
| 21 pet frames in `pets/` (96x80, shown at 48x40), `doghouse.png`, and the cropped `portrait.png` and `cast/01.png` to `cast/24.png` (192x192) | `scripts/render-pictures.js` | `bun scripts/render-pictures.js` |

`scripts/png.js` holds the PNG encoder and the nearest-neighbour scaler the scripts share. `mods/dewdrop/art/CREDITS.md` names the sources. The font is `mods/dewdrop/fonts/PixelifySans.ttf` with its `OFL.txt`; fonts in a mod's `fonts/` folder load on their own.

Install with `bash scripts/install.sh` (it copies, because Herdr 0.1.13 doesn't hot-reload files behind a symlink; `--remove` takes it out again), then pick Dewdrop in the layout picker. Check the mod with `herdr-app check mods/dewdrop`.

It uses no shipped mods, runs no programs and makes no network calls. It asks for a folder with `pickFolder` when you press "new space", and it reads no files outside its own folder.
