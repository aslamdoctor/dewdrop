// The road pet, drawn by the hotbar under its wooden box. It lives the way it does in the
// preview: it walks a while, dashes, stands about, or does its own action (the cat naps,
// the chicken pecks, the dog wags, the turtle hides), each for a few seconds, then picks
// again (nextSegment and PET_ACTS). Moves are native linear transitions of `left`; a timer
// at the end of each segment picks the next one (one repaint per segment).
//
// It pops up a heart when an agent finishes or a "!" when one gets blocked, for four
// seconds; a click then focuses that agent. Otherwise a click pokes it and it reacts as in
// the preview (petPoke): a napping cat wakes and walks off, a frog croaks and leaps round.
//
// It can be picked up: a press on the pet and a small move carries it (the hotbar sends
// the moves, since the pointer soon leaves the pet). While held it follows the pointer at
// once. Let go (or leave the hotbar) and it falls back to the road, hops once, stands a
// moment and carries on from there. It plays no sounds.
import { div, image } from "gpui-kit";
import { agents, run, shared } from "herdr";
import { art, petWalk, petFrame, petDo } from "./art.js";
import {
  chickenMood, walkPlan, heldSpot, hopAfterDrop, HOP, segment, segX, nextSegment, petPoke,
  PET_W, PET_H, ROAD_H, ROAD_TOP,
} from "./logic.js";
import { savedPet, PET_WALK, PET_ACTS } from "./pets.js";
import { C, INK } from "./palette.js";
import { FONT } from "./tabs.js";

const SHOW_MS = 4000;
// A new pet stands this long before it first picks something to do.
const START_MS = 600;
// After a drop it stands this long once it has landed.
const DROP_REST_MS = 1100;
// A press only turns into a carry once the pointer has moved this far, so a plain click
// stays a click.
const DRAG_SLOP = 3;
// Clicks this soon after a drop belong to the drop, not to whatever is under the pointer.
const DROP_QUIET_MS = 150;
// While held the pet follows the pointer: a 1ms transition is as good as none.
const SNAP = { duration: 1, easing: "linear" };
// How long a poke's heart shows.
const LOVE_MS = 2200;

const moving = (s) => s.state === "walk" || s.state === "dash";

export default class RoadPet {
  constructor() {
    this.prev = new Map();
    this.mood = null;
    this.address = null;
    this.seq = 0;
    this.pet = null;
    this.key = null; // pet and road ends; a change restarts the pet where it is
    this.plan = null;
    this.seg = null; // the current segment, with its start time t0
    this.segs = 0; // bumped to stop a segment's timer
    this.ids = 0;
    this.grab = null; // a press on the pet: { ox, oy, sx, sy }
    this.held = null; // being carried: { x, y, dir }
    this.hop = 2; // hopAfterDrop step; 2 is resting on the road
    this.lift = HOP.lift; // how high the current hop goes
    this.hops = 0;
    this.droppedAt = 0;
    this.loved = false;
    this.loves = 0;
    this.said = null;
    this.says = 0;
  }

  // Switches to segment s from now. When it ends, the timer picks the next one.
  go(cx, s) {
    const seg = { ...s, t0: Date.now() };
    this.seg = seg;
    const n = ++this.segs;
    cx.timer.after(seg.dur, (cx) => {
      if (n !== this.segs || !this.pet) return;
      this.go(cx, nextSegment(PET_ACTS[this.pet], PET_WALK[this.pet].speed, seg.x1, seg.dir, this.plan, Math.random));
      cx.notify();
    });
  }

  // A segment for the current pet and road.
  make(state, x, dir, ms) {
    return segment(state, x, dir, ms, PET_WALK[this.pet].speed, this.plan);
  }

  // True while the pet is carried or was just dropped: the hotbar skips clicks then.
  busy() {
    return Boolean(this.held) || Date.now() - this.droppedAt < DROP_QUIET_MS;
  }

  // A press on the pet's body. local_position is inside the body, which is the offset
  // the pointer keeps while carrying it.
  press(e) {
    if (!this.seg || !e.local_position) return;
    this.grab = { ox: e.local_position.x, oy: e.local_position.y, sx: e.position.x, sy: e.position.y };
  }

  // A pointer move over the hotbar; local_position is in the hotbar's own space.
  move(e, cx) {
    const g = this.grab;
    if (!g || !this.seg) return;
    if (!this.held) {
      if (Math.max(Math.abs(e.position.x - g.sx), Math.abs(e.position.y - g.sy)) < DRAG_SLOP) return;
      // Pick it up: stop the segment's timer and any landing that's still going.
      this.segs++;
      this.hops++;
      this.held = { x: 0, y: 0, dir: this.seg.dir };
    }
    const spot = heldSpot(this.plan, e.local_position.x - g.ox, e.local_position.y - g.oy);
    this.held = { ...this.held, ...spot };
    cx.notify();
  }

