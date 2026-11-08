// Header role: a wooden plank over each pane with the agent's status icon,
// the pane's title, and zoom and close buttons. Click focuses the pane,
// double-click zooms it.
import { div, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { panes, terminals, props, home, run, openOverlay } from "herdr";
import { INK, LOOK, dotColor } from "./palette.js";
import { art, pic, petFrame } from "./art.js";
import { faceOf } from "./cast.js";
import { headerTitle, helpersOf, lookOf, repaintOnLook } from "./logic.js";
import { FONT, stop } from "./tabs.js";

// The pane's picture: an agent shows its farmhand's face with a status dot on the
// corner, any other pane shows the window sprite.
function icon(p, look) {
  if (p.status == null) return image(art(look === "night" ? "window-night" : "window")).w(18).h(14).flex_none();
  const dot = div().absolute().right(-3).bottom(-3).w(9).h(9).rounded_full().border_1().border_color("#000000").bg(dotColor(p.status));
  return div().relative().flex_none().w(24).h(24).border_2().border_color(INK)
    .child(image(pic(faceOf(p.app).file)).size_full())
    .child(p.status === "working" ? dot.loop("opacity", { from: 0.45, to: 1, period: 800 }) : dot);
}

function button(id, name, tip, onClick) {
  return div().id(id).flex_none().w(18).h(18).cursor_pointer().tooltip(tip)
    .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
    .on_click((_e, cx) => { cx.stop_propagation(); onClick(); })
    .child(image(art(name)).w(18).h(18));
}

export default class Header {
  init(_p, cx) {
    repaintOnLook(cx);
  }

  render() {
    const id = props()?.pane;
    const p = panes().find((x) => x.pane === id);
    const look = lookOf(new Date());
    const L = LOOK[look];
    if (!p) return div().size_full().bg(L.plank);
    const n = p.terminal && p.status != null ? (helpersOf(terminals() ?? [], panes()).get(p.terminal)?.length ?? 0) : 0;
    // As in the mock: a tab-colored chip with the chicken, right after the title.
    const chip = n === 0 ? null : h_flex().id(`dewdrop-helpers-${id}`).flex_none().items_center().gap(3).ml(2).pl(3).pr(5).py(1)
      .whitespace_nowrap().text_size(10).bg(L.tabOn[0]).text_color(L.tabOn[1]).border_2().border_color("#000000").cursor_pointer()
      .on_mouse_down("left", stop)
      .on_click((_e, cx) => { cx.stop_propagation(); openOverlay({ mod: "dewdrop", props: { role: "agents" }, kind: "popup", frame: "none" }); })
      .child(image(petFrame("chicken", "a")).w(14).h(12).flex_none())
      .child(`${n} helper${n === 1 ? "" : "s"}`);
    return h_flex().id(`dewdrop-header-${id}`).relative().size_full().font_family(FONT).items_center().gap(6).px(6).pb(2)
      .bg(L.plank).border_t_2().border_color(L.plankLight)
      // The 2px black line under the plank, as in the mock.
      .child(div().absolute().left(0).right(0).bottom(0).h(2).bg("#000000"))
      .on_click((e) => run(e.click_count >= 2 ? "pane.zoom" : "pane.focus", { pane: id }))
      .child(icon(p, look))
      .child(div().flex_shrink(1).min_w(0).truncate().text_size(13).text_color(p.focused ? L.plankText : L.plankDim)
        .child(headerTitle(p, home() ?? "")))
      .children(chip ? [chip] : [])
      .child(div().flex_1())
      .child(button(`dewdrop-zoom-${id}`, "btn-zoom", p.zoomed ? "Restore" : "Zoom", () => run("pane.zoom", { pane: id })))
      .child(button(`dewdrop-close-${id}`, "btn-close", "Close", () => run("pane.close", { pane: id })));
  }
}
