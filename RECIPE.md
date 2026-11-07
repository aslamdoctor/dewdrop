# Stardew Herdr

A farm-game look for the Herdr desktop app. A wooden title bar carries a clock box with the day, time and season, and the count of working agents sits where a farm game shows your gold. Terminals are dark soil plots with plank headers on a grass field, every space is an inventory slot in a hotbar along the bottom, and a small chicken in the corner reacts when an agent finishes or gets blocked. All the art is original pixel art drawn for this layout.

![Stardew Herdr](preview.png)

## What you see

Palette: soil `#2b1d14`, parchment `#f3e2b8`, wood `#8a5a2b`, wood light `#c58b4e`, grass `#6ab04c`, dark grass `#3f6b2a`, sky `#5fa8d3`, red `#d9534f`, gold `#f2c14e`, idle brown `#9c7b5b`. UI type is Pixelify Sans (bundled), terminal type is Geist Mono at 14px.

Top to bottom:

- **Title bar, 40px.** Flat wood with a 2px wood-light line along the top. It leaves 80px on the left for the traffic lights (placed at 14, 11), then "Stardew Herdr" in 14px parchment. On the right:
  - a gold chip, 24px tall, soil fill with a 1px wood-light border, a 16px watering can and the number of working agents in 14px gold;
  - a 176x36 clock box drawn as a parchment panel with a divider at x=120. The left part shows the day and time ("Sat. 7  7:04 pm") in 13px soil, the right part the season ("Fall") in 12px wood.
  The whole bar drags the window.
- **Field.** The tab area has a farm background (grass with tufts, a tilled plot and a fence, `cover` fit) and 16px padding. Panes are soil `#2b1d14` with a 3px wood border, 3px wood light when focused, square corners, 10px gaps, terminal opacity 1 and 8x4 terminal padding. A lone pane keeps its frame.
- **Pane header, 26px, always shown.** A wood plank with a 2px wood-light top line: a 16px status icon, the pane title in 13px (parchment when the pane is focused, soil when not), then 18px zoom and close buttons. The title is the program name, plus the terminal title when it differs ("claude - fix tests"). Shells show the working directory with home written as `~`.
- **Chicken.** A 32px white chicken floats at the field's bottom-right corner.
- **Hotbar, 64px.** A centered wood box with a 3px wood-light border holding one 48px slot per space, 4px apart. Each slot shows the space's first four letters in 12px parchment, its number (1 to 9, matching Herdr's `ctrl-1` to `ctrl-9` space shortcuts; slots past 9 get none) at the top-left in 10px wood light, and the space's status icon at 14px top-right. The shown space has a 3px red frame.

The theme matches: soil background, parchment text, wood chrome, dark wood `#3a2718` surfaces, grass accent.

## How it behaves

| Status | Icon | Color |
|--------|------|-------|
| working | watering can, pulsing between 45% and full opacity every 0.8s | sky `#5fa8d3` |
| blocked | "!" | red `#d9534f` |
| done | star | gold `#f2c14e` |
| idle | "Zzz" | idle brown `#9c7b5b` |

- The clock updates on the minute, re-aiming at the next minute each tick so it never drifts. Season comes from the month: March to May spring, June to August summer, September to November fall, the rest winter.
- The gold chip counts agents whose status is working, across all spaces.
- Header: a click focuses the pane, a double-click zooms it. The zoom button zooms or restores (its tooltip says which), the close button closes the pane.
- Hotbar: a click switches to that space. Hovering shows the space name and one line per agent ("claude: working"), or "no agents". Past 12 spaces the row scrolls sideways.
- Chicken: it bobs 2px while it pecks, once every 0.9s. When an agent becomes blocked it stands still with a red "!" above it; when an agent finishes (goes to done, or from working to idle) it shows a heart. Either one floats up and down 4px and lasts 4 seconds, a newer event restarts the 4 seconds, and blocked wins over finished when both happen at once. While a heart or "!" shows, clicking the chicken focuses that agent; the rest of the time a press on it drags the float aside. Agents it sees for the first time (after a reload, or a new terminal) don't set it off. It plays no sounds, so your own done and blocked sounds stay as they are.

## Built from

Layout `layouts/stardew.json`, a column:

```json
{ "id": "root", "type": "column", "children": [
  { "id": "titlebar", "type": "block", "size": { "px": 40 }, "window_drag": true,
    "content": { "mod": "stardew", "props": { "role": "titlebar" } } },
  { "id": "main", "type": "block", "padding": [16, 16],
    "background": { "image": "mods/stardew/art/farm.svg", "fit": "cover" },
    "content": { "tab": "active", "pane": {
      "gap": 10, "radius": 0, "background": "#2b1d14",
      "border": { "width": 3, "color": "#8a5a2b" }, "focus": { "width": 3, "color": "#c58b4e" }, "lone": true,
      "header": { "content": { "mod": "stardew", "props": { "role": "header" } }, "height": 26, "position": "top", "reveal": "always" } } },
    "floating": [{ "id": "chicken", "content": { "mod": "stardew", "props": { "role": "chicken" } }, "edge": "right", "align": "end" }] },
  { "id": "hotbar", "type": "block", "size": { "px": 64 },
    "content": { "mod": "stardew", "props": { "role": "hotbar" } } } ],
  "theme": "stardew", "font": "Geist Mono", "font_size": 14, "ui_font": "Pixelify Sans",
  "terminal_padding": [8, 4], "terminal_opacity": 1, "background": "#2b1d14",
  "titlebar": "none", "traffic_lights": [14, 11], "preview": "layouts/stardew.svg" }
```

