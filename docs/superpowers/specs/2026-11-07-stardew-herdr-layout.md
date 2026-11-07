# Stardew-inspired Herdr layout: spec

Agreed in the grilling session on 2026-11-07.

## Target

- Herdr desktop app 0.1.13 layout system (`~/.config/herdr-app/`), not the TUI `config.toml`.
- One theme (Spring), dark base. Seasons, Journal panel and original sounds are v2.
- Inspired by Stardew Valley's look only: original palette, original pixel art, no game sprites, characters (no Junimo), logo or ripped UI.

## Source and install

- Source lives in `/Users/aslamdoctor/Developer/aslams-mod`, laid out like a Herdr home (`layouts/`, `themes/`, `mods/stardew/`), under git.
- Installed by symlinking into `~/.config/herdr-app/`.
- `thrive` stays the default layout; `stardew` is switched on to try (`layout.switch`, `ctrl-shift-l` back, `ctrl-alt-shift-escape` resets).
- Win98 (`layouts/win98.json`, `mods/win98/`) is the structural reference.
- Ship `RECIPE.md`, `preview.png`, `layouts/stardew.svg`, MIT license, repo topic `herdr-layout`.

## Window, top to bottom

1. **Title bar**: custom (`titlebar: none`), wooden, traffic lights left, Stardew-style clock box right: real date and time, season from the month, running-agents count where gold would be.
2. **Main area**: active tab's panes, each with a wooden plank header; fence-post frame; farm background (grass, tilled soil, fence) in the gaps. `terminal_opacity` 1.
3. **Hotbar**: bottom inventory row, one slot per space, 12 visible max, overflow scrolls. Click switches space. Active slot has a red selection border. Hover shows the space name and its agents' states.

No side panel in v1.

## Status icons

| State | Icon | Color |
|------|------|-------|
| working | watering can (animated) | blue |
| blocked | red "!" speech bubble | red |
| done | harvest star | gold |
| idle | "Zzz" | muted brown |

## Critter

Original chicken, bottom-right edge. Idles pecking. Pops up with a heart when an agent finishes, with "!" when one gets blocked, then tucks back. Never blocks clicks.

## Look

| Token | Hex |
|------|-----|
| Terminal background (soil) | `#2b1d14` |
| Text (parchment) | `#f3e2b8` |
| Wood frame | `#8a5a2b` |
| Wood highlight | `#c58b4e` |
| Accent (grass) | `#6ab04c` |
| Selection (sky) | `#5fa8d3` |
| Blocked (red) | `#d9534f` |
| Done (gold) | `#f2c14e` |

ANSI 16 tuned to these. UI font: Pixelify Sans (OFL), bundled. Terminal font: Geist Mono. Sounds: the user's current done/blocked sounds.

## Verification

Every step: `herdr-app check` on the mod, no `layout.error`, and a `herdr-app shot` screenshot looked at before the step is called done.
