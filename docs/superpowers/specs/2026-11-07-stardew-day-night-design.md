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

- Nothing from Stardew Valley itself: no sprites, characters, UI, logo or fonts from the game. The portrait is the user's own picture of themselves, supplied by them. This rule from the first spec still holds.
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
| Portrait | The user's own pixel portrait, first tile of the supplied grid, named "Aslam Doctor" with the role "Developer"; on the hotbar it is the same size as a workspace slot (46px square including its border) |
| Picture picker | 25 pictures in a 5x5 grid that fits without scrolling: the user's own plus the 24 supplied farmhands, each with its name and role beside it |
| Art style | Cozy retro 16-bit pixel art for every picture, pet and space icon: crisp pixels, no anti-aliasing, one earthy palette (sage, forest green, beige, terracotta, golden yellow, dusty blue, browns), dark brown outlines, three or four flat tones per material. Pictures, pet icons, space slots and tool buttons get a 2px dark brown (`#3b2418`) border, never black or light wood |
| Pets | Chicken, duck, cat, dog, rabbit, turtle, frog, or none (an empty doghouse) |
| Agents view | Popup from the working chip: farmhands grouped by tab, helpers nested under them |
| Busy spaces | Tabs past five fold into "more"; the agents popup scrolls; the hotbar scrolls sideways past nine spaces |

## Name and publishing

