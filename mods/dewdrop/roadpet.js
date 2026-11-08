// The road pet, drawn by the hotbar under its wooden box: it walks the full width of the
// hotbar, in the middle of the road, and faces the way it walks. Each leg is a native
// linear transition to the far end; a timer flips the target and the facing together at
// the end of the leg (one repaint per turn). A native loop can't be used: every loop runs
// on one shared clock whose phase the script can't see, so a turn timer drifts from it.
// It pops up a heart when an agent finishes or a "!" when one gets blocked, for four
// seconds, and keeps walking; a click then focuses that agent. It plays no sounds.
//
// It can be picked up: a press on the pet and a small move carries it (the hotbar sends
// the moves, since the pointer soon leaves the pet). While held it follows the pointer at
// once and stops walking. Let go (or leave the hotbar) and it falls back to the road,
// hops once and walks on from there, the way it was facing (resumeWalk re-anchors the
// clock, so the turn timer math still holds).
import { div, image } from "gpui-kit";
import { agents, run, shared } from "herdr";
import { art, petWalk } from "./art.js";
import {
  chickenMood, walkPlan, walkLeg, msToLeg, nextLeg, resumeWalk, heldSpot, hopAfterDrop, HOP,
  PET_W, PET_H, ROAD_H,
} from "./logic.js";
import { savedPet, PET_WALK } from "./pets.js";
import { C, INK } from "./palette.js";
import { FONT } from "./tabs.js";

const SHOW_MS = 4000;
// The pet is first drawn standing at the start; the first leg begins this long after.
const START_MS = 100;
// A press only turns into a carry once the pointer has moved this far, so a plain click
// stays a click.
const DRAG_SLOP = 3;
// Clicks this soon after a drop belong to the drop, not to whatever is under the pointer.
const DROP_QUIET_MS = 150;
// While held the pet follows the pointer: a 1ms transition is as good as none.
const SNAP = { duration: 1, easing: "linear" };

export default class RoadPet {
  constructor() {
    this.prev = new Map();
    this.mood = null;
    this.address = null;
    this.seq = 0;
    this.walk = null;
    this.walks = 0;
    this.grab = null; // a press on the pet: { ox, oy, sx, sy }
    this.held = null; // being carried: { x, y, right }
    this.hop = 2; // hopAfterDrop step; 2 is resting on the road
    this.hops = 0;
    this.droppedAt = 0;
  }

  // Starts a fresh walk; the old walk's timer sees it is stale and stops.
  start(cx, key, plan) {
    const walk = { key, plan, n: -1, id: ++this.walks, t0: Date.now() + START_MS, dur: plan.leg, stand: null };
    this.walk = walk;
    this.grab = null;
    this.held = null;
    this.arm(cx, walk);
  }

  // Arms the timer for the next turn of this walk.
  arm(cx, walk) {
    const { plan } = walk;
    const turn = (cx) => {
      if (this.walk !== walk) return;
      const next = nextLeg(walk.t0, plan.leg, walk.n, Date.now());
      walk.n = next.n;
      walk.t0 = next.t0;
      walk.dur = plan.leg;
      this.arm(cx, walk);
      cx.notify();
    };
    cx.timer.after(msToLeg(walk.t0, plan.leg, walk.n + 1, Date.now()), turn);
  }

  // True while the pet is carried or was just dropped: the hotbar skips clicks then.
  busy() {
    return Boolean(this.held) || Date.now() - this.droppedAt < DROP_QUIET_MS;
  }

  // A press on the pet's body. local_position is inside the body, which is the offset
  // the pointer keeps while carrying it.
  press(e) {
    if (!this.walk || !e.local_position) return;
    this.grab = { ox: e.local_position.x, oy: e.local_position.y, sx: e.position.x, sy: e.position.y };
  }

  // A pointer move over the hotbar; local_position is in the hotbar's own space.
  move(e, cx) {
    const g = this.grab;
    const w = this.walk;
    if (!g || !w) return;
    if (!this.held) {
      if (Math.max(Math.abs(e.position.x - g.sx), Math.abs(e.position.y - g.sy)) < DRAG_SLOP) return;
      // Pick it up: a new walk object stops the old turn timer, and a new hop number
      // stops a landing that's still going.
      this.walk = { ...w };
      this.hops++;
      this.held = { x: 0, y: 0, right: walkLeg(w.plan, w.n).right };
    }
    const spot = heldSpot(this.walk.plan, e.local_position.x - g.ox, e.local_position.y - g.oy);
    this.held = { ...this.held, ...spot };
    cx.notify();
  }

  // Mouse up over the hotbar, or the pointer left it: a carried pet is dropped.
  release(cx) {
    this.grab = null;
    const h = this.held;
    const w = this.walk;
    if (!h) return;
    this.held = null;
    if (!w) return;
    const now = Date.now();
    this.droppedAt = now;
    // It walks on once it lands; until then it stands where it was let go.
    const r = resumeWalk(w.plan, h.x, h.right, now + HOP.fall);
    const walk = { key: w.key, plan: w.plan, id: w.id, n: r.n, t0: r.t0, dur: r.dur, stand: r.x };
    this.walk = walk;
    this.hop = 0;
    const hop = ++this.hops;
    cx.timer.after(HOP.fall, (cx) => {
      if (hop !== this.hops) return;
      this.hop = 1;
      if (this.walk === walk) {
        walk.stand = null;
        this.arm(cx, walk);
      }
      cx.notify();
      cx.timer.after(HOP.up, (cx) => {
        if (hop !== this.hops) return;
        this.hop = 2;
        cx.notify();
      });
    });
    cx.notify();
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
      this.grab = null;
      this.held = null;
      return null;
    }
    const plan = walkPlan(window.bounds().width, PET_WALK[pet].speed);
    const key = `${pet}:${plan.from}:${plan.to}`;
    if (this.walk?.key !== key) this.start(cx, key, plan);
    const w = this.walk;
    const leg = walkLeg(plan, w.n);
    const h = this.held;
    const hop = hopAfterDrop(this.hop);

    // A render with the same target (a mood change, say) leaves the transitions running.
    const left = h ? h.x : (w.stand ?? leg.target);
    const right = h ? h.right : leg.right;
    const xMove = h || w.stand !== null ? SNAP : { duration: w.dur, easing: "linear" };
    const body = div().id("dewdrop-pet-body").absolute().left(0).top(h ? h.y : hop.top).w(PET_W).h(PET_H)
      .transition("top", h ? SNAP : { duration: hop.duration, easing: hop.easing })
      .map((el) => (h ? el.cursor_grabbing() : el.cursor_grab()))
      .on_mouse_down("left", (e) => this.press(e))
      .child(image(petWalk(pet, right ? "r" : "l")).size_full());
    const el = div().id(`dewdrop-pet-${w.id}`).absolute().top(0).left(left).w(PET_W).h(ROAD_H)
      .transition("left", xMove)
      .when(Boolean(this.address), (el) => el.cursor_pointer()
        .on_click(() => { if (!this.busy()) run("agent.focus", { terminal: this.address }); }))
      .child(body);

    if (!this.mood) return el;
    const badge = this.mood === "alert"
      ? div().relative().flex().items_center().justify_center().w(16).h(16).bg(C.red).border_2().border_color(INK)
        .font_family(FONT).text_size(11).text_color("#ffffff").child("!")
      : image(art("heart")).w(16).h(16).relative();
    // The badge bobs between 0 and 3 at the top of the block, over the pet's head, so the
    // block never clips it.
    return el.child(div().absolute().top(0).left((PET_W - 16) / 2).child(badge.loop("top", { from: 3, to: 0, period: 600 })));
  }
}
