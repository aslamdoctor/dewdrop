// Swaps the valley and pane colors between the day and night looks. Read the
// layout and set it in the same tick, so a click made in between isn't lost.
import { layout, run } from "herdr";
import { needsSwap, layoutFor, lookOfLayout } from "./logic.js";

// The look last written, until the layout reloads wearing it. Stops a second
// tick from writing again before the first write has shown up in layout().
let pending = null;

export function syncLook(now = new Date()) {
  const tree = layout();
  if (!tree) return;
  if (pending && (lookOfLayout(tree) === pending || lookOfLayout(tree) === null)) pending = null;
  const look = needsSwap(tree, now);
  if (!look || pending === look) return;
  const next = layoutFor(tree, look);
  if (!next) return;
  pending = look;
  run("layout.set", { layout: next });
}
