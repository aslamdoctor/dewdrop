// Hotbar role: one centered box along the bottom with the portrait, every space
// as a crop slot (nine fit, more scroll sideways) and four tool buttons.
// Colors come from lookOf(new Date()) at render time. The hotbar has no clock of
// its own; a timer armed to the next 6:00 or 18:00 repaints it when the look flips.
import { div, image } from "gpui-kit";
import { h_flex, v_flex, Scrollbar } from "gpui-base";
import { agents, spaces, layout, run, shared, setShared, openOverlay, pickFolder } from "herdr";
import { C, INK, GOLD_LINE, LOOK, dotColor } from "./palette.js";
import { art, pic, png, petFrame } from "./art.js";
import { CAST, pictureIndex } from "./cast.js";
import { hotbarSlots, slotTooltip, lookOf, msToNextLook } from "./logic.js";
import { FONT, stop } from "./tabs.js";

const SLOT = 46, GAP = 6, SHOWN = 9;
const SCROLL_ID = "dewdrop-slots";

// A hex color with an alpha, "#rrggbb" + 0..1.
const alpha = (hex, a) => hex + Math.round(a * 255).toString(16).padStart(2, "0");

function slot(s, space, all, look) {
  const L = LOOK[look];
  const on = s.active;
  const keyOn = look === "night" ? LOOK.night.ring : C.gold;
  const dot = div().absolute().top(3).right(3).w(7).h(7).rounded_full().border_1().border_color("#000000").bg(dotColor(s.status));
  return v_flex().id(`dewdrop-slot-${s.id}`).relative().flex_none().w(SLOT).h(SLOT).items_center().justify_center().gap(1).pt(6)
    .bg(on ? L.slotOn : alpha(L.slot, 0.72)).border_2().border_color(INK)
    .text_size(10).text_color(C.parchment).cursor_pointer().whitespace_nowrap()
    .tooltip(slotTooltip(space, all, s.key))
    .on_click(() => run("space.select", { id: s.id }))
    .when(on, (el) => el.child(div().absolute().top(0).left(0).right(0).bottom(0).border_2().border_color(GOLD_LINE)))
    .when(!on, (el) => el.child(div().absolute().top(0).left(0).right(0).h(3).bg("#f4e2bc38")))
    .when(Boolean(s.key), (el) => el.child(div().absolute().top(1).left(4).text_size(9).text_color(on ? keyOn : C.woodLight).child(s.key)))
    .child(s.status === "working" ? dot.loop("opacity", { from: 0.45, to: 1, period: 800 }) : dot)
    .child(image(art(`crop-${s.crop}`)).w(24).h(24).flex_none())
    .child(div().child(s.label));
}

function tool(id, tip, icon, look, onClick) {
  return div().id(id).flex_none().w(22).h(22).flex().items_center().justify_center()
    .bg(alpha(LOOK[look].bar, 0.85)).border_2().border_color(INK).cursor_pointer()
    .tooltip(tip).on_mouse_down("left", stop).on_click(onClick)
    .child(icon);
}

function findNode(n, id) {
  if (!n || typeof n !== "object") return null;
  if (n.id === id) return n;
  for (const c of n.children ?? []) {
    const f = findNode(c, id);
    if (f) return f;
  }
  return null;
}

// Peek state comes from the live layout, not from the saved flag (which outlives a restart).
const panesHiddenIn = (tree) => findNode(tree, "main")?.hidden === true;

const sep = () => div().flex_none().w(2).h(40).bg("#000000").opacity(0.35);

export default class Hotbar {
  init(_p, cx) {
    // Aim at the next look change. Arm the next timer before anything that can throw.
    const tick = (cx) => {
      cx.timer.after(msToNextLook(new Date()), tick);
      cx.notify();
    };
    cx.timer.after(msToNextLook(new Date()), tick);
  }

  render() {
    const look = lookOf(new Date());
    const L = LOOK[look];
    const night = look === "night";
    const list = spaces() ?? [];
    const all = agents() ?? [];
    const active = list.find((s) => s.active);
    const slots = hotbarSlots(list);
    const hidden = panesHiddenIn(layout());
    const petName = shared("dewdrop.pet");
    const petIcon = typeof petName === "string" && petName
      ? image(petFrame(petName, "a")).w(18).h(15).flex_none()
      : image(png("doghouse")).w(18).h(15).flex_none();
    const svg = (name) => image(art(name)).w(14).h(14).flex_none();

    const portrait = div().id("dewdrop-portrait").flex_none().w(46).h(46).mx(2)
      .border_2().border_color(night ? L.trim : INK).cursor_pointer().tooltip("Change picture")
      .on_click(() => openOverlay({ mod: "dewdrop", props: { role: "picker" }, kind: "dialog", frame: "none", width: 920, height: 396 }))
      .child(image(pic(CAST[pictureIndex(shared("dewdrop.picture"))].file)).w(42).h(42));

    const peek = () => {
      // Hiding main alone would pull the hotbar to the top, so the spacer fills in.
      // Never leave both hidden: bring the visible one first, undo the first step if the second fails.
      const now = panesHiddenIn(layout());
      const [first, second] = now
        ? [["layout.show", "main"], ["layout.hide", "peek-spacer"]]
        : [["layout.show", "peek-spacer"], ["layout.hide", "main"]];
      const undo = { "layout.show": "layout.hide", "layout.hide": "layout.show" };
      try {
        run(first[0], { id: first[1] });
      } catch (_e) {
        return;
      }
      try {
        run(second[0], { id: second[1] });
      } catch (_e) {
        try { run(undo[first[0]], { id: first[1] }); } catch (_e2) { /* nothing more to do */ }
        return;
      }
      setShared("dewdrop.panesHidden", !now);
    };
    const addSpace = () => {
      pickFolder({ prompt: "Pick a folder for the new space" })
        .then((folder) => { if (folder) run("space.new", { folder }); })
        .catch(() => {});
    };

    const row = h_flex().id(SCROLL_ID).gap(GAP).overflow_x_scroll().children(slots.map((s, i) => slot(s, list[i], all, look)));
    const strip = v_flex().flex_shrink(1).min_w(0).max_w(SLOT * SHOWN + GAP * (SHOWN - 1))
      .child(row)
      .when(slots.length > SHOWN, (el) => el.child(div().h(6).bg("#0000004d").child(Scrollbar.horizontal(SCROLL_ID).size_full().viewport_from_layout())));

    const tools = div().flex_none().w(46).h(46).flex().flex_wrap().gap(2)
      .child(tool("dewdrop-tool-tab", "New tab", svg("tool-plus"), look, () => active && run("tab.new", { space: active.id })))
      .child(tool("dewdrop-tool-space", "New space (pick a folder)", svg("tool-folder"), look, addSpace))
      .child(tool("dewdrop-tool-peek", hidden ? "Show panes" : "Hide panes", svg(hidden ? "tool-eye-off" : "tool-eye"), look, peek))
      .child(tool("dewdrop-tool-pet", "Choose a pet", petIcon, look,
        () => openOverlay({ mod: "dewdrop", props: { role: "petpick" }, kind: "dialog", frame: "none" })));

    const box = h_flex().relative().items_center().gap(GAP).px(8).py(2)
      .bg(alpha(L.bar, 0.55)).border(3).border_color("#000000")
      .child(div().absolute().top(0).left(0).right(0).bottom(0).border_2().border_color(L.trim))
      .child(portrait).child(sep()).child(strip).child(sep()).child(tools);

    return h_flex().size_full().font_family(FONT).items_end().justify_center().pb(1).child(box);
  }
}
