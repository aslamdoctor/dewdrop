// Pet role: the floating critter, a 56x48 box (Herdr always frames a float, so it
// walks in place). It alternates its walk pair and plays the action frame now and then.
// It pops up with a heart when an agent finishes or a "!" when one gets blocked, for
// four seconds. Clicking it then focuses that agent. It plays no sounds.
import { div, image } from "gpui-kit";
import { agents, run, shared } from "herdr";
import { art, petFrame } from "./art.js";
import { chickenMood } from "./logic.js";
import { savedPet, PETS } from "./pets.js";
import { C, INK } from "./palette.js";
import { FONT } from "./tabs.js";

const SHOW_MS = 4000;
const STEP_MS = 400;
// Chance per step that the pet starts its action, and how many steps it lasts.
const ACT_CHANCE = 0.12;
const ACT_STEPS = { nap: 8, hide: 6 };

export default class Pet {
  init(_p, cx) {
    this.prev = new Map();
    this.mood = null;
    this.address = null;
    this.seq = 0;
    this.step = 0;
    this.acting = 0;
    const tick = (cx) => {
      cx.timer.after(STEP_MS, tick);
      this.step++;
      if (this.acting > 0) this.acting--;
      else if (Math.random() < ACT_CHANCE) this.acting = ACT_STEPS[PETS[savedPet(shared("dewdrop.pet"))]?.frames[2]] ?? 3;
      cx.notify();
    };
    cx.timer.after(STEP_MS, tick);
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

    const key = savedPet(shared("dewdrop.pet"));
    if (!key) return div();
    const frames = PETS[key].frames;
    // Still while a heart or "!" shows; otherwise the action, else the walk pair.
    const frame = this.mood ? frames[0] : this.acting > 0 ? frames[2] : frames[this.step % 2];

    const box = div().id("dewdrop-pet").relative().flex_none().w(56).h(48).flex().items_center().justify_center()
      // Only swallow the press while a heart or "!" is up and a click means
      // something; otherwise the press drags the float out of the way.
      .when(Boolean(this.address), (el) => el.cursor_pointer()
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .on_click(() => run("agent.focus", { terminal: this.address })))
      .child(image(petFrame(key, frame)).w(48).h(40));

    if (!this.mood) return box;
    const badge = this.mood === "alert"
      ? div().relative().flex().items_center().justify_center().w(16).h(16).bg(C.red).border_2().border_color(INK)
        .font_family(FONT).text_size(11).text_color("#ffffff").child("!")
      : image(art("heart")).w(16).h(16).relative();
    return box.child(div().absolute().top(4).right(2).child(badge.loop("top", { from: 0, to: -4, period: 600 })));
  }
}
