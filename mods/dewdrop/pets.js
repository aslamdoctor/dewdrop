// The pet cast: seven pets, their frames and the line shown in the picker.
// The saved choice lives in the shared key "dewdrop.pet": a pet key, or the word NO_PET for no pet (unset means chicken).

// Each pet's frames: a walk pair and one action (art/pets/<pet>-<frame>.png).
export const PET_FRAMES = {
  chicken: ["a", "b", "act"], duck: ["a", "b", "act"], cat: ["a", "b", "nap"], dog: ["a", "b", "wag"],
  rabbit: ["a", "hop", "act"], turtle: ["a", "b", "hide"], frog: ["a", "hop", "act"],
};

// How each pet walks the road: speed in px per second and ms per walk frame
// (art/pets/<pet>-walk-l.webp and -r.webp, made by scripts/draw-motion.js).
export const PET_WALK = {
  chicken: { speed: 50, ms: 260 }, duck: { speed: 36, ms: 300 }, cat: { speed: 44, ms: 280 }, dog: { speed: 90, ms: 250 },
  rabbit: { speed: 70, ms: 300 }, turtle: { speed: 14, ms: 300 }, frog: { speed: 60, ms: 300 },
};

// How each pet spends its time, after the preview: mix is the odds of each segment
// (logic.js nextSegment), and the action shows frames (a WebP when there are two, made by
// scripts/draw-motion.js at ms per frame), lasts dur ms and may say a word meanwhile.
export const PET_ACTS = {
  chicken: { mix: [["walk", 0.55], ["act", 0.3], ["idle", 0.15]], frames: ["a", "act"], ms: 280, dur: [900, 2500] },
  duck: { mix: [["walk", 0.6], ["act", 0.15], ["idle", 0.25]], frames: ["a", "act"], ms: 200, dur: [700, 1300], say: "quack" },
  cat: { mix: [["walk", 0.35], ["act", 0.4], ["idle", 0.15], ["dash", 0.1]], frames: ["nap"], dur: [5000, 9000], say: "z z" },
  dog: { mix: [["walk", 0.45], ["act", 0.25], ["idle", 0.1], ["dash", 0.2]], frames: ["a", "wag"], ms: 110, dur: [1200, 2500] },
  rabbit: { mix: [["walk", 0.5], ["act", 0.35], ["idle", 0.15]], frames: ["a", "act"], ms: 300, dur: [1000, 2400] },
  turtle: { mix: [["walk", 0.7], ["act", 0.1], ["idle", 0.2]], frames: ["hide"], dur: [2500, 4500] },
  frog: { mix: [["walk", 0.35], ["act", 0.3], ["idle", 0.35]], frames: ["a", "act"], ms: 380, dur: [1400, 2800], say: "ribbit" },
};

export const PET_KEYS = ["chicken", "duck", "cat", "dog", "rabbit", "turtle", "frog"];

const INFO = {
  chicken: ["Chicken", "Wanders about and pecks. Click for a heart."],
  duck: ["Duck", "Slow waddle. Quacks when you poke it."],
  cat: ["Cat", "Naps a lot, sudden dashes. Picky about pats."],
  dog: ["Dog", "Zooms around, wags. Jumps when patted."],
  rabbit: ["Rabbit", "Hops, stops to nibble. Flips when clicked."],
  turtle: ["Turtle", "Very slow. Hides in its shell when poked."],
  frog: ["Frog", "Sits still, then leaps. Croaks when poked."],
};

export const PETS = Object.fromEntries(PET_KEYS.map((k) => [k, { name: INFO[k][0], trait: INFO[k][1], frames: PET_FRAMES[k] }]));

// A known pet key, null for "no pet", and the default (chicken) for anything else.
export function petKey(v) {
  if (v === null) return null;
  return typeof v === "string" && Object.hasOwn(PETS, v) ? v : "chicken";
}

// shared() reports a key nobody has set as null, the same as a stored null, so "no pet"
// is saved as this word and an unset key keeps the default pet.
export const NO_PET = "none";

// The pet to show for a raw shared("dewdrop.pet") value: the default when unset, null for NO_PET.
export function savedPet(raw) {
  if (raw === undefined || raw === null) return "chicken";
  return raw === NO_PET ? null : petKey(raw);
}
