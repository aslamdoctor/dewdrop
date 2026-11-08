# Dewdrop spike findings (2026-11-08)

Tested on the running Herdr app with a scratch layout `layouts/dewdrop-spike.json` (a copy of `stardew` with a `valley` column) and a scratch mod `mods/dewdrop-spike`. Both were removed afterwards. Window was 2560x1409 logical at scale 2 (shots are 5120x2818).

## 1. Valley background

Question: with `root column -> titlebar 40px, valley column {background: {image, fit: cover}} -> main block, hotbar 64px`, and no background on `main` or `hotbar`, does the valley image paint behind both?

Answer: yes. The image shows in main's 16px padding around the panes and behind the whole hotbar. Panes keep their own `pane.background`.

## 2. Live swap

Question: does `run("layout.set", { layout })` with a deep copy of `layout()` (only the valley image and the tab block's `pane.border.color` changed) apply without a restart, keep everything in place, and keep the person's clicks?

Answer: yes, candidate 1 works. The new image showed within a second, with no `layout.error` and no entry in `herdr-app status` errors. The mod copies were not restarted (an init counter in the hotbar copy stayed at 1 and its in-memory text survived). Panes, hotbar contents and the floating block's bounds were unchanged (pixel diff only covered the background and the label that changed). `run` returns `null`.

Clicks: `layout()` already includes click values (a `layout.resize hotbar 72` showed up as `size.px: 72` in `layout()`). `layout.set` writes that whole tree into `layouts/<name>.json` and deletes `layouts/.state/<name>.json`, so the click values are kept, but they become file values. A click made between reading `layout()` and calling `layout.set` would be lost, so read and set in the same tick.

Note: `pane.border.color` changed in the file, but it is not visible on a focused lone pane, because `pane.focus` replaces the border while the pane has the keyboard. Change `focus.color` too if the day/night look should show on the focused pane.

Use: `layout.set` (candidate 1). Candidate 2 (`writeTextFile` of the layout file with the read snapshot as `expected`) also applied live without restarting mods, so it is a working fallback. Candidate 3 was not needed.

## 3. Peek

Question: after `layout.toggle {id: "main"}`, is the valley visible where the panes were, and does the hotbar stay at the bottom?

Answer: the valley is visible, but no, the hotbar jumps to the top of the valley column (the column packs its fixed children from the top once `main` is hidden).

Use: a hidden spacer block between `main` and `hotbar` (`{id: "peek-spacer", type: "block", hidden: true, content: {mod: ..., props: {role: "empty"}}}`, rendering an empty `div()`). Peek is `layout.hide main` + `layout.show peek-spacer`, and the reverse to come back. With that, the valley fills the space and the hotbar stays at the bottom (checked with a shot). The floating block stayed in place both ways.

## 4. Floating pet strip

Question: does Herdr's floating frame show around a 240x48 strip on `valley` (`edge: "bottom"`, `align: "end"`), and can the strip be transparent?

Answer: the frame shows (dark theme background, 1px border, rounded corners, 5px of padding above and below: bounds were 242x60 for a 240x48 strip). The strip cannot be transparent. An undocumented `"frame": "none"` on the floating entry was accepted without error but ignored (`frame: "none"` is only documented for `openOverlay`).

Use: the pet stays in a 56x48 box and walks in place.

## 5. Image scaling

Question: does gpui scale images smoothly or nearest, and is pre-rendering at 4x enough?

Answer: smooth (linear filtering). A 24x20 PNG shown at 48x40 and 72x60 came out blurry, with soft edges on every art pixel. The same sprite saved at 4x (96x80) and shown at 48x40 was fully crisp, because on a scale-2 display 48x40 logical is exactly 96x80 physical.

The 320x188 scene saved at 6x (1920x1128) on `cover` was upscaled about 2.7x to fill 5120 physical px, and the cell edges were visibly soft (blended lines between cells).

Use: 4x is enough for sprites shown at 2x their art size on a 2x display (a 1:1 physical match). Pick sprite sizes so `shown size x display scale = saved size`. For the full-window scene, 6x is not enough on this window; save it at about 16x (5120x3008) or accept soft edges. Zoom other than 1 will soften sprites too.

## 6. Scrollbar look

Question: which theme color keys paint the thumb of a `Scrollbar.horizontal("x")` placed in an 8px `div` with `bg("#2b1d14")`?

Answer: no dedicated key. `scrollbar` and `scrollbar_thumb` in the layout's `colors` were accepted (they even show up in `theme()`), but the thumb did not change. Bisecting with `#ff0000` overrides showed the thumb is `foreground` at about 35% alpha (`#f3e2b8` over `#2b1d14` gives `#6f6661`). `ring`, `muted`, `dim`, `border`, `accent`, `selected` and `hover` have no effect.

Also needed: `.viewport_from_layout()` on the `Scrollbar`. Without it the bar takes its viewport from the scroll area and paints over the bottom of the row, not inside the 8px strip.

Use: theme thumb color as is (it follows `foreground`, so it reads as a pale parchment bar on the dark strip). Recoloring it would mean changing `foreground` for the whole layout.

## 7. Helper terminals

Started a helper with `hc run --bg --json --name dewdrop-spike-helper -- sleep 600` from this agent's terminal (`t7n`).

Answer (`hc ls --json`, under `.terminals[]`):
- address: `address` (`"t8h"`)
- parent: `parent` (`"t7n"`; missing or null for a top-level terminal)
- title/name: `name` (the `--name` given, else absent/null); `title` (the program's window title, `""` for the helper)
- status: `status` is only present for agents that report (`"working"` etc.); the helper had none. `state` is `"live"` or `"finished"` (with `reason: "killed"`, `exit_code`, `finished_ms`).
- also: `agent` (program key, `"sleep"`), `cwd`, `turn`, `where` (`"aslams-mod / 1"`).

In a mod, `terminals()` gives the same plus `argv`, `labels` (object), `die_with_parent`, `keep`, `created_ms`, `foreground {argv, cwd, name, pid}`, `status` (plain word or `null`) and `program {key, name, icon, agent, ...}`. Claude Code's own subagents (the Agent tool, not `hc run`) do not appear as terminals; they show up in the parent terminal's `records` map: `{ "<id>": { "app": "claude-code", "state": "working", "title": "..." } }`.

## 8. Scroll to end

Question: can a mod scroll a plain `overflow_x_scroll` row to its end?

Answer: no. `gpui-kit.d.ts` has no scroll offset API for plain scroll areas; the only programmatic scrolling is `VirtualListScrollHandle` (`scroll_to_item(index, "top" | "center")`, `scroll_to_bottom()`) with `track_scroll` on a `v_virtual_list` / `h_virtual_list` (from docs, not observed).

Use: no auto-scroll; the new slot is reachable by scrolling. (If auto-scroll matters later, the hotbar row would have to become an `h_virtual_list` with fixed item widths and a handle.)