  // Mouse up over the hotbar, or the pointer left it: a carried pet is dropped.
  release(cx) {
    const g = this.grab;
    this.grab = null;
    const h = this.held;
    // A press and release with no carry is a click: a poke, unless the badge's click
    // is focusing an agent.
    if (!h) {
      if (g && !this.address) this.poke(cx);
      return;
    }
    this.held = null;
    if (!this.seg || !this.pet) return;
    this.droppedAt = Date.now();
    // It stands where it was let go while it falls, hops and rests, then carries on.
    this.go(cx, this.make("idle", h.x, h.dir, HOP.fall + DROP_REST_MS));
    this.hop = 0;
    this.lift = HOP.lift;
    const hop = ++this.hops;
    cx.timer.after(HOP.fall, (cx) => {
      if (hop !== this.hops) return;
      this.hop = 1;
      cx.notify();
      cx.timer.after(HOP.up, (cx) => {
        if (hop !== this.hops) return;
        this.hop = 2;
        cx.notify();
      });
    });
    cx.notify();
  }

  // A click on the pet: it reacts the way petPoke says.
  poke(cx) {
    const s = this.seg;
    if (!s || !this.pet) return;
    const now = Date.now();
    const p = petPoke(this.pet, Math.random(), s.state === "act");
    if (p.heart) {
      const n = ++this.loves;
      this.loved = true;
      cx.timer.after(LOVE_MS, (cx) => {
        if (n !== this.loves) return;
        this.loved = false;
        cx.notify();
      });
    }
    if (p.say) {
      const n = ++this.says;
      this.said = p.say;
      cx.timer.after(p.sayMs, (cx) => {
        if (n !== this.says) return;
        this.said = null;
        cx.notify();
      });
    }
    if (p.state) this.go(cx, this.make(p.state, segX(s, now), p.turn ? -s.dir : s.dir, p.dur));
    if (p.jump) {
      const hop = ++this.hops;
      this.lift = ROAD_TOP;
      this.hop = 1;
      cx.timer.after(HOP.jump, (cx) => {
        if (hop !== this.hops) return;
        this.hop = 2;
        cx.notify();
      });
    }
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
      this.pet = null;
      this.key = null;
      this.seg = null;
      this.segs++;
      this.grab = null;
      this.held = null;
      return null;
    }
    const plan = walkPlan(window.bounds().width, PET_WALK[pet].speed);
    const key = `${pet}:${plan.from}:${plan.to}`;
    if (this.key !== key) {
      // A new pet, or the window changed size: it starts standing where the last one was
      // (the left end the first time), under a new element id so nothing slides there.
      const x = this.seg ? segX(this.seg, Date.now()) : plan.from;
      this.pet = pet;
      this.key = key;
      this.plan = plan;
      this.id = ++this.ids;
      this.grab = null;
      this.held = null;
      this.go(cx, this.make("idle", x, 1, START_MS));
    }
    const s = this.seg;
    const h = this.held;
    const acts = PET_ACTS[pet];
    const hop = hopAfterDrop(this.hop, this.lift);
    const right = (h ? h.dir : s.dir) > 0;
    const d = right ? "r" : "l";
    const still = (f) => petFrame(pet, right ? `${f}-r` : f);
    const walking = !h && moving(s);
    const acting = !h && s.state === "act";

    // A render with the same target (a mood change, say) leaves the transitions running.
    const left = h ? h.x : s.x1;
    const xMove = walking ? { duration: s.dur, easing: "linear" } : SNAP;
    const src = walking ? petWalk(pet, d)
      : acting ? (acts.frames.length > 1 ? petDo(pet, d) : still(acts.frames[0]))
      : still("a");
    const body = div().id("dewdrop-pet-body").absolute().left(0).top(h ? h.y : hop.top).w(PET_W).h(PET_H)
      .transition("top", h ? SNAP : { duration: hop.duration, easing: hop.easing })
      .map((el) => (h ? el.cursor_grabbing() : el.cursor_grab()))
      .on_mouse_down("left", (e) => this.press(e))
      .child(image(src).size_full());
    const el = div().id(`dewdrop-pet-${this.id}`).absolute().top(0).left(left).w(PET_W).h(ROAD_H)
      .transition("left", xMove)
      .when(Boolean(this.address), (el) => el.cursor_pointer()
        .on_click(() => { if (!this.busy()) run("agent.focus", { terminal: this.address }); }))
      .child(body);

    // A word bubble beside the pet, on the side with more road: a poke's word, or the
    // one its action says ("z z" while the cat naps).
    const word = this.said ?? (acting ? acts.say ?? null : null);
    const out = word ? el.child((left > plan.to - 90 ? div().absolute().right(PET_W + 2) : div().absolute().left(PET_W + 2))
      .top(ROAD_TOP - 2).px(5).py(2).bg("#f3e2b8").text_color(INK).border_2().border_color("#000000")
      .font_family(FONT).text_size(11).whitespace_nowrap().child(word)) : el;

    const mood = this.mood ?? (this.loved ? "love" : null);
    if (!mood) return out;
    const badge = mood === "alert"
      ? div().relative().flex().items_center().justify_center().w(16).h(16).bg(C.red).border_2().border_color(INK)
        .font_family(FONT).text_size(11).text_color("#ffffff").child("!")
      : image(art("heart")).w(16).h(16).relative();
    // The badge bobs between 0 and 3 at the top of the block, over the pet's head, so the
    // block never clips it.
    return out.child(div().absolute().top(0).left((PET_W - 16) / 2).child(badge.loop("top", { from: 3, to: 0, period: 600 })));
  }
}

