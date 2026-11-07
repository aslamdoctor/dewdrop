// Header role: a wooden plank over each pane with the agent's status icon,
// the pane's title, and zoom and close buttons. Click focuses the pane,
// double-click zooms it.
import { div, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { panes, props, home, run } from "herdr";
import { C } from "./palette.js";
import { art } from "./art.js";
import { headerTitle, statusLook } from "./logic.js";
import { FONT } from "./titlebar.js";

function icon(status) {
  const look = statusLook(status);
  if (!look) return div().w(16).h(16).flex_none();
  const img = image(art(look.icon === "can" ? "can-1" : look.icon)).w(16).h(16).flex_none();
  return look.icon === "can" ? img.loop("opacity", { from: 0.45, to: 1, period: 800 }) : img;
}

function button(id, name, tip, onClick) {
  return div().id(id).flex_none().w(18).h(18).cursor_pointer().tooltip(tip)
    .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
    .on_click((_e, cx) => { cx.stop_propagation(); onClick(); })
    .child(image(art(name)).w(18).h(18));
}

export default class Header {
  init() {}

  render() {
    const id = props()?.pane;
    const p = panes().find((x) => x.pane === id);
    if (!p) return div().size_full().bg(C.wood);
    return h_flex().id(`stardew-header-${id}`).size_full().font_family(FONT).items_center().gap(6).px(6)
      .bg(C.wood).border_t_2().border_color(C.woodLight)
      .on_click((e) => run(e.click_count >= 2 ? "pane.zoom" : "pane.focus", { pane: id }))
      .child(icon(p.status))
      .child(div().flex_1().min_w(0).truncate().text_size(13).text_color(p.focused ? C.parchment : C.soil)
        .child(headerTitle(p, home() ?? "")))
      .child(button(`stardew-zoom-${id}`, "btn-zoom", p.zoomed ? "Restore" : "Zoom", () => run("pane.zoom", { pane: id })))
      .child(button(`stardew-close-${id}`, "btn-close", "Close", () => run("pane.close", { pane: id })));
  }
}
