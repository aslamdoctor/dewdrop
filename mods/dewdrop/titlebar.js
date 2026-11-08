// Title bar role: a wooden strip with room for the traffic lights, the shown
// space's tabs, a working chip and a clock box (time, day, season).
// Colors come from lookOf(new Date()) at render time; the minute tick repaints
// the bar, so it changes look by itself at 6:00 and 18:00.
import { div, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { agents, terminals, panes, spaces, run, openOverlay } from "herdr";
import { C, LOOK } from "./palette.js";
import { art } from "./art.js";
import { syncLook } from "./look.js";
import { clockText, agentCounts, helpersOf, lookOf, tabStrip, msToNextMinute } from "./logic.js";
import { FONT, stop, dot, tabChip } from "./tabs.js";

export { FONT };

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
    cx.timer.after(msToNextMinute(new Date()), tick);
    safeSync();
  }

  render() {
    const now = new Date();
    const look = lookOf(now);
    const L = LOOK[look];
    const night = look === "night";
    const t = clockText(now);
    const text = (s, size, color) => div().text_size(size).text_color(color).whitespace_nowrap().child(s);
    const space = (spaces() ?? []).find((s) => s.active);
    const { strip, hidden, settled } = tabStrip(space?.tabs ?? []);
    const [offBg, offFg] = L.tabOff;
    const small = (id, label, onClick) => h_flex().id(id).flex_none().h(28).items_center().justify_center().gap(4).px(8)
      .bg(offBg).text_color(offFg).text_size(12).border_2().border_color("#000000").whitespace_nowrap()
      .on_mouse_down("left", stop)
      .when(Boolean(onClick), (el) => el.cursor_pointer().on_click(onClick))
      .when(!onClick, (el) => el.opacity(0.5))
      .child(label);

    const more = hidden.length + settled.length;
    const moreChip = more === 0 ? null : small("dewdrop-tabmore", `\u25BE ${more} more`, () =>
      openOverlay({ mod: "dewdrop", props: { role: "tabmore" }, kind: "popup", frame: "none" }))
      .children(hidden.map((x) => dot(x.status, 6)));
    const plus = small("dewdrop-tabnew", "+", space ? () => run("tab.new", { space: space.id }) : null);

    const tabs = h_flex().flex_shrink(1).min_w(0).overflow_hidden().items_center().gap(4)
      .children(strip.map((x) => tabChip(x, look, (tab) => run("tab.select", { id: tab.id }))));

    const helpers = [...helpersOf(terminals() ?? [], panes() ?? []).values()].flat();
    const { working, blocked } = agentCounts(agents() ?? [], helpers);
    const chip = h_flex().id("dewdrop-working").flex_none().h(28).items_center().gap(6).px(10).whitespace_nowrap()
      .bg(C.soil).border_2().border_color("#000000").text_size(13).text_color(C.gold)
      .cursor_pointer().on_mouse_down("left", stop)
      .on_click(() => openOverlay({ mod: "dewdrop", props: { role: "agents" }, kind: "popup", frame: "none" }))
      .child(dot("working"))
      .child(`${working} working`)
      .when(blocked > 0, (el) => el.child(div().ml(4)).child(dot("blocked")).child(String(blocked)));

    const bg = night ? C.soil : C.parchment, fg = night ? C.parchment : C.soil, sub = night ? C.idle : C.wood;
    const clock = h_flex().flex_none().h(28).items_center().gap(8).px(10).whitespace_nowrap()
      .bg(bg).border_2().border_color("#000000")
      .child(image(art(night ? "moon" : "sun")).w(16).h(16).flex_none())
      .child(text(t.time, 14, fg))
      .child(text(t.day, 11, sub))
      .child(div().flex_none().w(2).h(18).bg("#000000").opacity(0.35))
      .child(image(art("season-" + t.season.toLowerCase())).w(16).h(16).flex_none())
      .child(text(t.season, 12, fg));

    return h_flex().id("dewdrop-titlebar").size_full().font_family(FONT).items_center().gap(8).pl(80).pr(8)
      .bg(L.bar).border_t_2().border_color(L.barLight)
      .child(tabs)
      .children(moreChip ? [moreChip] : [])
      .child(plus)
      .child(div().flex_1().min_w(0))
      .child(chip)
      .child(clock);
  }
}
