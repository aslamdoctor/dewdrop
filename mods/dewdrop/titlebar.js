// Title bar role: a wooden strip with room for the traffic lights, the
// layout's name, and a clock box (day, time, season) with the number of
// working agents beside it, where a farm game would show your gold.
import { div, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { agents } from "herdr";
import { C } from "./palette.js";
import { art } from "./art.js";
import { clockText, workingCount, msToNextMinute, CLOCK } from "./logic.js";

export const FONT = "Pixelify Sans";

export default class Titlebar {
  init(_p, cx) {
    // Re-aim at the next minute boundary on every tick, so the clock never
    // drifts and catches up on its first tick after the laptop wakes.
    const tick = (cx) => {
      cx.notify();
      cx.timer.after(msToNextMinute(new Date()), tick);
    };
    cx.timer.after(msToNextMinute(new Date()), tick);
  }

  render() {
    const t = clockText(new Date());
    const working = workingCount(agents() ?? []);
    const text = (s, size, color) => div().text_size(size).text_color(color).truncate().child(s);

    const gold = h_flex().flex_none().gap(4).items_center().px(6).h(24).bg(C.soil).border_1().border_color(C.woodLight)
      .child(image(art("can-0")).w(16).h(16).flex_none())
      .child(text(String(working), 14, C.gold));

    const { w, h, split } = CLOCK;
    const box = div().relative().flex_none().w(w).h(h)
      .child(image(art("clock")).absolute().top(0).left(0).w(w).h(h))
      .child(h_flex().absolute().top(6).left(8).w(split - 10).h(24).items_center().gap(6)
        .child(text(t.day, 13, C.soil)).child(text(t.time, 13, C.soil)))
      .child(h_flex().absolute().top(6).left(split + 2).w(w - split - 8).h(24).items_center().justify_center()
        .child(text(t.season, 12, C.wood)));

    return h_flex().id("dewdrop-titlebar").size_full().font_family(FONT).items_center().gap(8).pl(80).pr(8)
      .bg(C.wood).border_t_2().border_color(C.woodLight)
      .child(div().flex_1().min_w(0).child(text("Dewdrop", 14, C.parchment)))
      .child(gold)
      .child(box);
  }
}
