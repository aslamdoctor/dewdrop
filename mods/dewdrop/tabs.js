// Tab pieces for the title bar: the status dot, the chips, and the "tabmore" popup
// that lists the tabs which didn't fit (live first, then settled ones, dimmed).
import { div } from "gpui-kit";
import { h_flex, v_flex, Scrollbar } from "gpui-base";
import { spaces, run, closeOverlay, props } from "herdr";
import { LOOK, dotColor } from "./palette.js";
import { lookOf, tabStrip } from "./logic.js";

export const FONT = "Pixelify Sans";
export const stop = (_e, cx) => cx.stop_propagation();

// A round status dot. A working one pulses.
export function dot(status, size = 8) {
  const d = div().flex_none().w(size).h(size).rounded_full().border_1().border_color("#000000").bg(dotColor(status));
  return status === "working" ? d.loop("opacity", { from: 0.45, to: 1, period: 800 }) : d;
}

// The mock's inset bevel inside a title bar chip: a light top line on the chosen tab,
// a dark bottom line on every chip. The parent must be relative().
export function bevel(el, on) {
  return el
    .when(on, (e) => e.child(div().absolute().top(0).left(0).right(0).h(2).bg("#ffffff73")))
    .child(div().absolute().bottom(0).left(0).right(0).h(3).bg(on ? "#0000002e" : "#00000040"));
}

// One tab chip in the strip (fixed 86px, shrinking).
export function tabChip(tab, look, onSelect) {
  const [bg, fg] = tab.active ? LOOK[look].tabOn : LOOK[look].tabOff;
  const chip = h_flex().id(`dewdrop-tab-${tab.id}`).relative().flex_shrink(1).w(86).min_w(52).h(28).overflow_hidden()
    .items_center().gap(6).px(7).bg(bg).text_color(fg).text_size(12).border_2().border_color("#000000")
    .cursor_pointer().whitespace_nowrap();
  return bevel(chip, tab.active)
    .on_mouse_down("left", stop).on_click(() => onSelect(tab))
    .child(div().flex_none().opacity(0.7).child(String(tab.index)))
    .child(div().flex_1().min_w(0).truncate().child(tab.name))
    .child(dot(tab.status));
}

const MORE_ID = "dewdrop-tabmore";
const MORE_MAX_H = 400;
const select = (tab) => run("tab.select", { id: tab.id });

// Popup role: hidden live tabs, then a "settled" heading and the settled ones.
export default class TabMore {
  init() {}

  render() {
    const look = lookOf(new Date());
    const L = LOOK[look];
    const space = (spaces() ?? []).find((s) => s.active);
    const { hidden, settled } = tabStrip(space?.tabs ?? []);
    const overlay = props()?.overlay;
    const pick = (tab) => { try { select(tab); } finally { if (overlay) closeOverlay(overlay); } };
    const row = (tab, dim) => {
      const [bg, fg] = L.tabOff;
      return h_flex().id(`dewdrop-more-${tab.id}`).items_center().gap(6).px(6).py(4).mb(3).text_size(12)
        .bg(bg).text_color(fg).border_2().border_color("#000000").cursor_pointer()
        .when(dim, (el) => el.opacity(0.55))
        .on_click(() => pick(tab))
        .child(div().flex_none().w(16).opacity(0.7).child(String(tab.index)))
        .child(div().flex_1().min_w(0).truncate().child(tab.name))
        .child(dot(tab.status));
    };
    const body = v_flex().id(MORE_ID).flex_1().min_w(0).min_h(0).overflow_y_scroll().p(8)
      .children(hidden.map((t) => row(t, false)))
      .when(settled.length > 0, (el) => el.child(div().text_size(10).opacity(0.75).mt(6).mb(3).child("settled")))
      .children(settled.map((t) => row(t, true)));
    // Rough height: 8px padding twice, a 29px row each, and the "settled" heading.
    const long = 16 + (hidden.length + settled.length) * 29 + (settled.length > 0 ? 25 : 0) > MORE_MAX_H - 4;
    return h_flex().w(210).max_h(MORE_MAX_H).items_stretch().font_family(FONT).bg(L.bar).text_color(L.text).border_2().border_color("#000000")
      .child(body)
      .when(long, (el) => el.child(div().flex_none().w(8).bg("#0000004d").child(Scrollbar.vertical(MORE_ID).size_full().viewport_from_layout())));
  }
}
