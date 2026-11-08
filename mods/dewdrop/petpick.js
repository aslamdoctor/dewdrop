// Petpick role: a dialog with the seven pets and "No pet" in a 4-column grid.
// Click one to save it as "dewdrop.pet" (a pet key, or the word "none" for no pet) and close.
import { div, image } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { shared, setShared, closeOverlay, props } from "herdr";
import { INK, GOLD_LINE, LOOK } from "./palette.js";
import { petFrame, png } from "./art.js";
import { PET_KEYS, PETS, NO_PET, savedPet } from "./pets.js";
import { lookOf, repaintOnLook } from "./logic.js";
import { FONT } from "./tabs.js";

const COLS = 4;
const CELL_W = 100, CELL_H = 124, GAP = 6;

function cell(k, on, close) {
  const name = k ? PETS[k].name : "No pet";
  const trait = k ? PETS[k].trait : "The doghouse stays empty.";
  return v_flex().id(`dewdrop-pet-${k ?? "none"}`).flex_none().w(CELL_W).h(CELL_H).items_center().gap(3).px(4).py(6)
    .bg(on ? "#e8c65a47" : "#3b24182e").cursor_pointer().tooltip(name)
    .on_click(() => {
      setShared("dewdrop.pet", k ?? NO_PET);
      close();
    })
    .child(div().flex_none().w(56).h(48).flex().items_center().justify_center().border_2().border_color(on ? GOLD_LINE : INK)
      .bg("#2b1a1238")
      .child(image(k ? petFrame(k, "a") : png("doghouse")).w(48).h(40)))
    .child(div().font_family(FONT).text_size(12).font_weight(600).text_color(on ? "#f4de8e" : "#f3e2b8").child(name))
    .child(div().w_full().text_size(9).opacity(0.8).text_center().child(trait));
}

export default class PetPick {
  init(_p, cx) {
    repaintOnLook(cx);
  }

  render() {
    const L = LOOK[lookOf(new Date())];
    const chosen = savedPet(shared("dewdrop.pet"));
    const overlay = props()?.overlay;
    const close = () => { if (overlay) closeOverlay(overlay); };
    const keys = [...PET_KEYS, null];
    const rows = [];
    for (let r = 0; r < keys.length; r += COLS) {
      rows.push(h_flex().gap(GAP).children(keys.slice(r, r + COLS).map((k) => cell(k, k === chosen, close))));
    }
    return v_flex().size_full().relative().font_family(FONT).p(13).gap(8).bg(L.bar).text_color(L.text)
      .border(3).border_color("#000000")
      .child(div().absolute().top(0).left(0).right(0).bottom(0).border_2().border_color(L.trim))
      .child(h_flex().items_center().justify_between().text_size(13)
        .child(div().child("Pick a pet"))
        .child(div().id("dewdrop-petpick-close").cursor_pointer().px(6).tooltip("Close").on_click(close).child("x")))
      .child(v_flex().gap(GAP).children(rows));
  }
}