- Published name: **Dewdrop** (user's decision). The "dew" nods at Stardew Valley without using the game's name. Repo: `herdr-dewdrop` on GitHub. The Herdr gallery (https://herdr.dev/gallery/) fetches it from there, showing the title, the owner handle, a preview image and an optional description.
- Gallery description (draft, goes through the humanizer before it is published): "A cozy 16-bit farm layout inspired by Stardew Valley. It follows the time of day, spaces grow as crops on a hotbar, and your agents work as farmhands."
- Neither the name nor the repo uses "Stardew", or any of the game's place or character names (Pelican Town, Junimo, Stardrop). The description may say "inspired by Stardew Valley".
- As part of the build, the mod and layout id are renamed from `stardew` to `dewdrop` (folder `mods/dewdrop`, the layout entry, and any user-facing "stardew" text). File paths elsewhere in this spec that say `mods/stardew` mean `mods/dewdrop` (my call, so the shipped id matches the published name). `preview.png` is regenerated from the new look for the gallery card.

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
  - **Portrait**: the user's own pixel portrait, the first (top-left, yellow sweater) of the grid in `~/Downloads/Pixel Portrait Grid of a Bearded Farmer.png` (1536x1024, the first tile is roughly x 12 to 503, y 14 to 500; trim the white gutter exactly). Crop it, copy it into the mod as `mods/stardew/art/portrait.png`, and show it in a framed square (user's decision). It replaces the drawn farmer from the mock. Same picture day and night; at night only the frame trim changes to gold (my call; a darkened tint is the builder's option if it looks too bright on the night bar).
  - Divider.
  - **Space slots** as today (click switches, red frame on the active one, tooltip lists agents, ctrl-1..9 key labels), but each slot shows a **crop icon** and its short label, with the status dot in the corner. Crop is picked from a fixed list (sprout, carrot, pumpkin, wheat, berry) by a hash of the space id, so a space keeps its crop when others are closed or moved (my call; two spaces may share a crop).
  - Divider.
  - **Buttons**: "+ tab" (`tab.new`) and "+ space". "+ space" first asks for a folder with `pickFolder({prompt: "Pick a folder for the new space"})`, then creates the space in it (`space.new {folder}`). Cancelling the picker (it returns `null`) does nothing (user's decision). The new space is shown and its slot appended at the end of the hotbar. Settings stays out.
  - **Past nine spaces**: slots 10 and up have no ctrl key label (their tooltip says so). The slot strip has a fixed maximum width of nine slots and scrolls sideways (hotbar.js `overflow_x_scrollbar`, a visible thin wood-colored scrollbar); adding a space scrolls it to the end so the new slot is in view.
  - Popups that scroll (the agents popup, the folder picker list, the tabs "more" list) use the same styled scrollbar: 8px wide, dark brown track, wood thumb with a light top-left and dark bottom-right edge. Never the native scrollbar.
- Night: active slot frame is gold instead of red; box trim is gold.

## Pictures, pets and popups

### Picture picker

- Clicking the portrait opens "Pick a picture": a 5x5 grid of 25 pictures that fits inside the window without scrolling. The first is the user's portrait, named "Aslam Doctor" with the role "Developer" (user's decision, not "You"). The other 24 are the user's farmhands, in this order, as name and role: Orion Vale (Hacker), Atlas Reed (Archaeologist), Professor Volt (Eccentric Scientist), Lord Vesper (Vampire), Kael Nova (Bounty Hunter), Raven Cross (Secret Agent), Sylvan Ashwood (Elven Archer), Ragnar Stonefist (Barbarian), Elara Moonspell (Sorceress), Sir Aldric (Knight), Nyx Shadowstep (Rogue), Bramble Ironforge (Dwarf), Axel Forge (Genius), Nightclaw (Vigilante), Nova Starling (Cosmic Hero), Unit K-47 (Cyborg), Zorak Venn (Alien), Flashpoint Jett (Speedster), Milo Patches (Handyman), Kenzo Blaze (Martial Artist), Dorian Wolfsbane (Monster Hunter), Zara Flint (Explorer), Kaito Ember (Ninja), BEEP-09 (Robot). Each cell is a small dark tile with the picture (46px) on the left and, beside it, the name in cream (Pixelify Sans 600, one line, with a 1px dark shadow) over the role in a dark brown label with gold text. All names and roles fit on one line. The chosen cell gets a gold border and its role label turns gold with dark text. The tooltip is "name, role".
- Art style (user's brief): cozy retro 16-bit pixel art in the spirit of farming RPGs. Crisp, deliberately placed pixels with no anti-aliasing, blur, gradients or dithering; a warm, muted palette (sage and forest green, warm beige, terracotta, golden yellow, dusty blue, earthy brown) that every pixel snaps to; dark brown outlines (`#3b2418`), never pure black; three or four flat tones per material lit from the top left; cute proportions with expressive eyes and a distinct hairstyle, outfit or accessory each. Portraits are drawn on a 48x48 grid with a simple scenic background (valley, meadow, night, space, sea, castle, snow, sunset, city, desert). The user's own portrait is the supplied image and stays as it is.
- Borders: every picture (hotbar portrait, picker cells, agents popup rows, pane header) has a plain 2px dark brown (`#3b2418`) border. No wood frame (user said it looked comical) and no black. The chosen picker cell gets a gold (`#e8c65a`) border. Pictures never move: no hover lift and no lift on the chosen one (user's decision).
- The 24 farmhand pictures are supplied by the user as one sheet (6x4 cells, made with Gemini). Each cell is cropped to a square from just inside its frame, keeping the head and shoulders, and shipped as its own PNG. Like the user's portrait they scale smoothly, not snapped to the palette. The farmhand name in the agents popup and pane header comes from this list.
- One pixel scale: pictures are shown with nearest-neighbour scaling at whole device-pixel steps only (48px grid shown at 24, 48 or 72 CSS px on a 2x screen). The supplied pictures (the user's portrait and the 24 farmhands) are the exception and scale smoothly.
- The choice persists (`setState`).
- Agent faces: one farmhand face per app, not per agent (user's decision), so every agent of the same app shares a picture in the agents popup, the pane header and the peek. Defaults (my call): claude-code is Orion Vale, codex is Unit K-47, opencode is BEEP-09, and any other app is Milo Patches. The farmhand name follows the face. Helpers keep the chicken icon.
- The working chip and the clock box never wrap or shrink, even when the tab strip is full. To make room, the tabs shrink instead (down to 52px each, labels cut with an ellipsis); the "more" tab and the "+" button keep their size.

### Pet chooser

- The pet button opens "Pick a pet": chicken, duck, cat, dog, rabbit, turtle, frog, and "No pet" (an empty doghouse icon). Each has a name and a one-line trait. Sprites are 24x20 in the same art style, shown at 2x (48x40 on screen) in a box with the same dark brown border, with a walk pair and one action frame (peck, quack, nap, wag, hop, hide, croak). The pet roams the road; dragging and clicking behave as the chicken does today.

### Agents popup

- Opens from the working chip (which shows the working count and a red needs-you count, both counting helpers) or the "N helpers" chip in a pane header.
- Rows are grouped by tab. An agent row shows its picture, title, app, farmhand name, helper count and status. Clicking it selects that tab and focuses the agent (`agent.focus`).
- Helpers are terminals an agent started with `hc run` (no pane). They are nested under their agent with a chicken icon. Clicking one opens a peek window with its latest output (`terminal.peek`). "keep" gives it a pane in its tab (`terminal.keep`), after which the row shows "in a pane" and clicking it focuses that pane.
- The popup has a maximum height (about 450px at 960x600) and scrolls.

### Space icons

- Each hotbar space shows a 16x16 crop (carrot, pumpkin, wheat, sprout, tomato, corn) in the same art style, shown at 24px. Slots and the four tool buttons (plus, folder, peek, pet) have a 2px dark brown (`#3b2418`) inner border with a faint light line along the top, replacing the light wood border; the selected slot gets only a gold inner line and a gold key number. It does not move and has no bar under it (user's decision).

### Busy spaces

- Tabs: up to five fit; settled tabs leave the strip, then tabs past the fifth fold into "▾ N more" with small status dots for the hidden live ones. The popup lists hidden live tabs first, then a "settled" group, dimmed. The selected tab always stays in the strip (it replaces the last visible one if needed).
- Agents: the popup scrolls as above; counts in the working chip update.
- Spaces: the hotbar scrolls sideways past nine, as above.

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
- The script and format used to pre-render the portraits and pet frames, as long as the result matches the preview.
- Whether to keep the old status sprites (`can`, `bang`, `star`, `zzz`) anywhere; the mock uses dots instead.
