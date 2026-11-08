// Chicken role: a small floating critter at the field's bottom-right corner.
// It bobs while it pecks, and pops up with a heart when an agent finishes or
// a "!" when one gets blocked, for four seconds. Clicking it then focuses
// that agent. It plays no sounds; the user's own done/blocked sounds stay.
import { div, image } from "gpui-kit";
import { v_flex } from "gpui-base";
import { agents, run } from "herdr";
import { art } from "./art.js";
import { chickenMood } from "./logic.js";

const SHOW_MS = 4000;

export default class Chicken {
  init() {
    this.prev = new Map();
    this.mood = null;
    this.address = null;
    this.seq = 0;
  }

  render(cx) {
    const r = chickenMood(this.prev, agents() ?? []);
    this.prev = r.next;
    if (r.mood) {
      this.mood = r.mood;
      this.address = r.address;
      const seq = ++this.seq;
      // Only the latest mood's timer clears it, so a new event gets its full four seconds.
      cx.timer.after(SHOW_MS, (cx) => {
        if (seq !== this.seq) return;
        this.mood = null;
        this.address = null;
        cx.notify();
      });
    }

    const bird = div().id("dewdrop-chicken").relative().flex_none().w(32).h(32)
      // Only swallow the press while a heart or "!" is up and a click means
      // something; otherwise the press drags the float out of the way.
      .when(Boolean(this.address), (el) => el.cursor_pointer()
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .on_click(() => run("agent.focus", { terminal: this.address })))
      .child(image(art(this.mood ? "chicken-0" : "chicken-1")).w(32).h(32)
        .when(!this.mood, (el) => el.loop("top", { from: 0, to: 2, period: 900 })));

    return v_flex().items_center().gap(2).p(4)
      .when(Boolean(this.mood), (el) => el.child(
        image(art(this.mood === "alert" ? "bang" : "heart")).w(16).h(16).loop("top", { from: 0, to: -4, period: 600 })))
      .child(bird);
  }
}
