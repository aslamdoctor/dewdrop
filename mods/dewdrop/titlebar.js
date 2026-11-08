// Title bar role: a wooden strip with room for the traffic lights, the shown
// space's tabs, a working chip and a clock box (time and day).
// Colors come from lookOf(new Date()) at render time; the minute tick repaints
// the bar, so it changes look by itself at 6:00 and 18:00.
import { div, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { agents, terminals, panes, spaces, run, openOverlay } from "herdr";
import { C, LOOK } from "./palette.js";
import { art } from "./art.js";
import { syncLook, noteValley } from "./look.js";
import { openAgents, noteWidth } from "./agents.js";
import { clockText, agentCounts, helpersOf, lookOf, tabStrip, msToNextMinute, moreAt } from "./logic.js";
import { FONT, stop, dot, tabChip, bevel } from "./tabs.js";

export { FONT };

// The bar's height in layouts/dewdrop.json.
const TITLEBAR_H = 40;
// The more-tabs menu's width (tabs.js).
const MORE_W = 210;

export default class Titlebar {
  init(_p, cx) {
    // Re-aim at the next minute boundary on every tick, so the clock never
    // drifts and catches up on its first tick after the laptop wakes.
    const tick = (cx) => {
      cx.notify();
      cx.timer.after(msToNextMinute(new Date()), tick);
      safeSync();
    };
    // A failed swap must never stop the clock, so arm the timer before syncing.
    const safeSync = () => {
      try { syncLook(); } catch (_e) { /* retried on the next tick */ }
    };
    this.safeSync = safeSync;
    cx.timer.after(msToNextMinute(new Date()), tick);
  }

  render(cx) {
    // The valley is the window under this bar. A new size that wants another scene height
    // swaps the scene right after this render (layout.set can't run inside one). The first
    // render always does, which also covers the look on start.
    const view = window.viewport_size();
    noteWidth(view.width);
    if (noteValley(view.height - TITLEBAR_H)) cx.timer.after(1, () => this.safeSync());
    const now = new Date();
    const look = lookOf(now);
    const L = LOOK[look];
    const night = look === "night";
    const t = clockText(now);
    const text = (s, size, color) => div().text_size(size).text_color(color).whitespace_nowrap().child(s);
    const space = (spaces() ?? []).find((s) => s.active);
    const { strip, hidden, settled } = tabStrip(space?.tabs ?? []);
    const [offBg, offFg] = L.tabOff;
    const small = (id, label, onClick) => bevel(h_flex().id(id).relative().flex_none().h(28).items_center().justify_center().gap(4).px(8)
      .bg(offBg).text_color(offFg).text_size(12).border_2().border_color("#000000").whitespace_nowrap(), false)
      .on_mouse_down("left", stop)
      .when(Boolean(onClick), (el) => el.cursor_pointer().on_click(onClick))
      .when(!onClick, (el) => el.opacity(0.5))
      .child(label);

    const more = hidden.length + settled.length;
    // The menu opens under the chip, as in the mock: the press notes where the chip starts.
    const moreChip = more === 0 ? null : small("dewdrop-tabmore", `\u25BE ${more} more`, () =>
      openOverlay({ mod: "dewdrop", props: { role: "tabmore" }, kind: "popup", frame: "none",
        ...(this.moreLeft == null ? {} : { at: moreAt(this.moreLeft, view.width, MORE_W) }) }))
      .on_mouse_down("left", (e, cx) => {
        cx.stop_propagation();
        if (e.position && e.local_position) this.moreLeft = e.position.x - e.local_position.x;
      })
      .children(hidden.map((x) => dot(x.status, 6)));
    const plus = small("dewdrop-tabnew", "+", space ? () => run("tab.new", { space: space.id }) : null);

    const tabs = h_flex().flex_shrink(1).min_w(0).overflow_hidden().items_center().gap(4)
      .children(strip.map((x) => tabChip(x, look, (tab) => run("tab.select", { id: tab.id }))));

    const { working, blocked } = agentCounts(agents() ?? [], helpersOf(terminals() ?? [], panes() ?? []));
    // The mock's plank boxes: a black border with a light wood ring just inside it.
    const ring = () => div().absolute().top(0).left(0).right(0).bottom(0).border_2().border_color(L.barLight);
    const chip = h_flex().id("dewdrop-working").relative().flex_none().h(28).items_center().gap(6).px(10).whitespace_nowrap()
      .bg(C.soil).border_2().border_color("#000000").text_size(13).text_color(C.gold)
      .child(ring())
      .cursor_pointer().on_mouse_down("left", stop)
      .on_click(() => openAgents())
      .child(dot("working"))
      .child(`${working} working`)
      .when(blocked > 0, (c) => c.child(div().ml(4)).child(dot("blocked")).child(String(blocked)));

    const bg = night ? C.soil : C.parchment, fg = night ? C.parchment : C.soil, sub = night ? C.idle : C.wood;
    const clock = h_flex().relative().flex_none().h(28).items_center().gap(8).px(10).whitespace_nowrap()
      .bg(bg).border_2().border_color("#000000")
      .child(ring())
      .child(image(art(night ? "moon" : "sun")).w(16).h(16).flex_none())
      .child(text(t.time, 14, fg))
      .child(text(t.day, 11, sub));

    return h_flex().id("dewdrop-titlebar").relative().size_full().font_family(FONT).items_center().gap(8).pl(80).pr(8).pb(3)
      .bg(L.bar).border_t_2().border_color(L.barLight)
      // The 3px black line under the bar, as in the mock.
      .child(div().absolute().left(0).right(0).bottom(0).h(3).bg("#000000"))
      .child(tabs)
      .children(moreChip ? [moreChip] : [])
      .child(plus)
      .child(div().flex_1().min_w(0))
      .child(chip)
      .child(clock);
  }
}
