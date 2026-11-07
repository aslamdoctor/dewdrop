# Stardew layout redesign: day and night valley

Agreed in a brainstorming session on 2026-11-07. Builds on `2026-11-07-stardew-herdr-layout.md`, which stays the reference for everything not changed here (status meanings, chicken behavior, install flow, licensing rules).

Reference mock: `~/Downloads/generated-html-files/stardew-previews/index.html`, "Option 5: Valley, day and night" (day = Option 1 Morning Valley colors, night = Option 3 Starry Night colors). Treat the mock as the visual target, not as code to port.

## Why

The shipped layout (commit 73c75c9, PixelFarm field) doesn't look good to the user. Their five complaints, verbatim intent:

1. They don't like the background image.
2. The "zz" style pane icon should be a better window icon.
3. The clock and season box needs a better look and better icons.
4. The bottom toolbar should look better, with an icon or picture of a character.
5. There is no easy way to switch tabs.

Success: the user switches to `stardew` and it reads as a cozy farm-game window by day and by night, and they can see and switch tabs without a keyboard shortcut.

## Goals

- Full pixel-art scenery behind the panes: sky with clouds, two layers of snow-capped mountains, a field with crop rows and trees on the horizon, a fence, and a dirt road along the bottom where the hotbar sits.
- Two looks, swapped by the clock: **day** from 6:00 to 17:59 local time, **night** otherwise. Checked on the minute tick the title bar already runs; no reload, no restart.
- Tabs of the shown space visible in the title bar, clickable, with a "+" to open a new tab.
- New window icon, clock box, season icons, hotbar with a character portrait and crop icons.

## Non-goals

- No dawn/dusk scene (the user picked a plain 6am/6pm switch).
- No following macOS light/dark mode.
- No changes to the chicken's behavior, status meanings, or the install script beyond new files.
- No side panel, no seasons-specific scenery (the season shows as an icon only).

## Anti-goals

- Nothing from Stardew Valley itself: no sprites, characters, UI, logo or fonts from the game. The farmer portrait is original. This rule from the first spec still holds.
- Nothing may move when day flips to night. Only colors and images swap, so nothing jumps under the mouse.
- The terminals must stay readable on both scenes; scenery is decoration, not a fight with the text.

## Decided by the user

| Topic | Decision |
|---|---|
| Direction | Morning Valley by day, Starry Night by night |
| Switch rule | Clock, day 6:00 to 17:59, night otherwise |
| Tabs | In the title bar (Starry Night style), not a separate strip |
| Background | Full scenery: clouds, mountains, field, road at the bottom |
| Settled tabs | Not in the strip; listed dimmed at the bottom of the "more" popup |
| "+ space" | Ask for a folder first, then create the space there |

## The window, top to bottom

### Title bar (40px, unchanged height)

Left to right: traffic-light gap (as now, `pl(80)`), tab strip, flexible space, working-agents chip, clock box.

