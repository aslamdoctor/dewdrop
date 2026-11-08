// The road pet, drawn by the hotbar under its wooden box: it walks the full width of the
// hotbar and faces the way it walks. Each leg is a native linear transition to the far
// end; a timer flips the target and the facing together at the end of the leg (one
// repaint per turn). A native loop can't be used: every loop runs on one shared clock
// whose phase the script can't see, so a turn timer drifts from it. It pops up a heart
// when an agent finishes or a "!" when one gets blocked, for four seconds, and keeps
// walking; a click then focuses that agent. It plays no sounds.
import { div, image } from "gpui-kit";
import { agents, run, shared } from "herdr";
import { art, petWalk } from "./art.js";
import { chickenMood, walkPlan, walkLeg, msToLeg, PET_W, PET_H } from "./logic.js";
import { savedPet, PET_WALK } from "./pets.js";
import { C, INK } from "./palette.js";
import { FONT } from "./tabs.js";

const SHOW_MS = 4000;
// The hotbar block is 64px tall: the badge rides at the top, the pet stands on the bottom.
const BLOCK_H = 64;
// The pet is first drawn standing at the start; the first leg begins this long after.
const START_MS = 100;

export default class RoadPet {
  constructor() {
    this.prev = new Map();
    this.mood = null;
    this.address = null;
    this.seq = 0;
    this.walk = null;
    this.walks = 0;
  }

  // Starts a fresh walk; the old walk's timer sees it is stale and stops.
  start(cx, key, plan) {
    const walk = { key, plan, n: -1, id: ++this.walks, t0: Date.now() + START_MS };
    this.walk = walk;
    const turn = (cx) => {
      if (this.walk !== walk) return;
      walk.n++;
      cx.timer.after(msToLeg(walk.t0, plan.leg, walk.n + 1, Date.now()), turn);
      cx.notify();
    };
    cx.timer.after(msToLeg(walk.t0, plan.leg, 0, Date.now()), turn);
  }

  // The pet element for this render, or null for "no pet".
  view(cx) {
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

    const pet = savedPet(shared("dewdrop.pet"));
    if (!pet) {
      this.walk = null;
      return null;
    }
    const plan = walkPlan(window.bounds().width, PET_WALK[pet].speed);
    const key = `${pet}:${plan.from}:${plan.to}`;
    if (this.walk?.key !== key) this.start(cx, key, plan);
    const w = this.walk;
    const { target, right } = walkLeg(plan, w.n);

    // A render with the same target (a mood change, say) leaves the transition running.
    const el = div().id(`dewdrop-pet-${w.id}`).absolute().top(0).left(target).w(PET_W).h(BLOCK_H)
      .transition("left", { duration: plan.leg, easing: "linear" })
      .when(Boolean(this.address), (el) => el.cursor_pointer()
        .on_click(() => run("agent.focus", { terminal: this.address })))
      .child(image(petWalk(pet, right ? "r" : "l")).absolute().left(0).top(BLOCK_H - PET_H).w(PET_W).h(PET_H));

    if (!this.mood) return el;
    const badge = this.mood === "alert"
      ? div().relative().flex().items_center().justify_center().w(16).h(16).bg(C.red).border_2().border_color(INK)
        .font_family(FONT).text_size(11).text_color("#ffffff").child("!")
      : image(art("heart")).w(16).h(16).relative();
    return el.child(div().absolute().top(4).left((PET_W - 16) / 2).child(badge.loop("top", { from: 0, to: -4, period: 600 })));
  }
}
