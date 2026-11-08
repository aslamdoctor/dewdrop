// Picker role: a dialog with the 25 pictures (the user plus 24 farmhands) in a
// 5-column grid. Click one to save it as "dewdrop.picture" and close.
import { div, image } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { shared, setShared, closeOverlay, props } from "herdr";
import { INK, GOLD_LINE, LOOK } from "./palette.js";
import { pic } from "./art.js";
import { CAST, pictureIndex } from "./cast.js";
import { lookOf, repaintOnLook } from "./logic.js";
import { FONT } from "./tabs.js";

const COLS = 5;
const CELL_W = 172, CELL_H = 58, GAP = 5;

function cell(a, i, on, close) {
  const tip = a.role ? `${a.name}, ${a.role}` : a.name;
  return h_flex().id(`dewdrop-pick-${i}`).flex_none().w(CELL_W).h(CELL_H).items_center().gap(8).px(5)
    .bg("#2b1a122e").border_2().border_color(on ? GOLD_LINE : "#00000000")
    .cursor_pointer().tooltip(tip)
    .on_click(() => {
      setShared("dewdrop.picture", i);
      close();
    })
    .child(div().flex_none().w(46).h(46).border_2().border_color(on ? GOLD_LINE : INK).opacity(on ? 1 : 0.88)
      .child(image(pic(a.file)).size_full()))
    .child(v_flex().flex_1().min_w(0).gap(4)
      .child(div().min_w(0).truncate().whitespace_nowrap().text_size(11).font_weight(600).text_color(on ? "#f4de8e" : "#f3e2b8").child(a.name))
      .child(h_flex().child(div().min_w(0).truncate().whitespace_nowrap().px(5).py(2).text_size(9.5)
        .bg(on ? GOLD_LINE : INK).text_color(on ? INK : GOLD_LINE).child(a.role))));
}

export default class Picker {
  init(_p, cx) {
    repaintOnLook(cx);
  }

  render() {
    const L = LOOK[lookOf(new Date())];
    const chosen = pictureIndex(shared("dewdrop.picture"));
    const overlay = props()?.overlay;
    const close = () => { if (overlay) closeOverlay(overlay); };
    const rows = [];
    for (let r = 0; r < CAST.length; r += COLS) {
      rows.push(h_flex().gap(GAP).children(CAST.slice(r, r + COLS).map((a, k) => cell(a, r + k, r + k === chosen, close))));
    }
    return v_flex().size_full().relative().font_family(FONT).p(13).gap(8).bg(L.bar).text_color(L.text)
      .border(3).border_color("#000000")
      .child(div().absolute().top(0).left(0).right(0).bottom(0).border_2().border_color(L.trim))
      .child(h_flex().items_center().justify_between().text_size(13)
        .child(div().child("Pick a picture"))
        .child(div().id("dewdrop-pick-close").cursor_pointer().px(6).tooltip("Close").on_click(close).child("x")))
      .child(v_flex().gap(GAP).children(rows));
  }
}