- **The "Stardew Herdr" text goes**, to make room for tabs.
- **Tab strip**: the shown space's tabs (`spaces()` entry with `active`, its `tabs`).
  - Each tab is a fixed-width chip (about 86px): its index, its name truncated, and a status dot colored by `tab.status` (working pulses).
  - The active tab is highlighted (day: parchment chip; night: gold chip). Inactive tabs are dark wood.
  - Click selects it (`tab.select {id}`). Controls stop mouse-down propagation, since the title bar is a window drag area.
  - A "+" chip at the end runs `tab.new` in the shown space.
  - Tabs that don't fit fold into a "▾ N more" chip. Clicking it opens a popup listing the hidden tabs (same row look: index, name, dot); clicking one selects it and closes the popup. At 960px wide about 5 tabs fit, at 1280px about 9.
  - **Settled tabs** (`TabInfo.settled`) never take a slot in the strip. They are listed, dimmed, at the bottom of the "more" popup, so they stay reachable. The "more" chip shows whenever there are hidden or settled tabs (user's decision).
  - A tab with `status: null` gets the idle dot (my call).
- **Working chip**: as now (count of working agents), but with a pulsing blue status dot instead of the watering can icon.
- **Clock box**: one plank with, left to right: a time-of-day icon, time, day and date, a divider, the season icon and season name.
  - Day: a small sun dial (half circle with the sun on its track). Night: a crescent moon.
  - Season icons: spring blossom, summer sun, fall leaf, winter snowflake (all original pixel art, as in the mock's "Parts" row).
  - Ticks on the minute as today (`msToNextMinute`).

### Main area

- Background: the scenery image for the current look, `fit: cover`, replacing `farm.png`.
- Panes: semi-transparent so the scenery shows through (`terminal_opacity` below 1; the mock uses about 0.85). Pane border and focus colors follow the look (day: dark wood border, gold focus; night: darker wood border, gold focus).
- Pane header plank: replaces the status icon with the **window icon** (a small pixel window: title strip with three dots, a dark body with a `>_` prompt) plus a **status dot** badge on its corner, colored by status, pulsing while working. Title, zoom and close buttons stay. Day and night use different plank colors.
- Chicken: unchanged, bottom-right.

### Hotbar (64px, unchanged height)

- Sits on the road. The hotbar block's own background image goes; the main scenery's road continues behind it. If block backgrounds still can't be set separately (see below), the builder picks how the road reaches the hotbar, for example a road strip image on the hotbar block or the scenery extending under it.
- One wooden box, centered, left to right:
  - **Portrait**: an original farmer face (straw hat, red band) in a framed square, with a sky-gradient backdrop. Night: same farmer in a nightcap.
  - Divider.
  - **Space slots** as today (click switches, red frame on the active one, tooltip lists agents, ctrl-1..9 key labels), but each slot shows a **crop icon** and its short label, with the status dot in the corner. Crop is picked from a fixed list (sprout, carrot, pumpkin, wheat, berry) by a hash of the space id, so a space keeps its crop when others are closed or moved (my call; two spaces may share a crop).
  - Divider.
  - **Buttons**: "+ tab" (`tab.new`) and "+ space". "+ space" first asks for a folder with `pickFolder()`, then creates the space in it (`space.new` with that folder; check the exact command and args in `herdr.d.ts`). Cancelling the picker does nothing (user's decision). Settings stays out.
- Night: active slot frame is gold instead of red; box trim is gold.

## Day and night swap

- One pure helper decides the look: `lookOf(date)` returns `"day"` for hours 6 to 17, else `"night"`. Unit-tested at 5:59, 6:00, 17:59, 18:00.
- The mod's chrome (title bar, headers, hotbar, popup) reads the look at render time and picks colors from a `day` or `night` palette. Renders happen on the minute tick, so it flips within a minute.
- The background images and pane border colors live in the layout, so the mod has to change the layout when the look flips. **This is the one open technical question** (see below).

## Constraints

- Herdr desktop app 0.1.13, mods in gpui-kit; see `~/.config/herdr-app/AGENTS.md` and `herdr.d.ts`.
- AGENTS.md: "Today only the root's look applies; a block's own look is coming." Check what this means for the main and hotbar block backgrounds before relying on two separate images.
- Install copies files (`scripts/install.sh`); symlinks don't hot-reload.
- Tests: `bun test`. The existing palette test pins `palette.js` values; new day and night palettes need their own tests, and the "sprites use palette colors only" test needs the new colors added or the rule adjusted.
- PixelFarm art (`assets/pixelfarm/`, `farm.png`, `hotbar-field.png`, `scripts/compose-farm.js`, the CREDITS entry, and the tests that check them) stops being used. Removing it is the builder's call (my recommendation: remove, since nothing would reference it).
- Docs: `RECIPE.md` and `preview.png` get updated; RECIPE text goes through the humanizer skill before commit.

## Open technical question for the builder

How the mod swaps the layout's background image (and pane border colors) at the flip. Candidates, in the order I'd try them:

1. `run("layout.set", { layout })` with the current tree (`layout()`) and the image path swapped. `stardew` is a personal layout, so `layout.set` should take it.
2. The mod rewriting `layouts/stardew.json` in the Herdr home with `writeTextFile` (layout files apply live).
3. Two layouts, `stardew-day` and `stardew-night`, and `layout.switch` at the flip. Last resort: a switch closes floating windows.

Spike option 1 first and confirm with `herdr-app shot`. Whatever works, it must not write on every tick, only when the look actually changes, and it must pick the right look on start.

## Left to the builder

- How the scenery is made. Recommended: a script in `scripts/` that draws the scenes as pixel art (like the mock's `scene()`, original shapes only) and writes `scene-day.png` and `scene-night.png` at a size that covers well (for example 1920x1200, 4x pixel scale with point filtering).
- Exact sizes, pixel art of the new sprites, and colors, within the mock's look.
- File split inside the mod (new `tabs.js`, palette layout, and so on).
- Exact `terminal_opacity` value and the overflow popup's size.
- Whether to keep the old status sprites (`can`, `bang`, `star`, `zzz`) anywhere; the mock uses dots instead.
