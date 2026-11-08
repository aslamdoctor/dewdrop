// Swaps the valley and pane colors between the day and night looks. Reading the
// layout and setting it in the same tick narrows the race with a click made in between.
import { layout, run } from "herdr";
import { makeSyncer } from "./logic.js";

const syncWith = makeSyncer();

export function syncLook(now = new Date()) {
  syncWith(now, () => layout(), (next) => run("layout.set", { layout: next }));
}
