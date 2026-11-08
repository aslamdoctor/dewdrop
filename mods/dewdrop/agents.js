// Agents popup role: every farmhand (agent) grouped by "space / tab", with the helper
// terminals each one started nested under it. Click an agent to jump to it, click a helper
// to peek at it, "keep" gives it a pane. Grows to 450px, then scrolls with a styled bar.
import { div, image } from "gpui-kit";
import { h_flex, v_flex, Scrollbar } from "gpui-base";
import { agents, terminals, panes, run, closeOverlay, props } from "herdr";
import { INK, LOOK } from "./palette.js";
import { petFrame, pic } from "./art.js";
import { faceOf } from "./cast.js";
import { helpersOf, agentGroups, lookOf, repaintOnLook } from "./logic.js";
import { FONT, stop, dot } from "./tabs.js";

export const MAX_H = 450;
const W = 360;
const SCROLL_ID = "dewdrop-agents";
const HEAD_H = 22, AGENT_H = 34, HELPER_H = 26, PAD = 16;

// Rough content height, to decide whether the scroll bar strip is needed. The popup's
// own 2px borders take 4px of MAX_H, so callers compare against MAX_H - 4.
export function contentHeight(groups) {
  let h = PAD;
  for (const g of groups) {
    h += HEAD_H;
    for (const r of g.rows) h += AGENT_H + r.helpers.length * HELPER_H;
  }
  return h;
}

export default class Agents {
  init(_p, cx) {
    repaintOnLook(cx);
  }

  render() {
    const L = LOOK[lookOf(new Date())];
    const overlay = props()?.overlay;
    const close = () => { if (overlay) closeOverlay(overlay); };
    // Close in a finally so a failing run never leaves the popup stuck open.
    const then = (fn) => { try { fn(); } finally { close(); } };
    const groups = agentGroups(agents() ?? [], helpersOf(terminals() ?? [], panes() ?? []));

    const agentRow = (a, n) => h_flex().id(`dewdrop-agent-${a.address}`).h(AGENT_H - 4).mb(4).items_center().gap(6).px(6)
      .bg(L.slot).border_2().border_color("#000000").cursor_pointer().text_size(12)
      .on_click(() => then(() => { run("tab.select", { id: a.tab }); run("agent.focus", { terminal: a.address }); }))
      .child(div().flex_none().w(24).h(24).border_2().border_color(INK).child(image(pic(faceOf(a.app).file)).size_full()))
      .child(div().flex_1().min_w(0).truncate().child(a.title || a.address))
      .child(div().flex_none().text_size(10).opacity(0.7).child(`${a.app ?? "agent"} / ${faceOf(a.app).name}`))
      .when(n > 0, (el) => el.child(div().flex_none().text_size(10).opacity(0.85).child(`${n} helper${n === 1 ? "" : "s"}`)))
      .child(dot(a.status));

    const helperRow = (h) => h_flex().id(`dewdrop-helper-${h.address}`).h(HELPER_H - 4).mb(4).ml(20).items_center().gap(6).px(6)
      .bg(L.slot).border_1().border_color("#000000").cursor_pointer().text_size(11)
      .on_click(() => then(() => (h.pane ? run("pane.focus", { pane: h.pane }) : run("terminal.peek", { terminal: h.address }))))
      .child(div().flex_none().w(20).h(17).border_2().border_color(INK).child(image(petFrame("chicken", "a")).size_full()))
      .child(div().flex_1().min_w(0).truncate().child(h.title))
      .when(Boolean(h.pane), (el) => el.child(div().flex_none().text_size(10).opacity(0.7).child("in a pane")))
      .when(!h.pane, (el) => el.child(div().id(`dewdrop-keep-${h.address}`).flex_none().px(5).text_size(10)
        .bg(L.tabOff[0]).text_color(L.tabOff[1]).border_1().border_color("#000000").cursor_pointer()
        .on_mouse_down("left", stop)
        .on_click((_e, cx) => { cx.stop_propagation(); run("terminal.keep", { terminal: h.address }); })
        .child("keep")))
      .child(dot(h.status, 6));

    const body = v_flex().id(SCROLL_ID).flex_1().min_w(0).min_h(0).overflow_y_scroll().p(8)
      .children(groups.length === 0
        ? [div().text_size(12).opacity(0.8).child("No farmhands at work.")]
        : groups.map((g) => v_flex()
          .child(div().h(HEAD_H - 4).mb(4).text_size(10).opacity(0.8).truncate().child(`${g.space_name} / ${g.tab_name || g.tab_index}`))
          .children(g.rows.flatMap((r) => [agentRow(r.agent, r.helpers.length), ...r.helpers.map(helperRow)]))));

    const long = contentHeight(groups) > MAX_H - 4;
    return h_flex().w(W).max_h(MAX_H).items_stretch().font_family(FONT).bg(L.bar).text_color(L.text).border_2().border_color("#000000")
      .child(body)
      .when(long, (el) => el.child(div().flex_none().w(8).bg("#0000004d").child(Scrollbar.vertical(SCROLL_ID).size_full().viewport_from_layout())));
  }
}
