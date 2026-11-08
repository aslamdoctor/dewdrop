// Hotbar role: every space as an inventory slot along the bottom. Twelve fit,
// more scroll sideways. The shown space has a red frame; a click switches to
// a space and hovering lists its agents.
import { div, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { agents, spaces, run } from "herdr";
import { C } from "./palette.js";
import { art } from "./art.js";
import { hotbarSlots, slotTooltip, statusLook } from "./logic.js";
import { FONT } from "./titlebar.js";

const SLOT = 48, FRAME = 3, STEP = SLOT + FRAME * 2 + 4;

function slot(s, space, all) {
  const look = statusLook(s.status);
  return div().id(`slot-${s.id}`).relative().flex_none().w(SLOT + FRAME * 2).h(SLOT + FRAME * 2)
    .border(FRAME).border_color(s.active ? C.red : "#00000000").cursor_pointer()
    .tooltip(slotTooltip(space, all))
    .on_click(() => run("space.select", { id: s.id }))
    .child(image(art("slot")).absolute().top(0).left(0).w(SLOT).h(SLOT))
    .child(div().absolute().top(0).left(0).w(SLOT).h(SLOT).flex().items_center().justify_center()
      .text_size(12).text_color(C.parchment).child(s.label))
    .when(Boolean(s.key), (el) => el.child(div().absolute().top(5).left(7).text_size(10).text_color(C.woodLight).child(s.key)))
    .when(Boolean(look), (el) => el.child(image(art(look.icon === "can" ? "can-1" : look.icon)).absolute().top(4).left(SLOT - 18).w(14).h(14)));
}

export default class Hotbar {
  init() {}

  render() {
    const list = spaces() ?? [];
    const all = agents() ?? [];
    const slots = hotbarSlots(list);
    const row = h_flex().id("dewdrop-hotbar-scroll").max_w(STEP * 12).min_w(0).h_full().items_center().gap(4)
      .overflow_x_scrollbar().children(slots.map((s, i) => slot(s, list[i], all)));
    return h_flex().size_full().font_family(FONT).items_center().justify_center()
      .child(div().flex().items_center().h(SLOT + FRAME * 2 + 6).min_w(STEP * 2).px(4).bg(C.wood).border(3).border_color(C.woodLight).child(row));
  }
}