Theme `themes/stardew.json`: background `#2b1d14`, foreground `#f3e2b8`, selection `#5fa8d3`, cursor `#f2c14e`; colors surface `#3a2718`, popover `#4a3220`, raised and hover `#5a3c25`, border `#8a5a2b`, input `#c58b4e`, muted `#c9b48a`, dim `#9c7b5b`, accent `#6ab04c`, chrome `#8a5a2b`, canvas `#3f6b2a`, and the four status colors from the table above.

One mod, `mods/stardew/`, drawn by role (`props.role`):

| File | Role |
|------|------|
| `main.js` | picks the role class from `ROLES` |
| `titlebar.js` | title bar; `agents()`, a `cx.timer.after` re-armed each minute to just past the boundary |
| `header.js` | pane header; `panes()`, `props().pane`, `home()`, runs `pane.focus`, `pane.zoom`, `pane.close` |
| `hotbar.js` | hotbar; `spaces()`, `agents()`, runs `space.select {id}` |
| `chicken.js` | chicken; `agents()`, `cx.timer.after(4000)`, runs `agent.focus {terminal}` |
| `logic.js` | pure helpers (clock text, season, status looks, slot labels, tooltip text, header title, chicken mood), tested with `bun test` |
| `palette.js` | the only place the hex values live |
| `art.js` | `art(name)` gives `mods/stardew/art/<name>.svg` |

Art: 14 SVGs in `mods/stardew/art/`, all `shape-rendering="crispEdges"` and palette colors only (plus black and white): `can-0`, `can-1`, `bang`, `star`, `zzz`, `heart`, `chicken-0` (standing), `chicken-1` (pecking), `btn-zoom`, `btn-close`, `slot`, `plank`, `clock` (176x36) and `farm` (960x600). `scripts/draw-art.js` generates them all; rerun with `bun scripts/draw-art.js`. The font is `mods/stardew/fonts/PixelifySans.ttf` with its `OFL.txt`; fonts in a mod's `fonts/` folder load on their own.

No shipped mods. It runs no programs, makes no network calls and reads no files outside its own folder.

## Watch out

- Install by copying, not symlinking: Herdr 0.1.13 doesn't hot-reload files behind a symlink. `scripts/install.sh` copies the layout, preview, theme and mod into `~/.config/herdr-app/` (`--remove` takes them out). Rerun it after each edit.
- `h_flex` and `v_flex` come from `"gpui-base"`, not `"gpui-kit"`. `div` and `image` come from `"gpui-kit"`.
- `.frames()` takes strings only. Animate images with `.loop("opacity" | "top", { from, to, period })` instead.
- gpui-kit can't tile an image, so the farm is one 960x600 picture with `fit: "cover"`.
- With the app in front, a finished agent goes straight from working to idle and never reports done. Count working to idle as finished, or the heart never shows.
- The title bar must be 40px. At 36px the 36px clock box and the bar's top line get clipped.
- Floats get Herdr's own rounded frame, so the chicken sits in a small box.
- Tooltips use the theme's surface color (dark wood `#3a2718` with parchment text), not a parchment panel.
- Controls inside the drag bar or a float need `on_mouse_down("left", (_e, cx) => cx.stop_propagation())`, or the press drags the window instead of clicking.
- Unfocused header text in idle brown is unreadable on wood; use soil. For the same reason every status icon, Zzz included, has a black outline.
- The clock box must be 176px wide with the divider at x=120. Narrower, "Summer" and "Winter" (and the widest dates like "Wed. 30  12:59 pm") get cut off.
- The chicken float sits 12px in from the field edge, so it covers the bottom-right corner of the bottom-right pane, and clicks there never reach the terminal. It only catches the press while a heart or "!" shows; otherwise dragging it moves it out of the way.
- Don't use `cx.timer.every(60000)` for the clock. Its interval runs from the end of each call, so it slowly drifts off the minute.
- Twelve slots fit before the hotbar scrolls. An active slot past 12 isn't scrolled into view.

## Done when

- `herdr-app check mods/stardew` reports no errors and `bun test` passes.
- `layout.switch {"name":"stardew"}` shows the wooden title bar with today's day, time and season, and the gold chip counts working agents.
- Panes have plank headers with the right status icon; clicking a header focuses its pane, double-clicking zooms it, the buttons zoom and close.
- The hotbar has one slot per space, the shown one framed in red; clicking a slot switches space and hovering lists its agents.
- An agent that finishes makes the chicken show a heart for 4 seconds, a blocked one shows "!", and clicking the chicken then focuses that agent.
- `herdr-app status | jq .errors` is empty.
