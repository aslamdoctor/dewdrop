// Swaps the valley scene and pane colors: the day or night look, at the scene height that
// fits the window. Reading the layout and setting it in the same tick narrows the race
// with a click made in between.
import { layout, run } from "herdr";
import { makeSyncer, sceneRows } from "./logic.js";

const syncWith = makeSyncer();
// The window's scene height, set from a render (the only place the window can be read).
// null until then, which keeps whatever the layout wears.
let rows = null;

// Records the valley height in points. True when that changes the scene height.
export function noteValley(height) {
  const r = sceneRows(height);
  if (r === rows) return false;
  rows = r;
  return true;
}

export function syncLook(now = new Date()) {
  syncWith(now, () => layout(), (next) => run("layout.set", { layout: next }), rows ?? undefined);
}
