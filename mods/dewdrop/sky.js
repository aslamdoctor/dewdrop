// Sky role: the 48px see-through strip above the panes. By day clouds drift and birds
// flap across; at night stars twinkle and fireflies wander. Every motion is a native loop
// (no script timer); the only repaint is the day/night flip, which swaps one set for the
// other. Positions come from logic.js and are the same on every render.
import { div, image } from "gpui-kit";
import { art, ART } from "./art.js";
import { lookOf, repaintOnLook, skyClouds, skyBirds, skyStars, skyFireflies } from "./logic.js";

const at = (left, top, w, h) => div().absolute().left(left).top(top).w(w).h(h);

function day(width) {
  const clouds = skyClouds(width).map((c) => at(c.from, c.top, c.w, c.h)
    .loop("left", { from: c.from, to: c.to, period: c.period, easing: "linear" })
    .child(image(art(c.name)).size_full()));
  // A bird bobs in a band of its own (outer, top loop) while it crosses (inner, left loop).
  const birds = skyBirds(width).map((b) => div().absolute().left(0).right(0).top(b.top).h(b.h + b.bob)
    .loop("top", { from: b.top, to: b.top + b.bob, period: b.bobPeriod })
    .child(at(b.from, 0, b.w, b.h)
      .loop("left", { from: b.from, to: b.to, period: b.period, easing: "linear" })
      .child(image(`${ART}/bird.webp`).size_full())));
  return [...clouds, ...birds];
}

function night(width) {
  const stars = skyStars(width).map((s) => at(s.left, s.top, s.w, s.h)
    .loop("opacity", { from: s.low, to: 1, period: s.period })
    .child(image(art(s.name)).size_full()));
  const flies = skyFireflies(width).map((f) => div().absolute().left(f.left).w(f.dx + f.w).top(f.top[0]).h(f.h)
    .loop("top", { from: f.top[0], to: f.top[1], period: f.topPeriod })
    .child(at(0, 0, f.w, f.h)
      .loop("left", { from: 0, to: f.dx, period: f.dxPeriod })
      .loop("opacity", { from: 0.2, to: 1, period: f.blinkPeriod })
      .child(image(art("firefly")).size_full())));
  return [...stars, ...flies];
}

export default class Sky {
  init(_p, cx) {
    repaintOnLook(cx);
  }

  render() {
    const width = window.bounds().width;
    const set = lookOf(new Date()) === "night" ? night(width) : day(width);
    return div().relative().size_full().overflow_hidden().children(set);
  }
}
